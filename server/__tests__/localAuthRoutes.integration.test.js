import { describe, expect, it } from 'vitest';
import { createLocalAuth } from '../middleware/localAuth.js';
import { createLocalAuthRouter } from '../routes/localAuth.js';
import {
  determineRoleForNewUser,
  hashPassword,
  issueLocalAuthToken,
  sanitizeRole,
  sanitizeUserResponse,
  verifyPassword
} from '../utils/authLocal.js';

function createInMemoryServices() {
  const users = new Map();
  const sessions = new Map();
  const accountSettings = new Map();
  const plays = [];

  const userService = {
    async countUsers() {
      return users.size;
    },
    async findByEmail(email) {
      for (const user of users.values()) {
        if (user.email === email) return user;
      }
      return null;
    },
    async findById(id) {
      return users.get(id) || null;
    },
    async createUser(payload) {
      const user = { ...payload, avatarUrl: null };
      users.set(user.id, user);
      return user;
    },
    async updatePasswordById(id, passwordHash) {
      const user = users.get(id);
      if (!user) return null;
      user.passwordHash = passwordHash;
      return user;
    },
    async updateUserById(id, changes) {
      const user = users.get(id);
      if (!user) return null;
      Object.assign(user, changes);
      return user;
    }
  };

  let seq = 0;
  const sessionService = {
    async create(userId) {
      const sessionId = `s-${++seq}`;
      sessions.set(sessionId, { userId });
      return sessionId;
    },
    async get(sessionId) {
      return sessions.get(sessionId) || null;
    },
    async destroy(sessionId) {
      sessions.delete(sessionId);
    },
    async destroyByUserId(userId) {
      for (const [sessionId, item] of sessions.entries()) {
        if (item.userId === userId) sessions.delete(sessionId);
      }
    }
  };

  const passwordResetTokens = new Map();
  const passwordResetService = {
    async deleteByUserId(userId) {
      for (const [token, item] of passwordResetTokens.entries()) {
        if (item.userId === userId) passwordResetTokens.delete(token);
      }
    },
    async issue(userId) {
      const token = `r-${userId}`;
      passwordResetTokens.set(token, { userId });
      return { token };
    },
    async consume(token) {
      const payload = passwordResetTokens.get(token) || null;
      passwordResetTokens.delete(token);
      return payload;
    }
  };

  const accountSettingsService = {
    async getByUserId(userId) {
      return (
        accountSettings.get(userId) || {
          city: 'Londrina',
          bio: '',
          locationEnabled: true,
          showMusicHistory: true,
          cityCenterLat: null,
          cityCenterLng: null
        }
      );
    },
    async updateByUserId(userId, payload) {
      accountSettings.set(userId, payload);
      return payload;
    }
  };

  const trendingPlaybackService = {
    async recordPlayback(play) {
      plays.push(play);
      return { recorded: true };
    }
  };

  return {
    userService,
    sessionService,
    passwordResetService,
    accountSettingsService,
    trendingPlaybackService,
    plays
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

function getRouteHandler(router, method, path) {
  const layer = router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method.toLowerCase()]
  );
  if (!layer) {
    throw new Error(`Route not found: ${method} ${path}`);
  }
  return layer.route.stack[0].handle;
}

