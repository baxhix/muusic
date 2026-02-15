import { randomUUID } from 'crypto';
import redisService from './redis.js';

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
const memorySessions = new Map();

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

class SessionService {
  async create(userId, ttl = DEFAULT_TTL_SECONDS) {
    const sessionId = randomUUID();
    const payload = { userId };

    if (redisService.enabled) {
      await redisService.set(`session:${sessionId}`, payload, ttl);
      return sessionId;
    }

    memorySessions.set(sessionId, {
      ...payload,
      exp: nowSeconds() + ttl
    });
    return sessionId;
  }

  async get(sessionId) {
    if (!sessionId) return null;

    if (redisService.enabled) {
      return redisService.get(`session:${sessionId}`);
    }

    const session = memorySessions.get(sessionId);
    if (!session) return null;
    if (session.exp <= nowSeconds()) {
      memorySessions.delete(sessionId);
      return null;
    }
    return { userId: session.userId };
  }

  async destroy(sessionId) {
    if (!sessionId) return;

    if (redisService.enabled) {
      await redisService.delete(`session:${sessionId}`);
      return;
    }

    memorySessions.delete(sessionId);
  }
}

const sessionService = new SessionService();
export default sessionService;
