import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';
import { randomBytes } from 'crypto';
import userService from './services/userService.js';
import showService from './services/showService.js';
import showCacheService from './services/showCache.js';
import redisService from './services/redis.js';
import sessionService from './services/session.js';
import passwordResetService from './services/passwordResetService.js';
import cacheMiddleware from './middleware/cache.js';
import { createLocalAuth } from './middleware/localAuth.js';
import { createAdminRouter } from './routes/admin.js';
import mapRoutes from './routes/map.js';
import { createLocalAuthRouter } from './routes/localAuth.js';
import { createPublicRouter } from './routes/public.js';
import { createSpotifyRouter } from './routes/spotify.js';
import geolocationService from './services/geolocation.js';
import accountSettingsService from './services/accountSettingsService.js';
import trendingPlaybackService from './services/trendingPlaybackService.js';
import performanceService from './services/performanceService.js';
import { createRealtimeClusterService } from './services/realtimeClusterService.js';
import { createSocketRateLimiter } from './services/socketRateLimiter.js';
import { createSpotifyApiService } from './services/spotifyApiService.js';
import { disconnectPrisma } from './services/db.js';
import {
  determineRoleForNewUser,
  hashPassword,
  issueLocalAuthToken,
  sanitizeRole,
  sanitizeUserResponse,
  verifyPassword
} from './utils/authLocal.js';
import { parseListQuery, parseShowPayload, sanitizeShowResponse } from './utils/showPayload.js';

function loadEnvironmentFiles() {
  const appMode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const rootDir = process.cwd();
  const candidates = [
    `.env.${appMode}.local`,
    '.env.local',
    `.env.${appMode}`,
    '.env'
  ];

  for (const fileName of candidates) {
    const filePath = path.join(rootDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    dotenv.config({ path: filePath });
  }
}

loadEnvironmentFiles();

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URLS = String(process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
const FRONTEND_URL = FRONTEND_URLS[0] || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const configuredJwtSecret = String(process.env.SPOTIFY_JWT_SECRET || '').trim();
if (isProduction && (!configuredJwtSecret || configuredJwtSecret === 'change_me_super_secret')) {
  throw new Error('SPOTIFY_JWT_SECRET obrigatorio em producao.');
}
const JWT_SECRET = configuredJwtSecret || 'local-dev-secret';
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 24);
const allowedOrigins = new Set([...FRONTEND_URLS, 'http://localhost:5173', 'http://127.0.0.1:5173']);
const spotifyExchangeCodes = new Map();
const SPOTIFY_EXCHANGE_TTL_MS = 2 * 60 * 1000;
const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

function corsOriginValidator(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error('Not allowed by CORS'));
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: Array.from(allowedOrigins),
    credentials: true
  },
  transports: ['websocket'],
  perMessageDeflate: false
});

if (!isProduction) {
  app.use(cors({ origin: true, credentials: true }));
} else {
  app.use(cors({ origin: corsOriginValidator, credentials: true }));
}
app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  const startedAt = performance.now();
  res.on('finish', () => {
    const durationMs = performance.now() - startedAt;
    performanceService.recordRequest({
      method: req.method,
      path: req.path || req.originalUrl || '/',
      statusCode: res.statusCode,
      durationMs,
      at: Date.now()
    });
  });
  next();
});

