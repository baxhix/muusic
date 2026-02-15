import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, '..', 'server', 'data', 'local-users.json');

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

function normalizeUsers(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.users)) return payload.users;
  return [];
}

async function uniqueUsername(base, taken) {
  let attempt = sanitizeUsername(base) || `user_${Date.now().toString().slice(-6)}`;
  let counter = 0;
  while (counter < 100) {
    const candidate = counter === 0 ? attempt : `${attempt}_${counter}`;
    if (!taken.has(candidate)) {
      const exists = await prisma.user.findUnique({ where: { username: candidate } });
      if (!exists) {
        taken.add(candidate);
        return candidate;
      }
    }
    counter += 1;
  }
  const fallback = `${attempt}_${Date.now().toString().slice(-4)}`;
  taken.add(fallback);
  return fallback;
}

async function migrate() {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  const users = normalizeUsers(parsed);

  let migrated = 0;
  const taken = new Set();

  for (const user of users) {
    const email = String(user.email || '').trim().toLowerCase();
    if (!email) continue;

    const username = await uniqueUsername(user.username || user.name || email.split('@')[0], taken);

    await prisma.user.upsert({
      where: { email },
      update: {
        username,
        displayName: user.displayName || user.name || null,
        passwordHash: user.passwordHash || ''
      },
      create: {
        email,
        username,
        passwordHash: user.passwordHash || '',
        displayName: user.displayName || user.name || null,
        avatarUrl: user.avatarUrl || null,
        spotifyId: user.spotifyId || null,
        createdAt: user.createdAt ? new Date(user.createdAt) : undefined
      }
    });
    migrated += 1;
  }

  console.log(`Migrated ${migrated} users`);
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
