import axios from 'axios';
import { createHash } from 'crypto';

const LASTFM_API_ROOT = 'https://ws.audioscrobbler.com/2.0/';

function md5(value) {
  return createHash('md5').update(String(value || ''), 'utf8').digest('hex');
}

function buildApiSig(params, apiSecret) {
  const sorted = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}${value}`)
    .join('');
  return md5(`${sorted}${apiSecret}`);
}

function getImage(images = []) {
  return (
    images.find((item) => item.size === 'extralarge')?.['#text'] ||
    images.find((item) => item.size === 'large')?.['#text'] ||
    images.find((item) => item.size === 'medium')?.['#text'] ||
    images.find((item) => item.size === 'small')?.['#text'] ||
    null
  );
}

function normalizeRecentTrack(track) {
  if (!track) return null;
  const artistName = String(track.artist?.['#text'] || track.artist?.name || '').trim();
  const trackName = String(track.name || '').trim();
  if (!artistName || !trackName) return null;

  return {
    source: 'lastfm',
    artistId: null,
    artistName,
    artists: artistName,
    trackId: String(track.mbid || '').trim() || null,
    trackName,
    progressMs: 0,
    durationMs: Math.max(0, Number(track.duration || 0) * 1000),
    isPlaying: String(track['@attr']?.nowplaying || '').toLowerCase() === 'true',
    albumImage: getImage(track.image),
    artistImage: null,
    externalUrl: String(track.url || '').trim() || null,
    albumName: String(track.album?.['#text'] || '').trim() || null,
    updatedAt: Date.now()
  };
}

export function createLastFmApiService({ apiKey, apiSecret }) {
  async function call(method, params = {}, { sign = false } = {}) {
    if (!apiKey || !apiSecret) {
      throw new Error('LASTFM_API_KEY e LASTFM_API_SECRET sao obrigatorios.');
    }

    const baseParams = {
      method,
      api_key: apiKey,
      format: 'json',
      ...params
    };

    if (sign) {
      baseParams.api_sig = buildApiSig(baseParams, apiSecret);
    }

    const response = await axios.get(LASTFM_API_ROOT, {
      params: baseParams,
      timeout: 12000
    });
    return response.data;
  }

  async function getSession(token) {
    const payload = await call('auth.getSession', { token }, { sign: true });
    return payload?.session || null;
  }

  async function getUserInfo(username) {
    const payload = await call('user.getInfo', { user: username });
    return payload?.user || null;
  }

  async function getRecentTracks(username, limit = 1) {
    const payload = await call('user.getRecentTracks', {
      user: username,
      limit,
      extended: 0
    });
    const tracks = payload?.recenttracks?.track;
    if (!tracks) return [];
    return Array.isArray(tracks) ? tracks : [tracks];
  }

  async function getNowPlaying(username) {
    const recentTracks = await getRecentTracks(username, 1);
    return normalizeRecentTrack(recentTracks[0] || null);
  }

  return {
    getSession,
    getUserInfo,
    getRecentTracks,
    getNowPlaying
  };
}
