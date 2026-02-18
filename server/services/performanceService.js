import os from 'os';
import { monitorEventLoopDelay } from 'perf_hooks';

const REQUEST_WINDOW_SIZE = 2000;
const ROUTE_WINDOW_SIZE = 120;

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

  getSnapshot() {
    const mem = process.memoryUsage();
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const lastMinuteEvents = this.requestEvents.filter((event) => event.at >= oneMinuteAgo);
    const durations = this.requestEvents.map((event) => event.durationMs);

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
      }
    };
  }
}

const performanceService = new PerformanceService();
export default performanceService;
