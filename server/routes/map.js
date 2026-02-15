import { Router } from 'express';
import geolocationService from '../services/geolocation.js';
import cacheMiddleware from '../middleware/cache.js';

const router = Router();

router.get('/map/nearby', cacheMiddleware(20), async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    const users = await geolocationService.findNearby(Number(lat), Number(lng), Number(radius));
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: `Falha na busca de proximidade: ${error.message}` });
  }
});

router.get('/map/bounds', cacheMiddleware(10), async (req, res) => {
  try {
    const { north, south, east, west } = req.query;
    const users = await geolocationService.findInBounds(Number(north), Number(south), Number(east), Number(west));
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: `Falha na busca por bounds: ${error.message}` });
  }
});

export default router;
