import jwt from 'jsonwebtoken';

export function createLocalAuth({ jwtSecret, sessionService, userService, sanitizeRole }) {
  async function readAuthSession(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const sessionIdFromHeader = String(req.headers['x-session-id'] || req.query?.sessionId || '');
    if (!token) return { error: 'Token ausente.' };

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
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

  async function requireAdmin(req, res) {
    const auth = await readAuthSession(req);
    if (auth.error) {
      res.status(401).json({ error: auth.error });
      return null;
    }
    if (sanitizeRole(auth.user.role) !== 'ADMIN') {
      res.status(403).json({ error: 'Acesso restrito ao painel administrativo.' });
      return null;
    }
    return auth;
  }

  return {
    readAuthSession,
    requireAdmin
  };
}
