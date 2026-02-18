import { API_URL } from '../config/appConfig';

const STORAGE_KEY = 'accountSettings';

export const DEFAULT_ACCOUNT_SETTINGS = {
  city: 'Sao Paulo',
  bio: '',
  locationEnabled: true,
  showMusicHistory: true,
  avatarDataUrl: '',
  cityCenterLat: null,
  cityCenterLng: null
};

/**
 * @typedef {Object} AccountSettingsDTO
 * @property {string} city
 * @property {string} bio
 * @property {boolean} locationEnabled
 * @property {boolean} showMusicHistory
 * @property {string} avatarDataUrl
 */

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeRaw(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function buildAuthHeaders(auth) {
  if (!auth?.token) return {};
  return {
    Authorization: `Bearer ${auth.token}`,
    'x-session-id': auth.sessionId || ''
  };
}

function normalizeSettings(payload) {
  return {
    city: String(payload?.city || DEFAULT_ACCOUNT_SETTINGS.city).trim(),
    bio: String(payload?.bio || '').slice(0, 160),
    locationEnabled: payload?.locationEnabled !== false,
    showMusicHistory: payload?.showMusicHistory !== false,
    avatarDataUrl: String(payload?.avatarDataUrl || ''),
    cityCenterLat: Number.isFinite(Number(payload?.cityCenterLat)) ? Number(payload.cityCenterLat) : null,
    cityCenterLng: Number.isFinite(Number(payload?.cityCenterLng)) ? Number(payload.cityCenterLng) : null
  };
}

function validateProfileInput(input) {
  const city = String(input?.city || '').trim();
  const bio = String(input?.bio || '');
  if (city.length < 2) throw new Error('Cidade deve ter no minimo 2 caracteres.');
  if (bio.length > 160) throw new Error('Bio deve ter no maximo 160 caracteres.');
}

function validatePasswordInput(input) {
  const currentPassword = String(input?.currentPassword || '');
  const newPassword = String(input?.newPassword || '');
  const confirmPassword = String(input?.confirmPassword || '');

  if (!currentPassword) throw new Error('Informe a senha atual.');
  if (newPassword.length < 8) throw new Error('Nova senha deve ter no minimo 8 caracteres.');
  if (newPassword !== confirmPassword) throw new Error('Confirmacao de senha diferente da nova senha.');
}

export const accountService = {
  async get(auth) {
    const saved = normalizeSettings({ ...DEFAULT_ACCOUNT_SETTINGS, ...readRaw() });
    if (!auth?.token) return saved;
    try {
      const response = await fetch(`${API_URL}/auth/local/account-settings`, {
        headers: {
          ...buildAuthHeaders(auth)
        }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Falha ao carregar conta.');
      const merged = normalizeSettings({
        ...saved,
        ...(payload?.settings || {}),
        avatarDataUrl: payload?.avatarUrl || saved.avatarDataUrl || ''
      });
      writeRaw(merged);
      return merged;
    } catch {
      return saved;
    }
  },

  async updateProfile(input, auth) {
    validateProfileInput(input);
    const next = normalizeSettings({ ...readRaw(), ...input });
    if (auth?.token) {
      const response = await fetch(`${API_URL}/auth/local/account-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(auth)
        },
        body: JSON.stringify({
          city: next.city,
          bio: next.bio,
          locationEnabled: next.locationEnabled,
          showMusicHistory: next.showMusicHistory,
          avatarUrl: next.avatarDataUrl || null,
          cityCenterLat: next.cityCenterLat,
          cityCenterLng: next.cityCenterLng
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Falha ao salvar perfil.');
      const serverNext = normalizeSettings({
        ...next,
        ...(payload?.settings || {}),
        avatarDataUrl: payload?.avatarUrl || ''
      });
      writeRaw(serverNext);
      return serverNext;
    }
    writeRaw(next);
    return next;
  },

  async updatePreferences(input, auth) {
    const next = normalizeSettings({ ...readRaw(), ...input });
    if (auth?.token) {
      const response = await fetch(`${API_URL}/auth/local/account-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(auth)
        },
        body: JSON.stringify({
          city: next.city,
          bio: next.bio,
          locationEnabled: next.locationEnabled,
          showMusicHistory: next.showMusicHistory,
          avatarUrl: next.avatarDataUrl || null,
          cityCenterLat: next.cityCenterLat,
          cityCenterLng: next.cityCenterLng
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Falha ao salvar preferencias.');
      const serverNext = normalizeSettings({
        ...next,
        ...(payload?.settings || {}),
        avatarDataUrl: payload?.avatarUrl || ''
      });
      writeRaw(serverNext);
      return serverNext;
    }
    writeRaw(next);
    return next;
  },

  async changePassword(input, auth) {
    validatePasswordInput(input);
    if (!auth?.token) throw new Error('Sessao invalida para alterar senha.');

    const response = await fetch(`${API_URL}/auth/local/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(auth)
      },
      body: JSON.stringify({
        currentPassword: String(input.currentPassword || ''),
        newPassword: String(input.newPassword || ''),
        confirmPassword: String(input.confirmPassword || '')
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'Falha ao alterar senha.');
    return { ok: true };
  }
};
