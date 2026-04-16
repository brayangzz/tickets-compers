const APP_LOCAL_STORAGE_KEYS = ["token", "user", "rolesMap", "isAuthenticated"];
const APP_SESSION_STORAGE_PREFIXES = ["app_", "calendar_", "compers_"];

const parseJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const readStorageJson = <T>(
  storage: Storage,
  key: string,
  fallback: T,
): T => {
  const rawValue = storage.getItem(key);
  if (rawValue === null) return fallback;

  const parsed = parseJson<T>(rawValue);
  if (parsed === null) {
    storage.removeItem(key);
    return fallback;
  }

  return parsed;
};

export const safeParse = <T>(value: string | null, fallback: T): T => {
  if (value === null) return fallback;
  const parsed = parseJson<T>(value);
  return parsed === null ? fallback : parsed;
};

export const getLocalStorageJSON = <T>(key: string, fallback: T): T =>
  readStorageJson(localStorage, key, fallback);

export const getSessionStorageJSON = <T>(key: string, fallback: T): T =>
  readStorageJson(sessionStorage, key, fallback);

export const clearAppSessionData = () => {
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (!key) continue;

    if (APP_SESSION_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      sessionStorage.removeItem(key);
    }
  }
};

export const clearAuthStoragePreserveTheme = () => {
  const theme = localStorage.getItem("theme");

  APP_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  clearAppSessionData();

  if (theme) {
    localStorage.setItem("theme", theme);
  } else {
    localStorage.removeItem("theme");
  }
};
