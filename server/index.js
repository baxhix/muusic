import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import userService from './services/userService.js';
import redisService from './services/redis.js';
import sessionService from './services/session.js';
import cacheMiddleware from './middleware/cache.js';
import mapRoutes from './routes/map.js';
import geolocationService from './services/geolocation.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  },
  transports: ['websocket'],
  perMessageDeflate: false
});

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.SPOTIFY_JWT_SECRET || 'local-dev-secret';
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 24);

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use('/api', mapRoutes);

const rooms = new Map();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash).split(':');
  if (!salt || !key) return false;
  const hashBuffer = Buffer.from(key, 'hex');
  const candidate = scryptSync(password, salt, 64);
  if (hashBuffer.length !== candidate.length) return false;
  return timingSafeEqual(hashBuffer, candidate);
}

function issueLocalAuthToken(user) {
  return jwt.sign(
    {
      type: 'local-auth',
      userId: user.id,
      name: user.name || user.displayName || user.username || 'Usuario',
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      messages: []
    });
  }
  return rooms.get(roomId);
}

function buildPresence(room) {
  return Array.from(room.users.values()).map((user) => ({
    id: user.id,
    name: user.name,
    spotify: user.spotify,
    location: user.location,
    connectedAt: user.connectedAt
  }));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/artists', cacheMiddleware(300), (_req, res) => {
  const artists = [
    { id: 'a-1', name: 'Jorge e Mateus', trend: 'high' },
    { id: 'a-2', name: 'Marilia Mendonca', trend: 'high' },
    { id: 'a-3', name: 'Henrique e Juliano', trend: 'medium' },
    { id: 'a-4', name: 'Gusttavo Lima', trend: 'medium' },
    { id: 'a-5', name: 'Maiara e Maraisa', trend: 'up' }
  ];
  res.json({ items: artists, count: artists.length });
});

app.post('/auth/local/register', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Campos obrigatorios ausentes.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'E-mail invalido.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Confirmacao de senha invalida.' });
    }

    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'E-mail ja cadastrado.' });
    }

    const user = await userService.createUser({
      id: `u-${Date.now()}-${nanoid(6)}`,
      email,
      name,
      displayName: name,
      passwordHash: hashPassword(password)
    });

    const token = issueLocalAuthToken(user);
    const sessionId = await sessionService.create(user.id);
    res.status(201).json({
      token,
      sessionId,
      user: {
        id: user.id,
        name: user.name || name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: `Erro ao registrar: ${error.message}` });
  }
});

app.post('/auth/local/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha sao obrigatorios.' });
    }

    const user = await userService.findByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Credenciais invalidas.' });
    }

    const token = issueLocalAuthToken(user);
    const sessionId = await sessionService.create(user.id);
    res.json({
      token,
      sessionId,
      user: {
        id: user.id,
        name: user.name || user.username || 'Usuario',
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: `Erro ao autenticar: ${error.message}` });
  }
});

app.post('/auth/local/forgot-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Informe o e-mail.' });
    }
    const exists = Boolean(await userService.findByEmail(email));
    if (!exists) {
      return res.status(404).json({ error: 'E-mail nao encontrado.' });
    }
    res.json({ ok: true, message: 'Link de recuperacao enviado (simulado).' });
  } catch (error) {
    res.status(500).json({ error: `Erro ao processar recuperacao: ${error.message}` });
  }
});

