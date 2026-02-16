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
import passwordResetService from './services/passwordResetService.js';
import cacheMiddleware from './middleware/cache.js';
import mapRoutes from './routes/map.js';
import geolocationService from './services/geolocation.js';
import { disconnectPrisma } from './services/db.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.SPOTIFY_JWT_SECRET || 'local-dev-secret';
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 24);
const allowedOrigins = new Set([FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']);
const isProduction = process.env.NODE_ENV === 'production';
const artistImageCache = new Map();
const ARTIST_IMAGE_TTL_MS = 10 * 60 * 1000;

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

function issueLocalAuthToken(user, sessionId) {
  return jwt.sign(
    {
      type: 'local-auth',
      sessionId,
      userId: user.id,
      name: user.name || user.displayName || user.username || 'Usuario',
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

async function fetchSpotifyNowPlaying(accessToken) {
  try {
    const playbackRes = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` },
      validateStatus: () => true
    });

    if (playbackRes.status === 204) return null;
    if (playbackRes.status >= 400) return null;
    const item = playbackRes.data?.item;
    if (!item) return null;
    const primaryArtist = Array.isArray(item.artists) ? item.artists[0] : null;
    const primaryArtistId = primaryArtist?.id || null;
    const artistImage = await fetchSpotifyArtistImage(accessToken, primaryArtistId);
    const artists = Array.isArray(item.artists) ? item.artists.map((artist) => artist.name).join(', ') : null;

    return {
      trackId: item.id || null,
      trackName: item.name || null,
      artistId: primaryArtistId,
      artistName: primaryArtist?.name || artists || null,
      artists,
      artistImage,
      albumImage: item.album?.images?.[0]?.url || null,
      isPlaying: Boolean(playbackRes.data?.is_playing),
      progressMs: typeof playbackRes.data?.progress_ms === 'number' ? playbackRes.data.progress_ms : null,
      durationMs: typeof item.duration_ms === 'number' ? item.duration_ms : null
    };
  } catch {
    return null;
  }
}

async function fetchSpotifyArtistImage(accessToken, artistId) {
  if (!artistId) return null;
  const cached = artistImageCache.get(artistId);
  if (cached?.expiresAt > Date.now()) {
    return cached.image || null;
  }

  try {
    const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      validateStatus: () => true
    });
    if (response.status >= 400) return null;
    const image = response.data?.images?.[0]?.url || null;
    artistImageCache.set(artistId, { image, expiresAt: Date.now() + ARTIST_IMAGE_TTL_MS });
    return image;
  } catch {
    return null;
  }
}

async function refreshSpotifyAccessToken(refreshToken) {
  if (!refreshToken) return null;
  try {
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: String(refreshToken)
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      accessToken: tokenRes.data.access_token,
      refreshToken: tokenRes.data.refresh_token || refreshToken,
      expiresIn: Number(tokenRes.data.expires_in || 3600)
    };
  } catch {
    return null;
  }
}

async function readAuthSession(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const sessionIdFromHeader = String(req.headers['x-session-id'] || req.query?.sessionId || '');
  if (!token) return { error: 'Token ausente.' };

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return { error: 'Token expirado ou invalido.' };
  }

  if (payload?.type !== 'local-auth') {
    return { error: 'Token invalido.' };
  }

  const sessionId = String(payload.sessionId || sessionIdFromHeader || '');
  if (!sessionId) {
    return { error: 'Sessao ausente.' };
  }

  const session = await sessionService.get(sessionId);
  if (!session?.userId || session.userId !== payload.userId) {
    return { error: 'Sessao invalida.' };
  }

  const user = await userService.findById(payload.userId);
  if (!user) {
    return { error: 'Sessao expirada.' };
  }

  return { user, sessionId };
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

    const sessionId = await sessionService.create(user.id);
    const token = issueLocalAuthToken(user, sessionId);
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

    const sessionId = await sessionService.create(user.id);
    const token = issueLocalAuthToken(user, sessionId);
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

    const user = await userService.findByEmail(email);
    if (!user) {
      return res.json({
        ok: true,
        message: 'Se o e-mail existir, enviaremos instrucoes de recuperacao.'
      });
    }

    await passwordResetService.deleteByUserId(user.id);
    const { token } = await passwordResetService.issue(user.id);

    const response = {
      ok: true,
      message: 'Se o e-mail existir, enviaremos instrucoes de recuperacao.'
    };

    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = token;
    }
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: `Erro ao processar recuperacao: ${error.message}` });
  }
});

app.post('/auth/local/reset-password', async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Campos obrigatorios ausentes.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Confirmacao de senha invalida.' });
    }

    const payload = await passwordResetService.consume(token);
    if (!payload?.userId) {
      return res.status(400).json({ error: 'Token de recuperacao invalido ou expirado.' });
    }

    await userService.updatePasswordById(payload.userId, hashPassword(password));
    await sessionService.destroyByUserId(payload.userId);

    res.json({ ok: true, message: 'Senha atualizada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: `Erro ao redefinir senha: ${error.message}` });
  }
});

app.get('/auth/local/me', async (req, res) => {
  try {
    const auth = await readAuthSession(req);
    if (auth.error) {
      return res.status(401).json({ error: auth.error });
    }
    return res.json({
      user: {
        id: auth.user.id,
        name: auth.user.name || auth.user.username || 'Usuario',
        email: auth.user.email
      },
      sessionId: auth.sessionId
    });
  } catch {
    return res.status(401).json({ error: 'Sessao invalida.' });
  }
});

app.post('/auth/local/logout', async (req, res) => {
  try {
    const auth = await readAuthSession(req);
    if (auth.error) {
      const sessionId = String(req.headers['x-session-id'] || req.body?.sessionId || '');
      if (sessionId) await sessionService.destroy(sessionId);
      return res.json({ ok: true });
    }
    await sessionService.destroy(auth.sessionId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Falha ao encerrar sessao.' });
  }
});

app.post('/auth/spotify/connect', async (req, res) => {
  try {
    const auth = await readAuthSession(req);
    if (auth.error) {
      return res.status(401).json({ error: auth.error });
    }

    const stateToken = jwt.sign(
      {
        type: 'spotify-connect',
        userId: auth.user.id,
        roomId: String(req.body?.roomId || 'global'),
        sessionId: auth.sessionId,
        nonce: nanoid()
      },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID || '',
      scope: 'user-read-private user-read-email user-read-currently-playing user-read-playback-state',
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI || '',
      state: stateToken
    });

    return res.json({
      url: `https://accounts.spotify.com/authorize?${params.toString()}`
    });
  } catch {
    return res.status(500).json({ error: 'Falha ao iniciar conexao Spotify.' });
  }
});

app.get('/auth/spotify/login', (req, res) => {
  const { userId = 'user', roomId = 'global' } = req.query;
  const state = Buffer.from(JSON.stringify({ userId, roomId, nonce: nanoid() })).toString('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID || '',
    scope: 'user-read-private user-read-email user-read-currently-playing user-read-playback-state',
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

    let decoded = null;
    try {
      const payload = jwt.verify(String(state), JWT_SECRET);
      if (payload?.type === 'spotify-connect') {
        decoded = payload;
      }
    } catch {
      // ignore signed state parse errors and fallback to legacy format.
    }

    if (!decoded) {
      decoded = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
    }

    const sessionId = String(decoded.sessionId || '');
    if (sessionId) {
      const session = await sessionService.get(sessionId);
      if (!session || session.userId !== decoded.userId) {
        return res.status(401).send('Sessao local invalida para conectar Spotify.');
      }
    }

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
    const refreshToken = tokenRes.data.refresh_token || null;
    const expiresIn = Number(tokenRes.data.expires_in || 3600);
    const tokenExpiresAt = Date.now() + expiresIn * 1000;
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
    const nowPlaying = await fetchSpotifyNowPlaying(accessToken);

    const appToken = jwt.sign(
      {
        type: 'spotify-auth',
        userId: decoded.userId,
        roomId: decoded.roomId,
        spotify: spotifyProfile,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        nowPlaying
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const redirect = new URL(FRONTEND_URL);
    redirect.searchParams.set('spotify_token', appToken);
    redirect.searchParams.set('spotify_connected', '1');
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
    if (payload?.type !== 'spotify-auth') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    res.json({
      userId: payload.userId,
      roomId: payload.roomId,
      spotify: payload.spotify,
      nowPlaying: payload.nowPlaying || null,
      tokenExpiresAt: payload.tokenExpiresAt || null
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/auth/spotify/now-playing', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.type !== 'spotify-auth') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    let accessToken = payload.accessToken;
    let refreshToken = payload.refreshToken || null;
    let tokenExpiresAt = Number(payload.tokenExpiresAt || 0);
    if (!accessToken) {
      return res.status(400).json({ error: 'Spotify token payload missing access token' });
    }

    if (tokenExpiresAt && Date.now() >= tokenExpiresAt - 30_000) {
      const refreshed = await refreshSpotifyAccessToken(refreshToken);
      if (refreshed?.accessToken) {
        accessToken = refreshed.accessToken;
        refreshToken = refreshed.refreshToken;
        tokenExpiresAt = Date.now() + refreshed.expiresIn * 1000;
      }
    }

    const nowPlaying = await fetchSpotifyNowPlaying(accessToken);
    const response = { nowPlaying };

    if (refreshToken && accessToken !== payload.accessToken) {
      response.spotifyToken = jwt.sign(
        {
          ...payload,
          accessToken,
          refreshToken,
          tokenExpiresAt,
          nowPlaying
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
    }

    return res.json(response);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

io.on('connection', (socket) => {
  let joinedRoom = null;
  let joinedUserId = null;

  socket.on('room:join', async ({ roomId = 'global', userId, name, spotify, token, sessionId } = {}, ack) => {
    try {
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
  await geolocationService.disconnect();
  await disconnectPrisma();
  await redisService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await geolocationService.disconnect();
  await disconnectPrisma();
  await redisService.disconnect();
  process.exit(0);
});
