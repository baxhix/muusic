import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { getPrisma } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_USERS_PATH = path.join(__dirname, '..', 'data', 'local-users.json');

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
      role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      avatarUrl: user.avatarUrl || null,
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
    const prismaClient = await getPrisma();
    if (prismaClient) {
      const username = await this.ensureUniqueUsername(data.username || deriveUsername(data.displayName || data.name, data.email), prismaClient);
      const created = await prismaClient.user.create({
        data: {
          email: data.email,
          username,
          role: data.role === 'ADMIN' ? 'ADMIN' : 'USER',
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
      role: data.role === 'ADMIN' ? 'ADMIN' : 'USER',
      passwordHash: data.passwordHash,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    await this.writeJSON(users);
    return this.toAppUser(user);
  }

  async findByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    const prismaClient = await getPrisma();
    if (prismaClient) {
      const user = await prismaClient.user.findUnique({ where: { email: normalized } });
      return this.toAppUser(user);
    }

    const users = await this.readJSON();
    const found = users.find((user) => user.email === normalized);
    return this.toAppUser(found);
  }

  async findById(id) {
    const prismaClient = await getPrisma();
    if (prismaClient) {
      const user = await prismaClient.user.findUnique({ where: { id } });
      return this.toAppUser(user);
    }
    const users = await this.readJSON();
    const found = users.find((user) => user.id === id);
    return this.toAppUser(found);
  }

  async listUsers(options = {}) {
    const page = Number.isFinite(Number(options.page)) ? Math.max(1, Number(options.page)) : 1;
    const limit = Number.isFinite(Number(options.limit)) ? Math.min(200, Math.max(1, Number(options.limit))) : 50;
    const search = String(options.search || '').trim();
    const skip = (page - 1) * limit;

    const prismaClient = await getPrisma();
    if (prismaClient) {
      const where = search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } }
            ]
          }
        : undefined;

      const [users, total] = await Promise.all([
        prismaClient.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prismaClient.user.count({ where })
      ]);

      return {
        items: users.map((user) => this.toAppUser(user)),
        total,
        page,
        limit
      };
    }

    const users = await this.readJSON();
    const normalizedSearch = search.toLowerCase();
    const filtered = users
      .slice()
      .filter((user) => {
        if (!normalizedSearch) return true;
        const haystack = `${user.email || ''} ${user.username || ''} ${user.name || ''}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .map((user) => this.toAppUser(user));

    const total = filtered.length;
    const items = filtered.slice(skip, skip + limit);
    return {
      items,
      total,
      page,
      limit
    };
  }

  async countUsers() {
    const prismaClient = await getPrisma();
    if (prismaClient) {
      return prismaClient.user.count();
    }
    const users = await this.readJSON();
    return users.length;
  }

  async updateUserById(id, data) {
    const prismaClient = await getPrisma();
    const nextRole = data.role === 'ADMIN' ? 'ADMIN' : data.role === 'USER' ? 'USER' : undefined;

    if (prismaClient) {
      const payload = {};
      if (typeof data.email === 'string') payload.email = data.email;
      if (typeof data.displayName === 'string') payload.displayName = data.displayName;
      if (typeof data.avatarUrl === 'string' || data.avatarUrl === null) payload.avatarUrl = data.avatarUrl;
      if (typeof data.passwordHash === 'string') payload.passwordHash = data.passwordHash;
      if (typeof nextRole === 'string') payload.role = nextRole;

      const updated = await prismaClient.user.update({
        where: { id },
        data: payload
      });
      return this.toAppUser(updated);
    }

    const users = await this.readJSON();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;

    if (typeof data.email === 'string') users[index].email = data.email;
    if (typeof data.displayName === 'string') users[index].name = data.displayName;
    if (typeof data.avatarUrl === 'string' || data.avatarUrl === null) users[index].avatarUrl = data.avatarUrl;
    if (typeof data.passwordHash === 'string') users[index].passwordHash = data.passwordHash;
    if (typeof nextRole === 'string') users[index].role = nextRole;

    await this.writeJSON(users);
    return this.toAppUser(users[index]);
  }

  async deleteUserById(id) {
    const prismaClient = await getPrisma();
    if (prismaClient) {
      const deleted = await prismaClient.user.delete({ where: { id } });
      return this.toAppUser(deleted);
    }

    const users = await this.readJSON();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    const [deleted] = users.splice(index, 1);
    await this.writeJSON(users);
    return this.toAppUser(deleted);
  }

  async updatePasswordById(id, passwordHash) {
    const prismaClient = await getPrisma();
    if (prismaClient) {
      const updated = await prismaClient.user.update({
        where: { id },
        data: { passwordHash }
      });
      return this.toAppUser(updated);
    }

    const users = await this.readJSON();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    users[index].passwordHash = passwordHash;
    await this.writeJSON(users);
    return this.toAppUser(users[index]);
  }
}

const userService = new UserService();
export default userService;
