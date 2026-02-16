import { randomUUID } from 'crypto';
import redisService from './redis.js';
import { getPrisma } from './db.js';

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
const memorySessions = new Map();

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

class SessionService {
  async create(userId, ttl = DEFAULT_TTL_SECONDS) {
    const sessionId = randomUUID();
    const payload = { userId, exp: nowSeconds() + ttl };

    if (redisService.enabled) {
      await redisService.set(`session:${sessionId}`, { userId }, ttl);
      return sessionId;
    }

    const prisma = await getPrisma();
    if (prisma) {
      await prisma.session.create({
        data: {
          id: sessionId,
          userId,
          expiresAt: new Date(payload.exp * 1000)
        }
      });
      return sessionId;
    }

    memorySessions.set(sessionId, {
      ...payload
    });
    return sessionId;
  }

  async get(sessionId) {
    if (!sessionId) return null;

    if (redisService.enabled) {
      return redisService.get(`session:${sessionId}`);
    }

    const prisma = await getPrisma();
    if (prisma) {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) return null;
      if (session.expiresAt.getTime() <= Date.now()) {
        await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
        return null;
      }
      return { userId: session.userId };
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

    const prisma = await getPrisma();
    if (prisma) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
      return;
    }

    memorySessions.delete(sessionId);
  }

  async destroyByUserId(userId) {
    if (!userId) return;

    if (redisService.enabled) {
      const keys = await redisService.keys('session:*');
      if (keys.length === 0) return;
      const matches = [];
      await Promise.all(
        keys.map(async (key) => {
          const session = await redisService.get(key);
          if (session?.userId === userId) matches.push(key);
        })
      );
      if (matches.length > 0) {
        await redisService.deleteMany(matches);
      }
      return;
    }

    const prisma = await getPrisma();
    if (prisma) {
      await prisma.session.deleteMany({ where: { userId } });
      return;
    }

    for (const [id, session] of memorySessions.entries()) {
      if (session.userId === userId) {
        memorySessions.delete(id);
      }
    }
  }
}

const sessionService = new SessionService();
export default sessionService;
