import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { getPrisma } from './db.js';
import accountSettingsService from './accountSettingsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_TRENDINGS_PATH = path.join(__dirname, '..', 'data', 'trendings-playback.json');
const MAX_LOCAL_EVENTS = 5000;
const DEDUPE_WINDOW_MS = 45_000;
const DEFAULT_FLUSH_INTERVAL_MS = 8000;
const DEFAULT_MAX_BATCH_SIZE = 200;

function toSafeText(value, fallback = '') {
  const safe = String(value || '').trim();
  return safe || fallback;
}

function makeArtistKey(artistId, artistName) {
  const id = toSafeText(artistId);
  if (id) return `artist:${id}`;
  return `artist:${toSafeText(artistName, 'desconhecido').toLowerCase()}`;
}

function makeTrackKey(trackId, trackName, artistKey) {
  const id = toSafeText(trackId);
  if (id) return `track:${id}`;
  return `track:${toSafeText(trackName, 'desconhecida').toLowerCase()}:${artistKey}`;
}

function normalizeEvent(event = {}) {
  const artistName = toSafeText(event.artistName, 'Artista desconhecido');
  const trackName = toSafeText(event.trackName, 'Musica desconhecida');
  const artistId = toSafeText(event.artistId) || null;
  const trackId = toSafeText(event.trackId) || null;
  const userId = toSafeText(event.userId) || null;
  const playedAtDate = new Date(event.timestamp || Date.now());
  const playedAt = Number.isNaN(playedAtDate.getTime()) ? new Date().toISOString() : playedAtDate.toISOString();
  const artistKey = makeArtistKey(artistId, artistName);
  const trackKey = makeTrackKey(trackId, trackName, artistKey);
  const trackFingerprint = trackId || `${artistName.toLowerCase()}::${trackName.toLowerCase()}`;

  return {
    userId,
    artistId,
    artistName,
    artistKey,
    trackId,
    trackName,
    trackKey,
    trackFingerprint,
    playedAt,
    isPlaying: event.isPlaying !== false
  };
}

function percent(total, count) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(2));
}

function labelFromUserId(userId) {
  if (!userId) return 'Usuario desconhecido';
  const clean = String(userId);
  if (clean.length <= 14) return clean;
  return `${clean.slice(0, 8)}...${clean.slice(-4)}`;
}

