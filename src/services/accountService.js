const STORAGE_KEY = 'accountSettings';

export const DEFAULT_ACCOUNT_SETTINGS = {
  city: 'Sao Paulo',
  bio: '',
  locationEnabled: true,
  showMusicHistory: true,
  avatarDataUrl: ''
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

function normalizeSettings(payload) {
  return {
    city: String(payload?.city || DEFAULT_ACCOUNT_SETTINGS.city).trim(),
    bio: String(payload?.bio || '').slice(0, 160),
    locationEnabled: payload?.locationEnabled !== false,
    showMusicHistory: payload?.showMusicHistory !== false,
    avatarDataUrl: String(payload?.avatarDataUrl || '')
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
  async get() {
    const saved = readRaw();
    return normalizeSettings({ ...DEFAULT_ACCOUNT_SETTINGS, ...saved });
  },

  async updateProfile(input) {
    validateProfileInput(input);
    const next = normalizeSettings({ ...readRaw(), ...input });
    writeRaw(next);
    return next;
  },

  async updatePreferences(input) {
    const next = normalizeSettings({ ...readRaw(), ...input });
    writeRaw(next);
    return next;
  },

  async changePassword(input) {
    validatePasswordInput(input);
    return { ok: true };
  }
};
