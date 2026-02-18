import { Router } from 'express';

export function createPublicRouter({
  isProduction,
  cacheArtistsMiddleware,
  parseListQuery,
  showService,
  showCacheService,
  sanitizeShowResponse,
  userService,
  accountSettingsService
}) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  router.get('/api/artists', cacheArtistsMiddleware, (_req, res) => {
    const artists = [
      { id: 'a-1', name: 'Jorge e Mateus', trend: 'high' },
      { id: 'a-2', name: 'Marilia Mendonca', trend: 'high' },
      { id: 'a-3', name: 'Henrique e Juliano', trend: 'medium' },
      { id: 'a-4', name: 'Gusttavo Lima', trend: 'medium' },
      { id: 'a-5', name: 'Maiara e Maraisa', trend: 'up' }
    ];
    res.json({ items: artists, count: artists.length });
  });

  router.get('/api/shows', async (_req, res) => {
    try {
      const { page, limit, search } = parseListQuery(_req.query || {});
      const city = String(_req.query?.city || '').trim();
      const cacheKey = JSON.stringify({ page, limit, search, city, upcomingOnly: true });
      const cachedPayload = showCacheService.getCachedShows(cacheKey);
      if (cachedPayload) {
        res.setHeader('Cache-Control', isProduction ? 'public, max-age=30' : 'no-store');
        return res.json(cachedPayload);
      }

      const result = await showService.listShows({
        page,
        limit,
        search,
        city,
        upcomingOnly: true
      });
      const payload = {
        shows: result.items.map((show) => sanitizeShowResponse(show)).filter(Boolean),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total
        }
      };
      showCacheService.setCachedShows(cacheKey, payload);
      res.setHeader('Cache-Control', isProduction ? 'public, max-age=30' : 'no-store');
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: `Erro ao listar shows: ${error.message}` });
    }
  });

  router.get('/api/map-users', async (_req, res) => {
    try {
      const usersPayload = await userService.listUsers({ page: 1, limit: 5000, search: '' });
      const users = Array.isArray(usersPayload?.items) ? usersPayload.items : [];
      const settingsMap = await accountSettingsService.getManyByUserIds(users.map((user) => user.id));

      const items = users
        .map((user) => {
          const settings = settingsMap.get(user.id);
          if (!settings || settings.locationEnabled === false) return null;
          const location = accountSettingsService.buildRandomLocation(
            user.id,
            settings.city,
            settings.cityCenterLat,
            settings.cityCenterLng
          );
          return {
            id: user.id,
            name: user.name || user.username || 'Usuario',
            city: settings.city,
            bio: settings.bio || '',
            showMusicHistory: settings.showMusicHistory !== false,
            avatarUrl: user.avatarUrl || null,
            location
          };
        })
        .filter(Boolean);

      res.setHeader('Cache-Control', isProduction ? 'public, max-age=30' : 'no-store');
      return res.json({ users: items });
    } catch (error) {
      return res.status(500).json({ error: `Erro ao listar usuarios do mapa: ${error.message}` });
    }
  });

  return router;
}
