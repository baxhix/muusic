export const STORAGE_USERS_KEY = 'muusic_users';
export const STORAGE_SESSION_KEY = 'muusic_session';
export const STORAGE_MAP_VISIBILITY_KEY = 'muusic_map_visibility';

export function readStoredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

export function readSessionUser() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readMapVisibility() {
  try {
    const raw = localStorage.getItem(STORAGE_MAP_VISIBILITY_KEY);
    if (!raw) return { users: true, shows: true };
    const parsed = JSON.parse(raw);
    return {
      users: parsed?.users !== false,
      shows: parsed?.shows !== false
    };
  } catch {
    return { users: true, shows: true };
  }
}

export function saveMapVisibility(visibility) {
  localStorage.setItem(
    STORAGE_MAP_VISIBILITY_KEY,
    JSON.stringify({
      users: visibility?.users !== false,
      shows: visibility?.shows !== false
    })
  );
}