app.get('/auth/local/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const sessionId = String(req.headers['x-session-id'] || req.query?.sessionId || '');

  if (!token && sessionId) {
    try {
      const session = await sessionService.get(sessionId);
      if (!session?.userId) {
        return res.status(401).json({ error: 'Sessao invalida.' });
      }
      const user = await userService.findById(session.userId);
      if (!user) {
        return res.status(401).json({ error: 'Sessao expirada.' });
      }
      return res.json({
        user: {
          id: user.id,
          name: user.name || user.username || 'Usuario',
          email: user.email
        }
      });
    } catch {
      return res.status(401).json({ error: 'Sessao invalida.' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Token ausente.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.type !== 'local-auth') {
      return res.status(401).json({ error: 'Token invalido.' });
    }
    res.json({
      user: {
        id: payload.userId,
        name: payload.name,
        email: payload.email
      }
    });
  } catch {
    res.status(401).json({ error: 'Token expirado ou invalido.' });
  }
});

app.post('/auth/local/logout', async (req, res) => {
  try {
    const sessionId = String(req.headers['x-session-id'] || req.body?.sessionId || '');
    if (sessionId) {
      await sessionService.destroy(sessionId);
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Falha ao encerrar sessao.' });
  }
});

app.get('/auth/spotify/login', (req, res) => {
  const { userId = 'user', roomId = 'global' } = req.query;
  const state = Buffer.from(JSON.stringify({ userId, roomId, nonce: nanoid() })).toString('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID || '',
    scope: 'user-read-private user-read-email',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI || '',
    state
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

app.get('/auth/spotify/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send('Missing code/state');
    }

    const decoded = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));

    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI || ''
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenRes.data.access_token;
    const profileRes = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const spotifyProfile = {
      id: profileRes.data.id,
      display_name: profileRes.data.display_name,
      email: profileRes.data.email,
      product: profileRes.data.product,
      image: profileRes.data.images?.[0]?.url || null
    };

    const appToken = jwt.sign(
      {
        userId: decoded.userId,
        roomId: decoded.roomId,
        spotify: spotifyProfile
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const redirect = new URL(FRONTEND_URL);
    redirect.searchParams.set('spotify_token', appToken);
    redirect.searchParams.set('room', decoded.roomId);
    redirect.searchParams.set('user', decoded.userId);

    res.redirect(redirect.toString());
  } catch (error) {
    res.status(500).send(`Spotify callback error: ${error.message}`);
  }
});

app.get('/auth/spotify/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({
      userId: payload.userId,
      roomId: payload.roomId,
      spotify: payload.spotify
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

io.on('connection', (socket) => {
  let joinedRoom = null;
  let joinedUserId = null;

  socket.on('room:join', ({ roomId = 'global', userId, name, spotify, token } = {}, ack) => {
    try {
      let finalSpotify = spotify || null;
      let finalUserId = userId || `guest-${socket.id.slice(0, 6)}`;

      if (token) {
        const payload = jwt.verify(token, JWT_SECRET);
        finalSpotify = payload.spotify;
        finalUserId = payload.userId;
        roomId = payload.roomId || roomId;
      }

      joinedRoom = String(roomId);
      joinedUserId = String(finalUserId);
      socket.join(joinedRoom);

      const room = getRoom(joinedRoom);
      room.users.set(joinedUserId, {
        id: joinedUserId,
        name: name || finalSpotify?.display_name || `User ${joinedUserId}`,
        spotify: finalSpotify,
        location: null,
        connectedAt: Date.now(),
        socketId: socket.id
      });

      io.to(joinedRoom).emit('presence:update', buildPresence(room));
      socket.emit('chat:history', room.messages);
      ack?.({ ok: true, roomId: joinedRoom, userId: joinedUserId });
    } catch {
      ack?.({ ok: false, error: 'Join failed' });
    }
  });

  socket.on('location:update', ({ lat, lng } = {}) => {
    if (!joinedRoom || !joinedUserId) return;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const room = getRoom(joinedRoom);
    const user = room.users.get(joinedUserId);
    if (!user) return;

    user.location = { lat, lng, updatedAt: Date.now() };
    io.to(joinedRoom).emit('presence:update', buildPresence(room));
  });

  socket.on('chat:message', ({ text } = {}, ack) => {
    if (!joinedRoom || !joinedUserId) return;
    const normalized = typeof text === 'string' ? text.trim() : '';
    if (!normalized) return;

    const room = getRoom(joinedRoom);
    const sender = room.users.get(joinedUserId);
    if (!sender) return;

    const message = {
      id: nanoid(12),
      userId: sender.id,
      name: sender.name,
      text: normalized.slice(0, 500),
      createdAt: Date.now()
    };

    room.messages.push(message);
    if (room.messages.length > 200) {
      room.messages.shift();
    }

    io.to(joinedRoom).emit('chat:new', message);
    ack?.({ ok: true, id: message.id });
  });

  socket.on('disconnect', () => {
    if (!joinedRoom || !joinedUserId) return;
    const room = rooms.get(joinedRoom);
    if (!room) return;

    room.users.delete(joinedUserId);
    io.to(joinedRoom).emit('presence:update', buildPresence(room));

    if (room.users.size === 0) {
      rooms.delete(joinedRoom);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await userService.disconnect();
  await geolocationService.disconnect();
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await userService.disconnect();
  await geolocationService.disconnect();
  await redisService.disconnect();
  process.exit(0);
});
