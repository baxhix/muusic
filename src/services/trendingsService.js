const STORAGE_KEY = 'muusic_trendings_v1';
const MAX_EVENTS = 5000;

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStore(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function normalizeStore(payload) {
  const safe = payload && typeof payload === 'object' ? payload : {};
  return {
    events: Array.isArray(safe.events) ? safe.events.slice(-MAX_EVENTS) : [],
    artists: safe.artists && typeof safe.artists === 'object' ? safe.artists : {},
    tracks: safe.tracks && typeof safe.tracks === 'object' ? safe.tracks : {},
    plays: Number.isFinite(Number(safe.plays)) ? Number(safe.plays) : 0,
    updatedAt: safe.updatedAt || null
  };
}

function percent(total, count) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(2));
}

function sortByCount(items) {
  return [...items].sort((a, b) => b.count - a.count);
}

function safeKey(prefix, valueA, valueB = '') {
  const raw = `${prefix}:${String(valueA || '').trim()}:${String(valueB || '').trim()}`;
  return raw.length > 6 ? raw : `${prefix}:unknown`;
}

function getBaseStore() {
  return normalizeStore(readStore());
}

export const trendingsService = {
  recordPlayback(event) {
    const isPlaying = Boolean(event?.isPlaying);
    if (!isPlaying) return false;

    const artistId = String(event?.artistId || '').trim();
    const artistName = String(event?.artistName || '').trim() || 'Artista desconhecido';
    const trackId = String(event?.trackId || '').trim();
    const trackName = String(event?.trackName || '').trim() || 'Musica desconhecida';
    const userId = String(event?.userId || 'anonymous').trim();
    const timestamp = event?.timestamp || new Date().toISOString();

    const artistKey = safeKey('artist', artistId || artistName.toLowerCase(), artistName.toLowerCase());
    const trackKey = safeKey('track', trackId || trackName.toLowerCase(), artistKey);
    const dedupeKey = `${userId}:${trackKey}:${String(event?.sessionMarker || '')}`;

    const store = getBaseStore();
    const lastEvent = store.events[store.events.length - 1];
    if (lastEvent?.dedupeKey === dedupeKey) return false;

    store.events.push({
      dedupeKey,
      userId,
      artistId: artistId || null,
      artistName,
      trackId: trackId || null,
      trackName,
      timestamp
    });
    if (store.events.length > MAX_EVENTS) {
      store.events = store.events.slice(-MAX_EVENTS);
    }

    store.plays += 1;
    const prevArtist = store.artists[artistKey] || { id: artistId || null, name: artistName, count: 0 };
    store.artists[artistKey] = {
      ...prevArtist,
      id: artistId || prevArtist.id || null,
      name: artistName || prevArtist.name,
      count: prevArtist.count + 1
    };

    const prevTrack = store.tracks[trackKey] || {
      id: trackId || null,
      name: trackName,
      artistId: artistId || null,
      artistName,
      count: 0
    };
    store.tracks[trackKey] = {
      ...prevTrack,
      id: trackId || prevTrack.id || null,
      name: trackName || prevTrack.name,
      artistId: artistId || prevTrack.artistId || null,
      artistName: artistName || prevTrack.artistName,
      count: prevTrack.count + 1
    };

    store.updatedAt = new Date().toISOString();
    writeStore(store);
    return true;
  },

  getSnapshot() {
    const store = getBaseStore();
    const total = store.plays;
    const artists = sortByCount(Object.values(store.artists)).map((item) => ({
      ...item,
      percent: percent(total, item.count)
    }));
    const tracks = sortByCount(Object.values(store.tracks)).map((item) => ({
      ...item,
      percent: percent(total, item.count)
    }));

    return {
      totalPlays: total,
      artists,
      tracks,
      updatedAt: store.updatedAt
    };
  }
};
