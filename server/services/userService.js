import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_USERS_PATH = path.join(__dirname, '..', 'data', 'local-users.json');

let prismaClientInstance = null;
let prismaDisabled = false;

function parseUsersPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.users)) return payload.users;
  return [];
}

function sanitizeUsername(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

function deriveUsername(name, email) {
  const fromName = sanitizeUsername(name);
  if (fromName.length >= 3) return fromName;
  const fromEmail = sanitizeUsername(String(email || '').split('@')[0]);
  if (fromEmail.length >= 3) return fromEmail;
  return `user_${Date.now().toString().slice(-6)}`;
}

async function createPrismaClient() {
  if (prismaDisabled || !process.env.DATABASE_URL) return null;
  if (prismaClientInstance) return prismaClientInstance;
  try {
    const prismaModule = await import('@prisma/client');
    const { PrismaClient } = prismaModule;
    prismaClientInstance = new PrismaClient();
    return prismaClientInstance;
  } catch {
    prismaDisabled = true;
    return null;
  }
}

class UserService {
  async readJSON() {
    try {
      const raw = await fs.readFile(LOCAL_USERS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return parseUsersPayload(parsed);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async writeJSON(users) {
    await fs.mkdir(path.dirname(LOCAL_USERS_PATH), { recursive: true });
    await fs.writeFile(LOCAL_USERS_PATH, JSON.stringify(users, null, 2), 'utf8');
  }

  toAppUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.displayName || user.name || user.username || 'Usuario',
      username: user.username,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt
    };
  }

  async ensureUniqueUsername(baseUsername, prismaClient) {
    let attempt = sanitizeUsername(baseUsername);
    if (!attempt) attempt = `user_${Date.now().toString().slice(-6)}`;

    for (let i = 0; i < 50; i += 1) {
      const candidate = i === 0 ? attempt : `${attempt}_${i}`;
      if (prismaClient) {
        const existing = await prismaClient.user.findUnique({ where: { username: candidate } });
        if (!existing) return candidate;
      } else {
        const users = await this.readJSON();
        if (!users.some((user) => user.username === candidate)) return candidate;
      }
    }
    return `${attempt}_${Date.now().toString().slice(-4)}`;
  }

  async createUser(data) {
    const prismaClient = await createPrismaClient();
    if (prismaClient) {
      const username = await this.ensureUniqueUsername(data.username || deriveUsername(data.displayName || data.name, data.email), prismaClient);
      const created = await prismaClient.user.create({
        data: {
          email: data.email,
          username,
          passwordHash: data.passwordHash,
          displayName: data.displayName || data.name || null,
          avatarUrl: data.avatarUrl || null,
          spotifyId: data.spotifyId || null
        }
      });
      return this.toAppUser(created);
    }

    const users = await this.readJSON();
    const username = await this.ensureUniqueUsername(data.username || deriveUsername(data.displayName || data.name, data.email), null);
    const user = {
      id: data.id || `u-${Date.now()}`,
      name: data.name || data.displayName || username,
      username,
      email: data.email,
      passwordHash: data.passwordHash,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    await this.writeJSON(users);
    return this.toAppUser(user);
  }

  async findByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    const prismaClient = await createPrismaClient();
    if (prismaClient) {
      const user = await prismaClient.user.findUnique({ where: { email: normalized } });
      return this.toAppUser(user);
    }

    const users = await this.readJSON();
    const found = users.find((user) => user.email === normalized);
    return this.toAppUser(found);
  }

  async findById(id) {
    const prismaClient = await createPrismaClient();
    if (prismaClient) {
      const user = await prismaClient.user.findUnique({ where: { id } });
      return this.toAppUser(user);
    }
    const users = await this.readJSON();
    const found = users.find((user) => user.id === id);
    return this.toAppUser(found);
  }

  async disconnect() {
    if (prismaClientInstance) {
      await prismaClientInstance.$disconnect();
      prismaClientInstance = null;
    }
  }
}

const userService = new UserService();
export default userService;
