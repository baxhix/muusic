import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import redisService from './redis.js';
import { getPrisma } from './db.js';

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_SESSIONS_PATH = path.join(__dirname, '..', 'data', 'local-sessions.json');
const memorySessions = new Map();
let loadedFromDisk = false;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function parseSessionsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.sessions)) return payload.sessions;
  return [];
}

class SessionService {
  async ensureLoaded() {
    if (loadedFromDisk) return;
    loadedFromDisk = true;

    try {
      const raw = await fs.readFile(LOCAL_SESSIONS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      const sessions = parseSessionsPayload(parsed);
      const now = nowSeconds();

      sessions.forEach((session) => {
        if (!session?.id || !session?.userId || !Number.isFinite(Number(session.exp))) return;
        const exp = Number(session.exp);
        if (exp <= now) return;
        memorySessions.set(session.id, {
          userId: session.userId,
          exp
        });
      });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // ignore read failures and keep in-memory flow
      }
    }
  }

  async persistMemorySessions() {
    const sessions = Array.from(memorySessions.entries()).map(([id, value]) => ({
      id,
      userId: value.userId,
      exp: value.exp
    }));

    await fs.mkdir(path.dirname(LOCAL_SESSIONS_PATH), { recursive: true });
    await fs.writeFile(LOCAL_SESSIONS_PATH, JSON.stringify({ sessions }, null, 2), 'utf8');
  }

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

    await this.ensureLoaded();
    memorySessions.set(sessionId, {
      ...payload
    });
    await this.persistMemorySessions().catch(() => {});
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

    await this.ensureLoaded();

    const session = memorySessions.get(sessionId);
    if (!session) return null;
    if (session.exp <= nowSeconds()) {
      memorySessions.delete(sessionId);
      await this.persistMemorySessions().catch(() => {});
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

    await this.ensureLoaded();
    memorySessions.delete(sessionId);
    await this.persistMemorySessions().catch(() => {});
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

    await this.ensureLoaded();
    for (const [id, session] of memorySessions.entries()) {
      if (session.userId === userId) {
        memorySessions.delete(id);
      }
    }
    await this.persistMemorySessions().catch(() => {});
  }
}

const sessionService = new SessionService();
export default sessionService;
