import redisService from './redis.js';

const SHOW_CACHE_TTL_MS = Number(process.env.SHOW_CACHE_TTL_MS || 60000);
const CACHE_ENABLED = process.env.NODE_ENV === 'production';
const SHOW_CACHE_MAX_KEYS = Number(process.env.SHOW_CACHE_MAX_KEYS || 128);
const SHOW_CACHE_REDIS_PREFIX = 'muusic:cache:shows:';

const cacheStore = new Map();

function redisKeyFor(key) {
  return `${SHOW_CACHE_REDIS_PREFIX}${Buffer.from(String(key)).toString('base64url')}`;
}

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

async function getCachedShows(key) {
  if (!CACHE_ENABLED) return null;
  if (redisService.enabled) {
    try {
      const cached = await redisService.get(redisKeyFor(key));
      if (cached) return cached;
    } catch {
      // noop
    }
  }
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

function setLocalCachedShows(key, payload) {
  if (!CACHE_ENABLED) return;
  pruneExpired();
  cacheStore.delete(key);
  cacheStore.set(key, {
    payload,
    expiresAt: Date.now() + SHOW_CACHE_TTL_MS
  });
  ensureCapacity();
}

async function setCachedShows(key, payload) {
  setLocalCachedShows(key, payload);
  if (!CACHE_ENABLED || !redisService.enabled) return;
  try {
    await redisService.set(redisKeyFor(key), payload, Math.max(1, Math.ceil(SHOW_CACHE_TTL_MS / 1000)));
  } catch {
    // noop
  }
}

async function invalidateShowsCache() {
  cacheStore.clear();
  if (!redisService.enabled) return;
  try {
    const keys = await redisService.keys(`${SHOW_CACHE_REDIS_PREFIX}*`);
    await redisService.deleteMany(keys);
  } catch {
    // noop
  }
}

const showCacheService = {
  getCachedShows,
  setCachedShows,
  invalidateShowsCache
};

export default showCacheService;
