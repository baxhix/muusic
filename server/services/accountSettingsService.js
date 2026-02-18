import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'account-settings.json');

const DEFAULT_SETTINGS = {
  city: 'Sao Paulo',
  bio: '',
  locationEnabled: true,
  showMusicHistory: true,
  cityCenterLat: null,
  cityCenterLng: null
};

function normalizeSettings(settings = {}) {
  const cityCenterLat = Number(settings.cityCenterLat);
  const cityCenterLng = Number(settings.cityCenterLng);
  return {
    city: String(settings.city || DEFAULT_SETTINGS.city).trim() || DEFAULT_SETTINGS.city,
    bio: String(settings.bio || '').slice(0, 160),
    locationEnabled: settings.locationEnabled !== false,
    showMusicHistory: settings.showMusicHistory !== false,
    cityCenterLat: Number.isFinite(cityCenterLat) ? cityCenterLat : null,
    cityCenterLng: Number.isFinite(cityCenterLng) ? cityCenterLng : null
  };
}

function hashString(value) {
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const CITY_COORDS = {
  'Sao Paulo': { lat: -23.5505, lng: -46.6333, radius: 0.18 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729, radius: 0.16 },
  Londrina: { lat: -23.3045, lng: -51.1696, radius: 0.12 },
  Curitiba: { lat: -25.4296, lng: -49.2719, radius: 0.14 },
  'Belo Horizonte': { lat: -19.9167, lng: -43.9345, radius: 0.14 },
  Goiania: { lat: -16.6869, lng: -49.2648, radius: 0.12 },
  Brasilia: { lat: -15.7939, lng: -47.8828, radius: 0.14 },
  Recife: { lat: -8.0476, lng: -34.877, radius: 0.12 },
  Salvador: { lat: -12.9777, lng: -38.5016, radius: 0.14 },
  Fortaleza: { lat: -3.7319, lng: -38.5267, radius: 0.12 },
  Manaus: { lat: -3.119, lng: -60.0217, radius: 0.12 },
  'Porto Alegre': { lat: -30.0346, lng: -51.2177, radius: 0.14 },
  Campinas: { lat: -22.9099, lng: -47.0626, radius: 0.1 }
};

function getCityAnchor(city) {
  if (!city) return CITY_COORDS['Sao Paulo'];
  const clean = String(city).trim();
  if (CITY_COORDS[clean]) return CITY_COORDS[clean];
  const ascii = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return CITY_COORDS[ascii] || CITY_COORDS['Sao Paulo'];
}

class AccountSettingsService {
  async readAll() {
    try {
      const raw = await fs.readFile(SETTINGS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      throw error;
    }
  }

  async writeAll(payload) {
    await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(payload, null, 2), 'utf8');
  }

  async getByUserId(userId) {
    const all = await this.readAll();
    return normalizeSettings(all[userId] || {});
  }

  async updateByUserId(userId, patch = {}) {
    const all = await this.readAll();
    const current = normalizeSettings(all[userId] || {});
    const next = normalizeSettings({ ...current, ...patch });
    all[userId] = next;
    await this.writeAll(all);
    return next;
  }

  async getManyByUserIds(userIds = []) {
    const all = await this.readAll();
    const out = new Map();
    userIds.forEach((userId) => {
      out.set(userId, normalizeSettings(all[userId] || {}));
    });
    return out;
  }

  buildRandomLocation(userId, city, cityCenterLat = null, cityCenterLng = null) {
    const hasCustomCenter = Number.isFinite(Number(cityCenterLat)) && Number.isFinite(Number(cityCenterLng));
    const anchor = hasCustomCenter
      ? { lat: Number(cityCenterLat), lng: Number(cityCenterLng), radius: 0.12 }
      : getCityAnchor(city);
    const seed = hashString(`${userId}:${city}`);
    const angle = (seed % 360) * (Math.PI / 180);
    const distanceFactor = ((seed % 1000) / 1000) * anchor.radius;
    const lat = anchor.lat + Math.sin(angle) * distanceFactor;
    const lng = anchor.lng + Math.cos(angle) * distanceFactor;
    return {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    };
  }
}

const accountSettingsService = new AccountSettingsService();
export default accountSettingsService;
