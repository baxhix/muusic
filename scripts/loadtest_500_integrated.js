#!/usr/bin/env node

import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { io } from 'socket.io-client';

const BASE_URL = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3001';
const TOTAL_USERS = Number(process.env.LOAD_USERS || 500);
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 40);
const ROOM_ID = process.env.LOAD_ROOM_ID || 'latam-load';
const OUTPUT_PATH = String(process.env.LOAD_OUTPUT || '').trim();

const REQUEST_TIMEOUT_MS = 12000;

function nowIso() {
  return new Date().toISOString();
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function percentile(values, p = 95) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function randomIn(min, max) {
  return Math.random() * (max - min) + min;
}

function randomLatamPoint() {
  // Bounding box aproximado para LATAM
  return {
    lat: round(randomIn(-55, 24), 6),
    lng: round(randomIn(-117, -34), 6)
  };
}

function pickTrack(seed) {
  const tracks = [
    { artistName: 'Bad Bunny', trackName: 'MONACO' },
    { artistName: 'Karol G', trackName: 'Si Antes Te Hubiera Conocido' },
    { artistName: 'Feid', trackName: 'LUNA' },
    { artistName: 'Anitta', trackName: 'Envolver' },
    { artistName: 'Bizarrap', trackName: 'Bzrp Music Sessions' }
  ];
  return tracks[seed % tracks.length];
}

function createMetrics() {
  return {
    steps: new Map(),
    httpStatus: new Map(),
    socket: {
      joinOk: 0,
      joinFail: 0,
      locationSent: 0,
      chatAckOk: 0,
      chatAckFail: 0
    },
    counters: {
      usersOk: 0,
      usersFailed: 0
    }
  };
}

function recordStep(metrics, step, durationMs, ok) {
  const item = metrics.steps.get(step) || { durations: [], ok: 0, fail: 0 };
  item.durations.push(durationMs);
  if (ok) item.ok += 1;
  else item.fail += 1;
  metrics.steps.set(step, item);
}

function recordStatus(metrics, statusCode) {
  metrics.httpStatus.set(statusCode, (metrics.httpStatus.get(statusCode) || 0) + 1);
}

async function requestJson(metrics, step, url, init = {}) {
  const startedAt = performance.now();
  try {
    const controller = new globalThis.AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeout);
    recordStatus(metrics, response.status);
    const payload = await response.json().catch(() => ({}));
    const ok = response.status >= 200 && response.status < 300;
    recordStep(metrics, step, performance.now() - startedAt, ok);
    return { ok, status: response.status, payload };
  } catch (error) {
    recordStep(metrics, step, performance.now() - startedAt, false);
    return { ok: false, status: 0, payload: { error: error.message || 'network-error' } };
  }
}

async function joinSocketAndInteract(metrics, authUser, userIndex) {
  const startedAt = performance.now();
  const socket = io(BASE_URL, {
    transports: ['websocket'],
    timeout: REQUEST_TIMEOUT_MS
  });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('socket-connect-timeout')), REQUEST_TIMEOUT_MS);
      socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on('connect_error', (error) => {
        clearTimeout(timer);
        reject(error || new Error('socket-connect-error'));
      });
    });

    const joinResult = await new Promise((resolve) => {
      socket.emit(
        'room:join',
        {
          roomId: ROOM_ID,
          userId: authUser.user.id,
          name: authUser.user.name,
          token: authUser.token,
          sessionId: authUser.sessionId
        },
        (ack) => resolve(ack || { ok: false })
      );
    });

    if (!joinResult.ok) {
      metrics.socket.joinFail += 1;
      recordStep(metrics, 'socket:join', performance.now() - startedAt, false);
      return;
    }

    metrics.socket.joinOk += 1;
    recordStep(metrics, 'socket:join', performance.now() - startedAt, true);

    for (let i = 0; i < 3; i += 1) {
      const point = randomLatamPoint();
      socket.emit('location:update', point);
      metrics.socket.locationSent += 1;
    }

    const chatAck = await new Promise((resolve) => {
      socket.emit(
        'chat:message',
        { text: `load-user-${userIndex}-${Date.now()}` },
        (ack) => resolve(ack || { ok: false })
      );
    });
    if (chatAck.ok) metrics.socket.chatAckOk += 1;
    else metrics.socket.chatAckFail += 1;
  } catch {
    metrics.socket.joinFail += 1;
    recordStep(metrics, 'socket:join', performance.now() - startedAt, false);
  } finally {
    socket.disconnect();
  }
}

