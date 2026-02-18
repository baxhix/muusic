import { Router } from 'express';

function parseMapUsersQuery(query = {}) {
  const limit = Number.isFinite(Number(query.limit)) ? Math.min(500, Math.max(20, Number(query.limit))) : 200;
  const cursor = Number.isFinite(Number(query.cursor)) ? Math.max(0, Number(query.cursor)) : 0;
  const scanPages = Number.isFinite(Number(query.scanPages)) ? Math.min(25, Math.max(1, Number(query.scanPages))) : 6;
  const rawBbox = String(query.bbox || '').trim();
  let bbox = null;
  if (rawBbox) {
    const parts = rawBbox.split(',').map((value) => Number(value.trim()));
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      const [west, south, east, north] = parts;
      if (south >= -90 && south <= 90 && north >= -90 && north <= 90 && west >= -180 && west <= 180 && east >= -180 && east <= 180) {
        bbox = { west, south, east, north };
      }
    }
  }
  return { limit, cursor, scanPages, bbox };
}

function isInsideBbox(location, bbox) {
  if (!bbox) return true;
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < bbox.south || lat > bbox.north) return false;
  if (bbox.west <= bbox.east) {
    return lng >= bbox.west && lng <= bbox.east;
  }
  return lng >= bbox.west || lng <= bbox.east;
}

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
      const { limit, cursor, scanPages, bbox } = parseMapUsersQuery(_req.query || {});
      const items = [];
      let globalOffset = cursor;
      let scannedPages = 0;
      let hasMore = true;

      while (items.length < limit && scannedPages < scanPages && hasMore) {
        const page = Math.floor(globalOffset / 200) + 1;
        const usersPayload = await userService.listUsers({ page, limit: 200, search: '' });
        const users = Array.isArray(usersPayload?.items) ? usersPayload.items : [];
        scannedPages += 1;
        if (users.length === 0) {
          hasMore = false;
          break;
        }

        const settingsMap = await accountSettingsService.getManyByUserIds(users.map((user) => user.id));
        users.forEach((user) => {
          if (items.length >= limit) return;
          const settings = settingsMap.get(user.id);
          if (!settings || settings.locationEnabled === false) return;
          const location = accountSettingsService.buildRandomLocation(
            user.id,
            settings.city,
            settings.cityCenterLat,
            settings.cityCenterLng
          );
          if (!isInsideBbox(location, bbox)) return;
          items.push({
            id: user.id,
            name: user.name || user.username || 'Usuario',
            city: settings.city,
            bio: settings.bio || '',
            showMusicHistory: settings.showMusicHistory !== false,
            avatarUrl: user.avatarUrl || null,
            location
          });
        });

        globalOffset += users.length;
        if (users.length < 200) {
          hasMore = false;
        }
      }

      res.setHeader('Cache-Control', isProduction ? 'public, max-age=30' : 'no-store');
      return res.json({
        users: items,
        pagination: {
          limit,
          nextCursor: hasMore ? String(globalOffset) : null,
          hasMore,
          scannedPages
        }
      });
    } catch (error) {
      return res.status(500).json({ error: `Erro ao listar usuarios do mapa: ${error.message}` });
    }
  });

  return router;
}
