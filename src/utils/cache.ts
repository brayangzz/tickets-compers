import { getSessionStorageJSON } from "./storage";

const shouldPersistCache = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
};

export async function fetchCached<T = unknown>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = getSessionStorageJSON<T | null>(key, null);
  if (cached !== null) return cached;

  const data = await fetcher();

  if (shouldPersistCache(data)) {
    sessionStorage.setItem(key, JSON.stringify(data));
  } else {
    sessionStorage.removeItem(key);
  }

  return data;
}

export async function fetchCachedUrl<T = unknown>(
  key: string,
  url: string,
  headers?: HeadersInit,
): Promise<T> {
  const cached = getSessionStorageJSON<T | null>(key, null);
  if (cached !== null) return cached;

  const response = await fetch(url, { headers });
  let data: T;

  try {
    data = (await response.json()) as T;
  } catch (error) {
    sessionStorage.removeItem(key);
    throw new Error(`Respuesta JSON inválida para ${url}: ${String(error)}`);
  }

  if (!response.ok) {
    sessionStorage.removeItem(key);
    return data;
  }

  if (shouldPersistCache(data)) {
    sessionStorage.setItem(key, JSON.stringify(data));
  } else {
    sessionStorage.removeItem(key);
  }

  return data;
}
