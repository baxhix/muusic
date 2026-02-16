import { getPrisma } from './db.js';

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

class GeolocationService {
  async findNearby(lat, lng, radiusKm = 10) {
    const latitude = toFiniteNumber(lat);
    const longitude = toFiniteNumber(lng);
    const radius = toFiniteNumber(radiusKm);

    if (latitude === null || longitude === null || radius === null) return [];
    const prisma = await getPrisma();
    if (!prisma) return [];

    const safeRadiusMeters = Math.max(0.2, Math.min(radius, 200)) * 1000;
    const query = `
      SELECT
        u.id,
        u.username,
        u."avatarUrl" AS "avatarUrl",
        np."trackName" AS "trackName",
        np."artistName" AS "artistName",
        np."albumImageUrl" AS "albumImageUrl",
        np.latitude,
        np.longitude,
        ST_Distance(
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          ST_SetSRID(ST_MakePoint(np.longitude, np.latitude), 4326)::geography
        ) / 1000 AS distance_km
      FROM "User" u
      INNER JOIN "NowPlaying" np ON u.id = np."userId"
      WHERE
        np."expiresAt" > NOW()
        AND np.latitude IS NOT NULL
        AND np.longitude IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          ST_SetSRID(ST_MakePoint(np.longitude, np.latitude), 4326)::geography,
          $3
        )
      ORDER BY distance_km ASC
      LIMIT 50
    `;

    return prisma.$queryRawUnsafe(query, longitude, latitude, safeRadiusMeters);
  }

  async findInBounds(north, south, east, west) {
    const n = toFiniteNumber(north);
    const s = toFiniteNumber(south);
    const e = toFiniteNumber(east);
    const w = toFiniteNumber(west);
    if ([n, s, e, w].some((value) => value === null)) return [];

    const prisma = await getPrisma();
    if (!prisma) return [];

    const query = `
      SELECT
        u.id,
        u.username,
        u."avatarUrl" AS "avatarUrl",
        np.latitude,
        np.longitude,
        np."trackName" AS "trackName",
        np."artistName" AS "artistName",
        np."albumImageUrl" AS "albumImageUrl"
      FROM "User" u
      INNER JOIN "NowPlaying" np ON u.id = np."userId"
      WHERE
        np."expiresAt" > NOW()
        AND np.latitude BETWEEN $2 AND $1
        AND np.longitude BETWEEN $4 AND $3
      LIMIT 500
    `;

    return prisma.$queryRawUnsafe(query, n, s, e, w);
  }

  async disconnect() {}
}

const geolocationService = new GeolocationService();
export default geolocationService;
