const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRegisterInput(body = {}) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || '');

  if (!name || !email || !password || !confirmPassword) {
    return { error: 'Campos obrigatorios ausentes.' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: 'E-mail invalido.' };
  }
  if (password.length < 6) {
    return { error: 'Senha deve ter pelo menos 6 caracteres.' };
  }
  if (password !== confirmPassword) {
    return { error: 'Confirmacao de senha invalida.' };
  }

  return { name, email, password };
}

export function parseLoginInput(body = {}) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) {
    return { error: 'E-mail e senha sao obrigatorios.' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: 'E-mail invalido.' };
  }
  return { email, password };
}

export function parseForgotPasswordInput(body = {}) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return { error: 'Informe o e-mail.' };
  if (!EMAIL_REGEX.test(email)) return { error: 'E-mail invalido.' };
  return { email };
}

export function parseResetPasswordInput(body = {}) {
  const token = String(body.token || '').trim();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || '');

  if (!token || !password || !confirmPassword) {
    return { error: 'Campos obrigatorios ausentes.' };
  }
  if (password.length < 6) {
    return { error: 'Senha deve ter pelo menos 6 caracteres.' };
  }
  if (password !== confirmPassword) {
    return { error: 'Confirmacao de senha invalida.' };
  }
  return { token, password };
}

export function parseChangePasswordInput(body = {}) {
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  const confirmPassword = String(body.confirmPassword || '');

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'Campos obrigatorios ausentes.' };
  }
  if (newPassword.length < 8) {
    return { error: 'Nova senha deve ter pelo menos 8 caracteres.' };
  }
  if (newPassword !== confirmPassword) {
    return { error: 'Confirmacao de senha invalida.' };
  }
  if (newPassword === currentPassword) {
    return { error: 'Nova senha deve ser diferente da atual.' };
  }

  return { currentPassword, newPassword };
}

export function parseAccountSettingsInput(body = {}) {
  const city = String(body.city || '').trim();
  const bio = String(body.bio || '');
  const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl : null;
  const locationEnabled = body.locationEnabled !== false;
  const showMusicHistory = body.showMusicHistory !== false;
  const cityCenterLat = Number(body.cityCenterLat);
  const cityCenterLng = Number(body.cityCenterLng);

  if (city.length < 2) return { error: 'Cidade deve ter no minimo 2 caracteres.' };
  if (bio.length > 160) return { error: 'Bio deve ter no maximo 160 caracteres.' };
  if (avatarUrl && avatarUrl.length > 6_000_000) {
    return { error: 'Imagem de perfil muito grande.' };
  }

  return {
    city,
    bio,
    avatarUrl,
    locationEnabled,
    showMusicHistory,
    cityCenterLat: Number.isFinite(cityCenterLat) ? cityCenterLat : null,
    cityCenterLng: Number.isFinite(cityCenterLng) ? cityCenterLng : null
  };
}

export function parseTrendingPlaybackInput(body = {}) {
  const isPlaying = body.isPlaying !== false;
  if (!isPlaying) return { isPlaying: false };

  const artistName = String(body.artistName || '').trim();
  const trackName = String(body.trackName || '').trim();
  if (!artistName || !trackName) {
    return { error: 'artistName e trackName sao obrigatorios.' };
  }

  return {
    isPlaying: true,
    artistId: body.artistId || null,
    artistName,
    trackId: body.trackId || null,
    trackName,
    timestamp: body.timestamp || new Date().toISOString()
  };
}

export function parseAdminUserInput(body = {}) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = body.role;

  if (!name || !email || !password) {
    return { error: 'Nome, e-mail e senha sao obrigatorios.' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: 'E-mail invalido.' };
  }
  if (password.length < 6) {
    return { error: 'Senha deve ter pelo menos 6 caracteres.' };
  }

  return { name, email, password, role };
}

export function parseAdminUserPatchInput(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' ? body.role : undefined;
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name || !email) {
    return { error: 'Nome e e-mail sao obrigatorios.' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: 'E-mail invalido.' };
  }
  if (password && password.length < 6) {
    return { error: 'Senha deve ter pelo menos 6 caracteres.' };
  }

  return { name, email, role, password };
}
