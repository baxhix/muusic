import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { createHash, randomBytes } from 'crypto';
import { getPrisma } from './db.js';

const DEFAULT_TTL_SECONDS = 60 * 60;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_RESET_PATH = path.join(__dirname, '..', 'data', 'password-reset-tokens.json');

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

class PasswordResetService {
  async readJSON() {
    try {
      const raw = await fs.readFile(LOCAL_RESET_PATH, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async writeJSON(tokens) {
    await fs.mkdir(path.dirname(LOCAL_RESET_PATH), { recursive: true });
    await fs.writeFile(LOCAL_RESET_PATH, JSON.stringify(tokens, null, 2), 'utf8');
  }

  async issue(userId, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const prisma = await getPrisma();
    if (prisma) {
      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt
        }
      });
      return { token, expiresAt };
    }

    const rows = await this.readJSON();
    rows.push({
      id: randomBytes(16).toString('hex'),
      userId,
      tokenHash,
      expiresAt: expiresAt.toISOString()
    });
    await this.writeJSON(rows);
    return { token, expiresAt };
  }

  async consume(rawToken) {
    const tokenHash = hashToken(rawToken);
    const now = Date.now();

    const prisma = await getPrisma();
    if (prisma) {
      const record = await prisma.passwordResetToken.findFirst({
        where: { tokenHash },
        orderBy: { createdAt: 'desc' }
      });
      if (!record) return null;
      if (record.expiresAt.getTime() <= now) {
        await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
        return null;
      }
      await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
      return { userId: record.userId };
    }

    const rows = await this.readJSON();
    const index = rows.findIndex((item) => item.tokenHash === tokenHash);
    if (index === -1) return null;

    const record = rows[index];
    rows.splice(index, 1);
    await this.writeJSON(rows);

    if (new Date(record.expiresAt).getTime() <= now) {
      return null;
    }
    return { userId: record.userId };
  }

  async deleteByUserId(userId) {
    if (!userId) return;

    const prisma = await getPrisma();
    if (prisma) {
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      return;
    }

    const rows = await this.readJSON();
    const next = rows.filter((item) => item.userId !== userId);
    await this.writeJSON(next);
  }
}

const passwordResetService = new PasswordResetService();
export default passwordResetService;