async function runVirtualUser(metrics, userIndex) {
  const email = `load500_${Date.now()}_${userIndex}@muusic.live`;
  const password = 'LoadTest#123';
  const displayName = `Load User ${userIndex}`;

  const register = await requestJson(metrics, 'auth:register', `${BASE_URL}/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: displayName,
      email,
      password,
      confirmPassword: password
    })
  });
  if (!register.ok || !register.payload?.token || !register.payload?.sessionId) {
    metrics.counters.usersFailed += 1;
    return;
  }

  const token = register.payload.token;
  const sessionId = register.payload.sessionId;
  const authUser = register.payload;

  await requestJson(metrics, 'auth:me', `${BASE_URL}/auth/local/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-session-id': sessionId
    }
  });

  await requestJson(metrics, 'api:shows', `${BASE_URL}/api/shows?page=1&limit=20`, {
    method: 'GET'
  });

  await requestJson(metrics, 'api:map-users', `${BASE_URL}/api/map-users?limit=180&scanPages=4`, {
    method: 'GET'
  });

  // Integração Spotify: valida endpoint de connect no backend sem depender de callback OAuth externo.
  await requestJson(metrics, 'spotify:connect', `${BASE_URL}/auth/spotify/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-session-id': sessionId
    },
    body: JSON.stringify({ roomId: ROOM_ID })
  });

  // Pipeline de playback (dados "Spotify-like")
  const track = pickTrack(userIndex);
  await requestJson(metrics, 'spotify:playback', `${BASE_URL}/api/trendings/playback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-session-id': sessionId
    },
    body: JSON.stringify({
      artistName: track.artistName,
      trackName: track.trackName,
      timestamp: nowIso(),
      isPlaying: true
    })
  });

  // Simula report de FPS do cliente (telemetria de render)
  await requestJson(metrics, 'client:fps', `${BASE_URL}/api/telemetry/fps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fps: round(randomIn(36, 58), 2) })
  });

  await joinSocketAndInteract(metrics, authUser, userIndex);
  metrics.counters.usersOk += 1;
}

function buildSummary(metrics, totalMs) {
  const steps = {};
  for (const [name, stat] of metrics.steps.entries()) {
    steps[name] = {
      calls: stat.durations.length,
      ok: stat.ok,
      fail: stat.fail,
      avgMs: round(stat.durations.reduce((sum, value) => sum + value, 0) / Math.max(1, stat.durations.length)),
      p95Ms: round(percentile(stat.durations, 95)),
      p99Ms: round(percentile(stat.durations, 99))
    };
  }
  return {
    at: nowIso(),
    baseUrl: BASE_URL,
    users: {
      target: TOTAL_USERS,
      concurrency: CONCURRENCY,
      ok: metrics.counters.usersOk,
      failed: metrics.counters.usersFailed
    },
    durationMs: round(totalMs),
    usersPerSec: round((metrics.counters.usersOk * 1000) / Math.max(1, totalMs)),
    httpStatus: Object.fromEntries(Array.from(metrics.httpStatus.entries()).sort((a, b) => a[0] - b[0])),
    socket: metrics.socket,
    steps
  };
}

async function main() {
  const metrics = createMetrics();
  const startedAt = performance.now();
  let cursor = 0;

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (true) {
      const next = cursor;
      if (next >= TOTAL_USERS) return;
      cursor += 1;
      await runVirtualUser(metrics, next + 1);
    }
  });

  await Promise.all(workers);
  const totalMs = performance.now() - startedAt;
  const summary = buildSummary(metrics, totalMs);

  console.log(JSON.stringify(summary, null, 2));
  if (OUTPUT_PATH) {
    const finalPath = path.resolve(OUTPUT_PATH);
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    fs.writeFileSync(finalPath, JSON.stringify(summary, null, 2));
    console.log(`Saved summary to: ${finalPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
