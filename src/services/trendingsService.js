import { API_URL } from '../config/appConfig';

function buildAuthHeaders(authUser) {
  if (!authUser?.token) return null;
  return {
    Authorization: `Bearer ${authUser.token}`,
    'x-session-id': authUser.sessionId || ''
  };
}

export const trendingsService = {
  async recordPlayback({ authUser, playback }) {
    const headers = buildAuthHeaders(authUser);
    if (!headers) return { recorded: false, reason: 'missing-auth' };

    const response = await fetch(`${API_URL}/api/trendings/playback`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        artistId: playback?.artistId || null,
        artistName: playback?.artistName || playback?.artists || 'Artista desconhecido',
        trackId: playback?.trackId || null,
        trackName: playback?.trackName || 'Musica desconhecida',
        timestamp: playback?.timestamp || new Date().toISOString(),
        isPlaying: playback?.isPlaying !== false
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Falha ao registrar reproducao em trendings.');
    }

    return {
      recorded: Boolean(payload.recorded),
      reason: payload.reason || null
    };
  },

  async getSnapshot({ apiFetch, days = 7, limit = 20 } = {}) {
    const fallbackRegions = [
      { id: 'region-sao-paulo', name: 'São Paulo', count: 120, percent: 28.1 },
      { id: 'region-rio', name: 'Rio de Janeiro', count: 95, percent: 22.3 },
      { id: 'region-goiania', name: 'Goiânia', count: 74, percent: 17.4 },
      { id: 'region-curitiba', name: 'Curitiba', count: 63, percent: 14.8 },
      { id: 'region-londrina', name: 'Londrina', count: 55, percent: 12.9 }
    ];

    if (!apiFetch) {
      return {
        totalPlays: 0,
        artists: [],
        tracks: [],
        topFans: [],
        regions: fallbackRegions,
        updatedAt: null
      };
    }

    const safeDays = Number.isFinite(Number(days)) ? Math.min(90, Math.max(1, Number(days))) : 7;
    const safeLimit = Number.isFinite(Number(limit)) ? Math.min(100, Math.max(1, Number(limit))) : 20;
    const payload = await apiFetch(`/admin/trendings?days=${safeDays}&limit=${safeLimit}`);

    return {
      totalPlays: Number(payload?.totalPlays || 0),
      artists: Array.isArray(payload?.artists) ? payload.artists : [],
      tracks: Array.isArray(payload?.tracks) ? payload.tracks : [],
      topFans: Array.isArray(payload?.topFans) ? payload.topFans : [],
      regions: Array.isArray(payload?.regions) && payload.regions.length ? payload.regions : fallbackRegions,
      updatedAt: payload?.updatedAt || null
    };
  }
};
