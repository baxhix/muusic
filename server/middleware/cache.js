import redisService from '../services/redis.js';

export default function cacheMiddleware(duration = 60) {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redisService.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.json(cached);
        return;
      }
    } catch {
      // Ignore cache read failures.
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      Promise.resolve(redisService.set(key, body, duration)).catch(() => {});
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}
