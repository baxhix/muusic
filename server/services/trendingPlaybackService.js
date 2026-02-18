import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { getPrisma } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_TRENDINGS_PATH = path.join(__dirname, '..', 'data', 'trendings-playback.json');
const MAX_LOCAL_EVENTS = 5000;
const DEDUPE_WINDOW_MS = 45_000;

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

function buildSnapshotFromEvents(events = [], limit = 20) {
  const safeEvents = Array.isArray(events) ? events : [];
  const totalPlays = safeEvents.length;
  const artistMap = new Map();
  const trackMap = new Map();

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
  });

  const artists = Array.from(artistMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({ ...item, percent: percent(totalPlays, item.count) }));

  const tracks = Array.from(trackMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({ ...item, percent: percent(totalPlays, item.count) }));

  const updatedAt = safeEvents.length ? safeEvents[safeEvents.length - 1]?.playedAt || null : null;

  return {
    totalPlays,
    artists,
    tracks,
    updatedAt
  };
}

class TrendingPlaybackService {
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
    const normalized = normalizeEvent(event);
    if (!normalized.isPlaying) {
      return { recorded: false, reason: 'not-playing' };
    }

    const nowMs = new Date(normalized.playedAt).getTime();
    const cutoffDate = new Date(nowMs - DEDUPE_WINDOW_MS);
    const prismaClient = await getPrisma();

    if (prismaClient?.trendingPlayback) {
      const last = await prismaClient.trendingPlayback.findFirst({
        where: {
          userId: normalized.userId,
          trackFingerprint: normalized.trackFingerprint,
          playedAt: { gte: cutoffDate }
        },
        orderBy: { playedAt: 'desc' }
      });

      if (last) {
        return { recorded: false, reason: 'duplicate' };
      }

      await prismaClient.trendingPlayback.create({
        data: {
          userId: normalized.userId,
          artistId: normalized.artistId,
          artistName: normalized.artistName,
          artistKey: normalized.artistKey,
          trackId: normalized.trackId,
          trackName: normalized.trackName,
          trackKey: normalized.trackKey,
          trackFingerprint: normalized.trackFingerprint,
          playedAt: new Date(normalized.playedAt)
        }
      });

      return { recorded: true };
    }

    const events = await this.readLocalStore();
    const lastDuplicate = [...events]
      .reverse()
      .find((item) => item.userId === normalized.userId && item.trackFingerprint === normalized.trackFingerprint);

    if (lastDuplicate) {
      const lastMs = new Date(lastDuplicate.playedAt).getTime();
      if (!Number.isNaN(lastMs) && nowMs - lastMs < DEDUPE_WINDOW_MS) {
        return { recorded: false, reason: 'duplicate' };
      }
    }

    events.push(normalized);
    if (events.length > MAX_LOCAL_EVENTS) {
      events.splice(0, events.length - MAX_LOCAL_EVENTS);
    }
    await this.writeLocalStore(events);
    return { recorded: true };
  }

  async getSnapshot({ days = 7, limit = 20 } = {}) {
    const safeDays = Number.isFinite(Number(days)) ? Math.min(90, Math.max(1, Number(days))) : 7;
    const safeLimit = Number.isFinite(Number(limit)) ? Math.min(100, Math.max(1, Number(limit))) : 20;
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const prismaClient = await getPrisma();
    if (prismaClient?.trendingPlayback) {
      const events = await prismaClient.trendingPlayback.findMany({
        where: { playedAt: { gte: since } },
        orderBy: { playedAt: 'asc' },
        select: {
          userId: true,
          artistId: true,
          artistName: true,
          artistKey: true,
          trackId: true,
          trackName: true,
          trackKey: true,
          trackFingerprint: true,
          playedAt: true
        }
      });

      const normalized = events.map((event) => ({
        ...event,
        playedAt: new Date(event.playedAt).toISOString()
      }));

      return buildSnapshotFromEvents(normalized, safeLimit);
    }

    const events = await this.readLocalStore();
    const filtered = events.filter((event) => {
      const ts = new Date(event.playedAt).getTime();
      return !Number.isNaN(ts) && ts >= since.getTime();
    });

    return buildSnapshotFromEvents(filtered, safeLimit);
  }
}

const trendingPlaybackService = new TrendingPlaybackService();
export default trendingPlaybackService;
