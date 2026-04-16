export const LEGACY_API_BASE_URL =
  "https://tickets-backend-api-gxbkf5enbafxcvb2.francecentral-01.azurewebsites.net/api";

const envApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = envApiBaseUrl
  ? envApiBaseUrl.replace(/\/+$/, "")
  : LEGACY_API_BASE_URL;

export const toApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
