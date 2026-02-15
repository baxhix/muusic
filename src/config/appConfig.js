export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const defaultApiUrl = import.meta.env.DEV ? 'http://localhost:3001' : runtimeOrigin;
export const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;
export const ENABLE_REALTIME = import.meta.env.VITE_ENABLE_REALTIME === 'true';

export const FALLBACK_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors'
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
};
