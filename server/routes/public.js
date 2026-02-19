import { Router } from 'express';

const MAP_USERS_CACHE_TTL_MS = Number(process.env.MAP_USERS_CACHE_TTL_MS || 8000);
const MAP_USERS_CACHE_MAX_KEYS = Number(process.env.MAP_USERS_CACHE_MAX_KEYS || 128);

const mapUsersCache = new Map();
const mapUsersInFlight = new Map();
const showsInFlight = new Map();

function parseMapUsersQuery(query = {}) {
  const limit = Number.isFinite(Number(query.limit)) ? Math.min(500, Math.max(20, Number(query.limit))) : 200;
  const cursor = String(query.cursor || '').trim() || null;
  const scanPages = Number.isFinite(Number(query.scanPages)) ? Math.min(20, Math.max(1, Number(query.scanPages))) : 5;
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

function pruneExpiringMapUsersCache() {
  const now = Date.now();
  for (const [key, entry] of mapUsersCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      mapUsersCache.delete(key);
    }
  }
}

function getCachedMapUsers(key) {
  const entry = mapUsersCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    mapUsersCache.delete(key);
    return null;
  }
  mapUsersCache.delete(key);
  mapUsersCache.set(key, entry);
  return entry.payload;
}

function setCachedMapUsers(key, payload) {
  pruneExpiringMapUsersCache();
  mapUsersCache.delete(key);
  mapUsersCache.set(key, {
    payload,
    expiresAt: Date.now() + MAP_USERS_CACHE_TTL_MS
  });
  if (mapUsersCache.size > MAP_USERS_CACHE_MAX_KEYS) {
    const firstKey = mapUsersCache.keys().next().value;
    if (firstKey) mapUsersCache.delete(firstKey);
  }
}

async function resolveSingleFlight(inFlightMap, key, resolver) {
  const current = inFlightMap.get(key);
  if (current) return current;
  const promise = Promise.resolve()
    .then(resolver)
    .finally(() => inFlightMap.delete(key));
  inFlightMap.set(key, promise);
  return promise;
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

      const result = await resolveSingleFlight(showsInFlight, cacheKey, async () =>
        showService.listShows({
          page,
          limit,
          search,
          city,
          upcomingOnly: true
        })
      );
      const payload = {
        shows: result.items.map((show) => sanitizeShowResponse(show)).filter(Boolean),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total
        }
      };
      showCacheService.setCachedShows(cacheKey, payload);
      res.setHeader('Cache-Control', isProduction ? 'public, max-age=10' : 'no-store');
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: `Erro ao listar shows: ${error.message}` });
    }
  });

  router.get('/api/map-users', async (_req, res) => {
    try {
      const { limit, cursor, scanPages, bbox } = parseMapUsersQuery(_req.query || {});
      const cacheKey = JSON.stringify({
        limit,
        cursor: cursor || '',
        scanPages,
        bbox: bbox ? [bbox.west, bbox.south, bbox.east, bbox.north] : null
      });
      const cachedPayload = getCachedMapUsers(cacheKey);
      if (cachedPayload) {
        res.setHeader('Cache-Control', isProduction ? 'public, max-age=10' : 'no-store');
        return res.json(cachedPayload);
      }

      const payload = await resolveSingleFlight(mapUsersInFlight, cacheKey, async () => {
        const items = [];
        let nextCursor = cursor;
        let scannedPages = 0;
        let hasMore = true;

        while (items.length < limit && scannedPages < scanPages && hasMore) {
          const usersPayload = await userService.listUsersCursor({
            limit: Math.min(200, limit),
            cursor: nextCursor,
            search: ''
          });
          const users = Array.isArray(usersPayload?.items) ? usersPayload.items : [];
          nextCursor = usersPayload?.nextCursor || null;
          hasMore = Boolean(usersPayload?.hasMore && nextCursor);
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

          if (!hasMore) break;
        }

        return {
          users: items,
          pagination: {
            limit,
            nextCursor: hasMore ? String(nextCursor || '') : null,
            hasMore,
            scannedPages
          }
        };
      });

      setCachedMapUsers(cacheKey, payload);
      res.setHeader('Cache-Control', isProduction ? 'public, max-age=30' : 'no-store');
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: `Erro ao listar usuarios do mapa: ${error.message}` });
    }
  });

  return router;
}
