import Redis from 'ioredis';

export function createSocketRateLimiter({ redisUrl = process.env.REDIS_URL || '', keyPrefix = 'muusic:rl' } = {}) {
  const localCounters = new Map();
  let redis = null;
  let redisEnabled = false;

  function getLocalCounter(key, windowSec) {
    const now = Date.now();
    const current = localCounters.get(key);
    if (!current || current.resetAt <= now) {
      const fresh = {
        count: 0,
        resetAt: now + windowSec * 1000
      };
      localCounters.set(key, fresh);
      return fresh;
    }
    return current;
  }

  async function start() {
    if (!redisUrl) return;
    try {
      redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 2
      });
      await redis.connect();
      redisEnabled = true;
      console.log('Socket rate limiter using Redis');
    } catch (error) {
      redisEnabled = false;
      redis = null;
      console.error('Socket rate limiter fallback to in-memory:', error.message);
    }
  }

  async function consume({ key, limit, windowSec }) {
    const safeKey = `${keyPrefix}:${String(key)}`;
    if (!Number.isFinite(limit) || limit < 1) return { allowed: true, remaining: 0, retryAfterSec: 0 };
    if (!Number.isFinite(windowSec) || windowSec < 1) return { allowed: true, remaining: 0, retryAfterSec: 0 };

    if (redisEnabled && redis) {
      const count = await redis.incr(safeKey);
      if (count === 1) {
        await redis.expire(safeKey, windowSec);
      }
      const ttl = Math.max(0, Number(await redis.ttl(safeKey)));
      const allowed = count <= limit;
      return {
        allowed,
        remaining: Math.max(0, limit - count),
        retryAfterSec: allowed ? 0 : ttl
      };
    }

    const counter = getLocalCounter(safeKey, windowSec);
    counter.count += 1;
    const allowed = counter.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - counter.count),
      retryAfterSec: allowed ? 0 : Math.ceil((counter.resetAt - Date.now()) / 1000)
    };
  }

  async function stop() {
    localCounters.clear();
    if (!redis) return;
    try {
      await redis.quit();
    } catch {
      // noop
    }
    redis = null;
    redisEnabled = false;
  }

  return {
    start,
    stop,
    consume
  };
}
