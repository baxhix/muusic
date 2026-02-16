const SHOW_CACHE_TTL_MS = Number(process.env.SHOW_CACHE_TTL_MS || 60000);
const CACHE_ENABLED = process.env.NODE_ENV === 'production';

let cached = null;

function getCachedShows(key) {
  if (!CACHE_ENABLED) return null;
  if (!cached) return null;
  if (cached.key !== key) return null;
  if (cached.expiresAt <= Date.now()) return null;
  return cached.payload;
}

function setCachedShows(key, payload) {
  if (!CACHE_ENABLED) return;
  cached = {
    key,
    payload,
    expiresAt: Date.now() + SHOW_CACHE_TTL_MS
  };
}

function invalidateShowsCache() {
  cached = null;
}

const showCacheService = {
  getCachedShows,
  setCachedShows,
  invalidateShowsCache
};

export default showCacheService;
