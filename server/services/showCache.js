const SHOW_CACHE_TTL_MS = Number(process.env.SHOW_CACHE_TTL_MS || 60000);
const CACHE_ENABLED = process.env.NODE_ENV === 'production';
const SHOW_CACHE_MAX_KEYS = Number(process.env.SHOW_CACHE_MAX_KEYS || 128);

const cacheStore = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (!entry || entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
}

function ensureCapacity() {
  if (cacheStore.size <= SHOW_CACHE_MAX_KEYS) return;
  const firstKey = cacheStore.keys().next().value;
  if (firstKey) cacheStore.delete(firstKey);
}

function getCachedShows(key) {
  if (!CACHE_ENABLED) return null;
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }
  cacheStore.delete(key);
  cacheStore.set(key, entry);
  return entry.payload;
}

function setCachedShows(key, payload) {
  if (!CACHE_ENABLED) return;
  pruneExpired();
  cacheStore.delete(key);
  cacheStore.set(key, {
    payload,
    expiresAt: Date.now() + SHOW_CACHE_TTL_MS
  });
  ensureCapacity();
}

function invalidateShowsCache() {
  cacheStore.clear();
}

const showCacheService = {
  getCachedShows,
  setCachedShows,
  invalidateShowsCache
};

export default showCacheService;