function cityIdFromName(name) {
  return `city:${String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function buildSnapshotFromEvents(events = [], limit = 20, userNames = new Map(), userCities = new Map()) {
  const safeEvents = Array.isArray(events) ? events : [];
  const totalPlays = safeEvents.length;
  const artistMap = new Map();
  const trackMap = new Map();
  const fanMap = new Map();
  const regionMap = new Map();

  safeEvents.forEach((event) => {
    const artistKey = event.artistKey || makeArtistKey(event.artistId, event.artistName);
    const currentArtist = artistMap.get(artistKey) || {
      id: event.artistId || null,
      name: event.artistName || 'Artista desconhecido',
      count: 0
    };
    currentArtist.count += 1;
    artistMap.set(artistKey, currentArtist);

    const trackKey = event.trackKey || makeTrackKey(event.trackId, event.trackName, artistKey);
    const currentTrack = trackMap.get(trackKey) || {
      id: event.trackId || null,
      name: event.trackName || 'Musica desconhecida',
      artistId: event.artistId || null,
      artistName: event.artistName || 'Artista desconhecido',
      count: 0
    };
    currentTrack.count += 1;
    trackMap.set(trackKey, currentTrack);

    const fanKey = event.userId || 'anonymous';
    const currentFan = fanMap.get(fanKey) || {
      id: event.userId || null,
      name: userNames.get(event.userId) || labelFromUserId(event.userId),
      count: 0
    };
    currentFan.count += 1;
    fanMap.set(fanKey, currentFan);

    const city = toSafeText(userCities.get(event.userId), '');
    if (city) {
      const regionKey = city.toLowerCase();
      const currentRegion = regionMap.get(regionKey) || {
        id: cityIdFromName(city),
        name: city,
        count: 0
      };
      currentRegion.count += 1;
      regionMap.set(regionKey, currentRegion);
    }
  });

  const artists = Array.from(artistMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({ ...item, percent: percent(totalPlays, item.count) }));

  const tracks = Array.from(trackMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({ ...item, percent: percent(totalPlays, item.count) }));

  const topFans = Array.from(fanMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({ ...item, percent: percent(totalPlays, item.count) }));

  const regions = Array.from(regionMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({ ...item, percent: percent(totalPlays, item.count) }));

  const updatedAt = safeEvents.length ? safeEvents[safeEvents.length - 1]?.playedAt || null : null;

  return {
    totalPlays,
    artists,
    tracks,
    topFans,
    regions,
    updatedAt
  };
}

class TrendingPlaybackService {
  constructor() {
    this.pendingQueue = [];
    this.recentByFingerprint = new Map();
    this.flushTimer = null;
    this.flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS;
    this.maxBatchSize = DEFAULT_MAX_BATCH_SIZE;
    this.flushing = false;
    this.lastFlushAt = null;
  }

  startBackgroundWorker({ flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS, maxBatchSize = DEFAULT_MAX_BATCH_SIZE } = {}) {
    this.flushIntervalMs = Number.isFinite(Number(flushIntervalMs))
      ? Math.max(1000, Number(flushIntervalMs))
      : DEFAULT_FLUSH_INTERVAL_MS;
    this.maxBatchSize = Number.isFinite(Number(maxBatchSize))
      ? Math.max(50, Number(maxBatchSize))
      : DEFAULT_MAX_BATCH_SIZE;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flushPending().catch(() => {});
    }, this.flushIntervalMs);
  }

  async stopBackgroundWorker() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushPending({ force: true });
  }

  makeDedupeKey(event) {
    return `${toSafeText(event.userId, 'anonymous')}::${toSafeText(event.trackFingerprint, 'unknown')}`;
  }

  pruneRecentMap(nowMs = Date.now()) {
    const cutoff = nowMs - DEDUPE_WINDOW_MS * 4;
    for (const [key, ts] of this.recentByFingerprint.entries()) {
      if (!Number.isFinite(ts) || ts < cutoff) {
        this.recentByFingerprint.delete(key);
      }
    }
  }

  dedupeInBatch(events = []) {
    const accepted = [];
    const seenAt = new Map();
    events
      .slice()
      .sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())
      .forEach((event) => {
        const key = this.makeDedupeKey(event);
        const eventMs = new Date(event.playedAt).getTime();
        const prevMs = seenAt.get(key);
        if (Number.isFinite(prevMs) && eventMs - prevMs < DEDUPE_WINDOW_MS) {
          return;
        }
        seenAt.set(key, eventMs);
        accepted.push(event);
      });
    return accepted;
  }

  async dedupeAgainstDatabase(prismaClient, events = []) {
    if (!events.length) return [];
    const userIds = Array.from(new Set(events.map((event) => event.userId).filter(Boolean)));
    const trackFingerprints = Array.from(new Set(events.map((event) => event.trackFingerprint).filter(Boolean)));
    const oldestMs = Math.min(...events.map((event) => new Date(event.playedAt).getTime()));
    const since = new Date(oldestMs - DEDUPE_WINDOW_MS);

    const existing = await prismaClient.trendingPlayback.findMany({
      where: {
        playedAt: { gte: since },
        userId: userIds.length ? { in: userIds } : undefined,
        trackFingerprint: trackFingerprints.length ? { in: trackFingerprints } : undefined
      },
      select: {
        userId: true,
        trackFingerprint: true,
        playedAt: true
      }
    });

    const latestByKey = new Map();
    existing.forEach((item) => {
      const key = `${toSafeText(item.userId, 'anonymous')}::${toSafeText(item.trackFingerprint, 'unknown')}`;
      const ts = new Date(item.playedAt).getTime();
      const prev = latestByKey.get(key);
      if (!Number.isFinite(prev) || ts > prev) {
        latestByKey.set(key, ts);
      }
    });

    const accepted = [];
    events
      .slice()
      .sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())
      .forEach((event) => {
        const key = this.makeDedupeKey(event);
        const ts = new Date(event.playedAt).getTime();
        const last = latestByKey.get(key);
        if (Number.isFinite(last) && ts - last < DEDUPE_WINDOW_MS) {
          return;
        }
        latestByKey.set(key, ts);
        accepted.push(event);
      });

    return accepted;
  }

  async flushToDatabase(prismaClient, events = []) {
    const deduped = this.dedupeInBatch(events);
    const accepted = await this.dedupeAgainstDatabase(prismaClient, deduped);
    if (!accepted.length) return 0;

    await prismaClient.trendingPlayback.createMany({
      data: accepted.map((event) => ({
        userId: event.userId,
        artistId: event.artistId,
        artistName: event.artistName,
        artistKey: event.artistKey,
        trackId: event.trackId,
        trackName: event.trackName,
        trackKey: event.trackKey,
        trackFingerprint: event.trackFingerprint,
        playedAt: new Date(event.playedAt)
      }))
    });

    return accepted.length;
  }

  async flushToLocalStore(events = []) {
    if (!events.length) return 0;
    const current = await this.readLocalStore();
    const merged = [...current, ...events];
    merged.sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime());
    const deduped = this.dedupeInBatch(merged);
    const trimmed = deduped.slice(-MAX_LOCAL_EVENTS);
    await this.writeLocalStore(trimmed);
    return Math.max(0, trimmed.length - current.length);
  }

  async flushPending({ force = false } = {}) {
    if (this.flushing) return { flushed: 0, pending: this.pendingQueue.length };
    if (!force && this.pendingQueue.length === 0) return { flushed: 0, pending: 0 };

    this.flushing = true;
    let flushed = 0;
    try {
      while (this.pendingQueue.length > 0) {
        const chunk = this.pendingQueue.splice(0, this.maxBatchSize);
        const prismaClient = await getPrisma();
        if (prismaClient?.trendingPlayback) {
          flushed += await this.flushToDatabase(prismaClient, chunk);
        } else {
          flushed += await this.flushToLocalStore(chunk);
        }
      }
      this.lastFlushAt = new Date().toISOString();
      return { flushed, pending: this.pendingQueue.length };
    } finally {
      this.flushing = false;
    }
  }

  getQueueStats() {
    return {
      pending: this.pendingQueue.length,
      flushing: this.flushing,
      lastFlushAt: this.lastFlushAt
    };
  }

  async enqueuePlayback(event = {}) {
    const normalized = normalizeEvent(event);
    if (!normalized.isPlaying) {
      return { recorded: false, reason: 'not-playing', queued: false };
    }

    const playedAtMs = new Date(normalized.playedAt).getTime();
    const dedupeKey = this.makeDedupeKey(normalized);
    const lastSeen = this.recentByFingerprint.get(dedupeKey);
    if (Number.isFinite(lastSeen) && playedAtMs - lastSeen < DEDUPE_WINDOW_MS) {
      return { recorded: false, reason: 'duplicate', queued: false };
    }

    this.recentByFingerprint.set(dedupeKey, playedAtMs);
    this.pruneRecentMap(playedAtMs);
    this.pendingQueue.push(normalized);

    if (this.pendingQueue.length >= this.maxBatchSize) {
      this.flushPending().catch(() => {});
    }

    return { recorded: true, reason: null, queued: true };
  }

  async readLocalStore() {
    try {
      const raw = await fs.readFile(LOCAL_TRENDINGS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.events) ? parsed.events : [];
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async writeLocalStore(events = []) {
    await fs.mkdir(path.dirname(LOCAL_TRENDINGS_PATH), { recursive: true });
    await fs.writeFile(LOCAL_TRENDINGS_PATH, JSON.stringify({ events }, null, 2), 'utf8');
  }

  async recordPlayback(event = {}) {
    return this.enqueuePlayback(event);
  }

  async getSnapshot({ days = 7, limit = 20 } = {}) {
    await this.flushPending({ force: true });
    const safeDays = Number.isFinite(Number(days)) ? Math.min(90, Math.max(1, Number(days))) : 7;
    const safeLimit = Number.isFinite(Number(limit)) ? Math.min(100, Math.max(1, Number(limit))) : 20;
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const prismaClient = await getPrisma();
    if (prismaClient?.trendingPlayback) {
      const where = { playedAt: { gte: since } };
      const [totalPlays, latestEvent, artistGroups, trackGroups, fanGroups] = await Promise.all([
        prismaClient.trendingPlayback.count({ where }),
        prismaClient.trendingPlayback.findFirst({
          where,
          orderBy: { playedAt: 'desc' },
          select: { playedAt: true }
        }),
        prismaClient.trendingPlayback.groupBy({
          by: ['artistKey', 'artistId', 'artistName'],
          where,
          _count: { _all: true },
          orderBy: { _count: { _all: 'desc' } },
          take: safeLimit
        }),
        prismaClient.trendingPlayback.groupBy({
          by: ['trackKey', 'trackId', 'trackName', 'artistId', 'artistName'],
          where,
          _count: { _all: true },
          orderBy: { _count: { _all: 'desc' } },
          take: safeLimit
        }),
        prismaClient.trendingPlayback.groupBy({
          by: ['userId'],
          where,
          _count: { _all: true },
          orderBy: { _count: { _all: 'desc' } },
          take: Math.max(safeLimit * 4, 200)
        })
      ]);

      const fanUserIds = fanGroups.map((item) => item.userId).filter(Boolean);
      const users = fanUserIds.length
        ? await prismaClient.user.findMany({
            where: { id: { in: fanUserIds } },
            select: { id: true, displayName: true, username: true }
          })
        : [];
      const userNames = new Map(users.map((user) => [user.id, toSafeText(user.displayName || user.username || user.id, 'Usuario')]));
      const rawSettings = await accountSettingsService.readAll();
      const userCities = new Map(fanUserIds.map((userId) => [userId, toSafeText(rawSettings?.[userId]?.city || '', '')]));

      const artists = artistGroups.map((item) => ({
        id: item.artistId || null,
        name: item.artistName || 'Artista desconhecido',
        count: item._count._all,
        percent: percent(totalPlays, item._count._all)
      }));

      const tracks = trackGroups.map((item) => ({
        id: item.trackId || null,
        name: item.trackName || 'Musica desconhecida',
        artistId: item.artistId || null,
        artistName: item.artistName || 'Artista desconhecido',
        count: item._count._all,
        percent: percent(totalPlays, item._count._all)
      }));

      const topFans = fanGroups
        .map((item) => ({
          id: item.userId || null,
          name: userNames.get(item.userId) || labelFromUserId(item.userId),
          count: item._count._all,
          percent: percent(totalPlays, item._count._all)
        }))
        .slice(0, safeLimit);

      const regionsMap = new Map();
      fanGroups.forEach((item) => {
        const city = toSafeText(userCities.get(item.userId), '');
        if (!city) return;
        const regionKey = city.toLowerCase();
        const current = regionsMap.get(regionKey) || {
          id: cityIdFromName(city),
          name: city,
          count: 0
        };
        current.count += item._count._all;
        regionsMap.set(regionKey, current);
      });
      const regions = Array.from(regionsMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, safeLimit)
        .map((item) => ({ ...item, percent: percent(totalPlays, item.count) }));

      const snapshot = {
        totalPlays,
        artists,
        tracks,
        topFans,
        regions,
        updatedAt: latestEvent?.playedAt ? new Date(latestEvent.playedAt).toISOString() : null
      };
      return {
        ...snapshot,
        queue: this.getQueueStats()
      };
    }

    const events = await this.readLocalStore();
    const filtered = events.filter((event) => {
      const ts = new Date(event.playedAt).getTime();
      return !Number.isNaN(ts) && ts >= since.getTime();
    });
    const userIds = Array.from(new Set(filtered.map((event) => event.userId).filter(Boolean)));
    const rawSettings = await accountSettingsService.readAll();
    const userCities = new Map(
      userIds.map((userId) => [userId, toSafeText(rawSettings?.[userId]?.city || '', '')])
    );
    const snapshot = buildSnapshotFromEvents(filtered, safeLimit, new Map(), userCities);
    return {
      ...snapshot,
      queue: this.getQueueStats()
    };
  }
}

const trendingPlaybackService = new TrendingPlaybackService();
export default trendingPlaybackService;