app.use((req, res, next) => {
  const path = String(req.path || '');
  if (!isProduction && req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
  } else if (path.startsWith('/auth/') || path.startsWith('/admin/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use('/api', mapRoutes);

const { readAuthSession, requireAdmin } = createLocalAuth({
  jwtSecret: JWT_SECRET,
  sessionService,
  userService,
  sanitizeRole
});
const { fetchSpotifyNowPlaying, refreshSpotifyAccessToken, buildSpotifyBasicHeader } = createSpotifyApiService({
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID || '',
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET || ''
});

function cleanupSpotifyExchangeCodes() {
  const now = Date.now();
  for (const [code, item] of spotifyExchangeCodes.entries()) {
    if (!item || Number(item.expiresAt || 0) <= now) {
      spotifyExchangeCodes.delete(code);
    }
  }
}
const realtimeCluster = createRealtimeClusterService({
  instanceId: `api-${nanoid(10)}`,
  maxMessages: 200
});
await realtimeCluster.start(io);
const socketRateLimiter = createSocketRateLimiter();
await socketRateLimiter.start();

app.use(
  createPublicRouter({
    isProduction,
    cacheArtistsMiddleware: cacheMiddleware(300),
    parseListQuery,
    showService,
    showCacheService,
    sanitizeShowResponse,
    userService,
    accountSettingsService
  })
);

app.use(
  createLocalAuthRouter({
    jwtSecret: JWT_SECRET,
    nanoid,
    adminEmails: ADMIN_EMAILS,
    userService,
    sessionService,
    passwordResetService,
    accountSettingsService,
    trendingPlaybackService,
    determineRoleForNewUser,
    hashPassword,
    verifyPassword,
    issueLocalAuthToken,
    sanitizeUserResponse,
    readAuthSession,
    isProduction
  })
);

app.use(
  createAdminRouter({
    requireAdmin,
    nanoid,
    userService,
    sessionService,
    showService,
    showCacheService,
    trendingPlaybackService,
    performanceService,
    sanitizeRole,
    sanitizeUserResponse,
    hashPassword,
    parseListQuery,
    parseShowPayload,
    sanitizeShowResponse,
    io
  })
);

app.use(
  createSpotifyRouter({
    jwtSecret: JWT_SECRET,
    frontendUrl: FRONTEND_URL,
    nanoid,
    randomBytes,
    readAuthSession,
    sessionService,
    trendingPlaybackService,
    fetchSpotifyNowPlaying,
    refreshSpotifyAccessToken,
    buildSpotifyBasicHeader,
    cleanupSpotifyExchangeCodes,
    spotifyExchangeCodes,
    spotifyExchangeTtlMs: SPOTIFY_EXCHANGE_TTL_MS
  })
);

io.on('connection', (socket) => {
  let joinedRoom = null;
  let joinedUserId = null;
  let joinedUserName = null;

  socket.on('room:join', async ({ roomId = 'global', userId, name, spotify, token, sessionId } = {}, ack) => {
    try {
      const joinLimit = await socketRateLimiter.consume({
        key: `join:${socket.id}`,
        limit: 12,
        windowSec: 60
      });
      if (!joinLimit.allowed) {
        ack?.({ ok: false, error: 'Rate limit exceeded', retryAfterSec: joinLimit.retryAfterSec });
        return;
      }

      if (!token) {
        ack?.({ ok: false, error: 'Auth required' });
        return;
      }

      let finalSpotify = spotify || null;
      let finalUserId = userId || `guest-${socket.id.slice(0, 6)}`;

      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.type === 'local-auth') {
        const sid = String(payload.sessionId || sessionId || '');
        const session = await sessionService.get(sid);
        if (!sid || !session || session.userId !== payload.userId) {
          throw new Error('Invalid session');
        }
        finalSpotify = spotify || null;
        finalUserId = payload.userId;
        roomId = roomId || 'global';
      } else {
        finalSpotify = payload.spotify || spotify || null;
        finalUserId = payload.userId || finalUserId;
        roomId = payload.roomId || roomId;
      }

      joinedRoom = String(roomId);
      joinedUserId = String(finalUserId);
      joinedUserName = name || finalSpotify?.display_name || `User ${joinedUserId}`;
      socket.join(joinedRoom);

      const presence = await realtimeCluster.upsertUser(joinedRoom, {
        id: joinedUserId,
        name: joinedUserName,
        spotify: finalSpotify,
        location: null,
        connectedAt: Date.now()
      });
      io.to(joinedRoom).emit('presence:update', presence);
      const messages = await realtimeCluster.getMessages(joinedRoom);
      socket.emit('chat:history', messages);
      ack?.({ ok: true, roomId: joinedRoom, userId: joinedUserId });
    } catch {
      ack?.({ ok: false, error: 'Join failed' });
    }
  });

  socket.on('location:update', async ({ lat, lng } = {}) => {
    if (!joinedRoom || !joinedUserId) return;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const locationLimit = await socketRateLimiter.consume({
      key: `loc:${joinedUserId}`,
      limit: 30,
      windowSec: 10
    });
    if (!locationLimit.allowed) return;

    const presence = await realtimeCluster.updateLocation(joinedRoom, joinedUserId, {
      lat,
      lng,
      updatedAt: Date.now()
    });
    if (!presence) return;
    io.to(joinedRoom).emit('presence:update', presence);
  });

  socket.on('chat:message', async ({ text } = {}, ack) => {
    if (!joinedRoom || !joinedUserId) return;
    const normalized = typeof text === 'string' ? text.trim() : '';
    if (!normalized) return;

    const chatLimit = await socketRateLimiter.consume({
      key: `chat:${joinedUserId}`,
      limit: 8,
      windowSec: 10
    });
    if (!chatLimit.allowed) {
      ack?.({ ok: false, error: 'Rate limit exceeded', retryAfterSec: chatLimit.retryAfterSec });
      return;
    }

    const message = {
      id: nanoid(12),
      userId: joinedUserId,
      name: joinedUserName || `User ${joinedUserId}`,
      text: normalized.slice(0, 500),
      createdAt: Date.now()
    };

    await realtimeCluster.appendMessage(joinedRoom, message);
    io.to(joinedRoom).emit('chat:new', message);
    ack?.({ ok: true, id: message.id });
  });

  socket.on('disconnect', async () => {
    if (!joinedRoom || !joinedUserId) return;
    const presence = await realtimeCluster.removeUser(joinedRoom, joinedUserId);
    io.to(joinedRoom).emit('presence:update', presence);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

async function shutdown() {
  await geolocationService.disconnect();
  await disconnectPrisma();
  await socketRateLimiter.stop();
  await realtimeCluster.stop();
  await redisService.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