describe('local auth routes integration', () => {
  it('registers, authenticates, and returns /me', async () => {
    const services = createInMemoryServices();
    const jwtSecret = 'test-secret';
    const { readAuthSession } = createLocalAuth({
      jwtSecret,
      sessionService: services.sessionService,
      userService: services.userService,
      sanitizeRole
    });

    const router = createLocalAuthRouter({
      jwtSecret,
      nanoid: () => 'abc123',
      adminEmails: new Set(),
      userService: services.userService,
      sessionService: services.sessionService,
      passwordResetService: services.passwordResetService,
      accountSettingsService: services.accountSettingsService,
      trendingPlaybackService: services.trendingPlaybackService,
      determineRoleForNewUser,
      hashPassword,
      verifyPassword,
      issueLocalAuthToken,
      sanitizeUserResponse,
      readAuthSession,
      isProduction: false
    });

    const register = getRouteHandler(router, 'POST', '/auth/local/register');
    const registerReq = {
      body: {
        name: 'Marcelo',
        email: 'marcelo@muusic.live',
        password: '123456',
        confirmPassword: '123456'
      },
      headers: {},
      query: {}
    };
    const registerRes = createMockRes();
    await register(registerReq, registerRes);
    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.payload.token).toBeTruthy();
    expect(registerRes.payload.sessionId).toBeTruthy();

    const me = getRouteHandler(router, 'GET', '/auth/local/me');
    const meReq = {
      body: {},
      headers: {
        authorization: `Bearer ${registerRes.payload.token}`,
        'x-session-id': registerRes.payload.sessionId
      },
      query: {}
    };
    const meRes = createMockRes();
    await me(meReq, meRes);
    expect(meRes.statusCode).toBe(200);
    expect(meRes.payload.user.email).toBe('marcelo@muusic.live');
  });

  it('changes password and records trending playback', async () => {
    const services = createInMemoryServices();
    const jwtSecret = 'test-secret';
    const { readAuthSession } = createLocalAuth({
      jwtSecret,
      sessionService: services.sessionService,
      userService: services.userService,
      sanitizeRole
    });

    const router = createLocalAuthRouter({
      jwtSecret,
      nanoid: () => 'abc123',
      adminEmails: new Set(),
      userService: services.userService,
      sessionService: services.sessionService,
      passwordResetService: services.passwordResetService,
      accountSettingsService: services.accountSettingsService,
      trendingPlaybackService: services.trendingPlaybackService,
      determineRoleForNewUser,
      hashPassword,
      verifyPassword,
      issueLocalAuthToken,
      sanitizeUserResponse,
      readAuthSession,
      isProduction: false
    });

    const register = getRouteHandler(router, 'POST', '/auth/local/register');
    const registerRes = createMockRes();
    await register(
      {
        body: {
          name: 'Marcelo',
          email: 'marcelo@muusic.live',
          password: '123456',
          confirmPassword: '123456'
        },
        headers: {},
        query: {}
      },
      registerRes
    );

    const headers = {
      authorization: `Bearer ${registerRes.payload.token}`,
      'x-session-id': registerRes.payload.sessionId
    };

    const changePassword = getRouteHandler(router, 'POST', '/auth/local/change-password');
    const changeRes = createMockRes();
    await changePassword(
      {
        body: {
          currentPassword: '123456',
          newPassword: '12345678',
          confirmPassword: '12345678'
        },
        headers,
        query: {}
      },
      changeRes
    );
    expect(changeRes.statusCode).toBe(200);

    const login = getRouteHandler(router, 'POST', '/auth/local/login');
    const oldLoginRes = createMockRes();
    await login(
      {
        body: { email: 'marcelo@muusic.live', password: '123456' },
        headers: {},
        query: {}
      },
      oldLoginRes
    );
    expect(oldLoginRes.statusCode).toBe(401);

    const newLoginRes = createMockRes();
    await login(
      {
        body: { email: 'marcelo@muusic.live', password: '12345678' },
        headers: {},
        query: {}
      },
      newLoginRes
    );
    expect(newLoginRes.statusCode).toBe(200);

    const playback = getRouteHandler(router, 'POST', '/api/trendings/playback');
    const playbackRes = createMockRes();
    await playback(
      {
        body: {
          isPlaying: true,
          artistName: 'Leo e Raphael',
          trackName: 'Os Menino da Pecuaria'
        },
        headers: {
          authorization: `Bearer ${newLoginRes.payload.token}`,
          'x-session-id': newLoginRes.payload.sessionId
        },
        query: {}
      },
      playbackRes
    );
    expect(playbackRes.statusCode).toBe(200);
    expect(services.plays).toHaveLength(1);
  });
});
