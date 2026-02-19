import os from 'os';
import { monitorEventLoopDelay } from 'perf_hooks';

const REQUEST_WINDOW_SIZE = 2000;
const ROUTE_WINDOW_SIZE = 120;
const SOCKET_WINDOW_SIZE = 3000;
const CLIENT_FPS_WINDOW_SIZE = 800;
const CACHE_WINDOW_SIZE = 2000;

function nowIso() {
  return new Date().toISOString();
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function percentile(values = [], p = 95) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

class PerformanceService {
  constructor() {
    this.requestEvents = [];
    this.routeStats = new Map();
    this.socketEvents = [];
    this.clientFpsEvents = [];
    this.cacheEvents = [];
    this.startedAt = Date.now();
    this.loopDelay = monitorEventLoopDelay({ resolution: 20 });
    this.loopDelay.enable();
  }

  recordRequest({ method = 'GET', path = '/', statusCode = 200, durationMs = 0, at = Date.now() } = {}) {
    const safeDuration = Math.max(0, Number(durationMs) || 0);
    const safeStatus = Number(statusCode) || 0;
    const routeKey = `${String(method).toUpperCase()} ${String(path)}`;

    this.requestEvents.push({ at, method: String(method).toUpperCase(), path: String(path), statusCode: safeStatus, durationMs: safeDuration });
    if (this.requestEvents.length > REQUEST_WINDOW_SIZE) {
      this.requestEvents.splice(0, this.requestEvents.length - REQUEST_WINDOW_SIZE);
    }

    const route = this.routeStats.get(routeKey) || { count: 0, durations: [] };
    route.count += 1;
    route.durations.push(safeDuration);
    if (route.durations.length > ROUTE_WINDOW_SIZE) {
      route.durations.splice(0, route.durations.length - ROUTE_WINDOW_SIZE);
    }
    this.routeStats.set(routeKey, route);
  }

  recordSocketEvent({ event = 'unknown', durationMs = 0, ok = true, at = Date.now() } = {}) {
    const safeDuration = Math.max(0, Number(durationMs) || 0);
    const safeEvent = String(event || 'unknown');
    this.socketEvents.push({
      at,
      event: safeEvent,
      durationMs: safeDuration,
      ok: Boolean(ok)
    });
    if (this.socketEvents.length > SOCKET_WINDOW_SIZE) {
      this.socketEvents.splice(0, this.socketEvents.length - SOCKET_WINDOW_SIZE);
    }
  }

  recordClientFps({ fps = 0, at = Date.now() } = {}) {
    const safeFps = Number(fps);
    if (!Number.isFinite(safeFps) || safeFps < 1 || safeFps > 240) return;
    this.clientFpsEvents.push({
      at,
      fps: Math.round(safeFps)
    });
    if (this.clientFpsEvents.length > CLIENT_FPS_WINDOW_SIZE) {
      this.clientFpsEvents.splice(0, this.clientFpsEvents.length - CLIENT_FPS_WINDOW_SIZE);
    }
  }

  recordCacheLookup({ scope = 'unknown', layer = 'local', hit = false, at = Date.now() } = {}) {
    this.cacheEvents.push({
      at,
      scope: String(scope || 'unknown'),
      layer: String(layer || 'local'),
      hit: Boolean(hit)
    });
    if (this.cacheEvents.length > CACHE_WINDOW_SIZE) {
      this.cacheEvents.splice(0, this.cacheEvents.length - CACHE_WINDOW_SIZE);
    }
  }

  getSnapshot() {
    const mem = process.memoryUsage();
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const lastMinuteEvents = this.requestEvents.filter((event) => event.at >= oneMinuteAgo);
    const durations = this.requestEvents.map((event) => event.durationMs);
    const socketLastMinuteEvents = this.socketEvents.filter((event) => event.at >= oneMinuteAgo);
    const socketDurations = this.socketEvents.map((event) => event.durationMs);
    const clientFpsLastMinute = this.clientFpsEvents.filter((event) => event.at >= oneMinuteAgo);
    const cacheLastMinuteEvents = this.cacheEvents.filter((event) => event.at >= oneMinuteAgo);

    const byStatus = this.requestEvents.reduce(
      (acc, event) => {
        const code = event.statusCode;
        if (code >= 500) acc.s5xx += 1;
        else if (code >= 400) acc.s4xx += 1;
        else if (code >= 300) acc.s3xx += 1;
        else if (code >= 200) acc.s2xx += 1;
        return acc;
      },
      { s2xx: 0, s3xx: 0, s4xx: 0, s5xx: 0 }
    );

    const topRoutes = Array.from(this.routeStats.entries())
      .map(([route, stats]) => ({
        route,
        count: stats.count,
        avgMs: round(stats.durations.reduce((sum, value) => sum + value, 0) / Math.max(1, stats.durations.length), 2),
        p95Ms: round(percentile(stats.durations, 95), 2)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const bySocketEvent = this.socketEvents.reduce((acc, event) => {
      const current = acc.get(event.event) || { count: 0, durations: [], errors: 0 };
      current.count += 1;
      current.durations.push(event.durationMs);
      if (!event.ok) current.errors += 1;
      if (current.durations.length > ROUTE_WINDOW_SIZE) {
        current.durations.splice(0, current.durations.length - ROUTE_WINDOW_SIZE);
      }
      acc.set(event.event, current);
      return acc;
    }, new Map());

    const socketEvents = Array.from(bySocketEvent.entries())
      .map(([eventName, stats]) => ({
        event: eventName,
        count: stats.count,
        avgMs: round(stats.durations.reduce((sum, value) => sum + value, 0) / Math.max(1, stats.durations.length), 2),
        p95Ms: round(percentile(stats.durations, 95), 2),
        errors: stats.errors
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const cacheByScope = this.cacheEvents.reduce((acc, event) => {
      const key = `${event.scope}:${event.layer}`;
      const current = acc.get(key) || { scope: event.scope, layer: event.layer, total: 0, hits: 0 };
      current.total += 1;
      if (event.hit) current.hits += 1;
      acc.set(key, current);
      return acc;
    }, new Map());

    const cacheStats = Array.from(cacheByScope.values())
      .map((item) => ({
        scope: item.scope,
        layer: item.layer,
        total: item.total,
        hits: item.hits,
        misses: Math.max(0, item.total - item.hits),
        hitRatePct: round((item.hits / Math.max(1, item.total)) * 100, 2)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const lagMeanMs = this.loopDelay.mean / 1e6;
    const lagP95Ms = this.loopDelay.percentile(95) / 1e6;
    const lagMaxMs = this.loopDelay.max / 1e6;

    return {
      collectedAt: nowIso(),
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        uptimeSec: Math.floor(process.uptime()),
        startedAt: new Date(this.startedAt).toISOString(),
        rssMb: round(mem.rss / (1024 * 1024), 2),
        heapUsedMb: round(mem.heapUsed / (1024 * 1024), 2),
        heapTotalMb: round(mem.heapTotal / (1024 * 1024), 2),
        externalMb: round(mem.external / (1024 * 1024), 2)
      },
      system: {
        platform: process.platform,
        cpuCount: os.cpus().length,
        loadAvg1m: round(os.loadavg()[0], 2),
        loadAvg5m: round(os.loadavg()[1], 2),
        loadAvg15m: round(os.loadavg()[2], 2),
        totalMemGb: round(os.totalmem() / (1024 ** 3), 2),
        freeMemGb: round(os.freemem() / (1024 ** 3), 2)
      },
      eventLoop: {
        meanMs: round(lagMeanMs, 2),
        p95Ms: round(lagP95Ms, 2),
        maxMs: round(lagMaxMs, 2)
      },
      http: {
        sampleSize: this.requestEvents.length,
        rpsLast1m: round(lastMinuteEvents.length / 60, 2),
        avgMs: round(durations.reduce((sum, value) => sum + value, 0) / Math.max(1, durations.length), 2),
        p95Ms: round(percentile(durations, 95), 2),
        byStatus,
        topRoutes
      },
      socket: {
        sampleSize: this.socketEvents.length,
        eventsPerSecLast1m: round(socketLastMinuteEvents.length / 60, 2),
        avgMs: round(socketDurations.reduce((sum, value) => sum + value, 0) / Math.max(1, socketDurations.length), 2),
        p95Ms: round(percentile(socketDurations, 95), 2),
        errorCount: this.socketEvents.filter((event) => !event.ok).length,
        events: socketEvents
      },
      clientFps: {
        sampleSize: this.clientFpsEvents.length,
        reportsPerSecLast1m: round(clientFpsLastMinute.length / 60, 2),
        avg: round(
          this.clientFpsEvents.reduce((sum, event) => sum + event.fps, 0) / Math.max(1, this.clientFpsEvents.length),
          2
        ),
        p95: round(percentile(this.clientFpsEvents.map((event) => event.fps), 95), 2),
        latest: this.clientFpsEvents.length ? this.clientFpsEvents[this.clientFpsEvents.length - 1].fps : 0
      },
      cache: {
        sampleSize: this.cacheEvents.length,
        lookupsPerSecLast1m: round(cacheLastMinuteEvents.length / 60, 2),
        hitRatePct: round(
          (this.cacheEvents.filter((event) => event.hit).length / Math.max(1, this.cacheEvents.length)) * 100,
          2
        ),
        stats: cacheStats
      }
    };
  }
}

const performanceService = new PerformanceService();
export default performanceService;
