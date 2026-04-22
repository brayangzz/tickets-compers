import { clearAuthStoragePreserveTheme, getLocalStorageJSON } from "./storage";

type UnknownRecord = Record<string, unknown>;

export type AuthUser = UnknownRecord & {
  sUser?: string;
  employeeName?: string;
  iIdRol?: number | string;
  ildRol?: number | string;
  idRole?: number | string;
  roleId?: number | string;
  iIdUser?: number | string;
  ildUser?: number | string;
  idUser?: number | string;
};

const AUTH_STORAGE_KEYS = ["token", "user", "rolesMap", "isAuthenticated"] as const;
const INVALID_TOKEN_VALUES = new Set(["", "undefined", "null"]);

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeToken = (token: unknown): string | null => {
  if (typeof token !== "string") return null;
  const normalized = token.trim();
  if (INVALID_TOKEN_VALUES.has(normalized.toLowerCase())) return null;
  return normalized;
};

const hasAnyStoredAuthData = () =>
  AUTH_STORAGE_KEYS.some((key) => localStorage.getItem(key) !== null);

export const getUserRoleId = (user: Partial<AuthUser> | null | undefined): number => {
  if (!user) return 0;
  return (
    toNumber(user.iIdRol) ??
    toNumber(user.ildRol) ??
    toNumber(user.idRole) ??
    toNumber(user.roleId) ??
    0
  );
};

export const getUserId = (user: Partial<AuthUser> | null | undefined): number => {
  if (!user) return 0;
  return toNumber(user.iIdUser) ?? toNumber(user.ildUser) ?? toNumber(user.idUser) ?? 0;
};

export const normalizeAuthUser = <T extends AuthUser>(user: T): T => {
  const roleId = getUserRoleId(user);
  const userId = getUserId(user);

  const normalized: AuthUser = { ...user };

  if (roleId > 0) {
    normalized.iIdRol = roleId;
    normalized.ildRol = roleId;
    normalized.idRole = roleId;
    normalized.roleId = roleId;
  }

  if (userId > 0) {
    normalized.iIdUser = userId;
    normalized.ildUser = userId;
    normalized.idUser = userId;
  }

  return normalized as T;
};

export const getStoredToken = (): string | null =>
  sanitizeToken(localStorage.getItem("token"));

export const getStoredUser = <T extends AuthUser = AuthUser>(): T | null => {
  const parsedUser = getLocalStorageJSON<unknown>("user", null);
  if (!isRecord(parsedUser)) return null;
  return normalizeAuthUser(parsedUser as T);
};

export const readStoredSession = (): {
  token: string | null;
  user: AuthUser | null;
  isValid: boolean;
} => {
  const token = getStoredToken();
  const user = getStoredUser();
  const isValid = Boolean(token && user);

  if (!isValid) {
    if (hasAnyStoredAuthData()) {
      clearAuthStoragePreserveTheme();
    }
    return { token: null, user: null, isValid: false };
  }

  localStorage.setItem("user", JSON.stringify(user));
  return { token, user, isValid: true };
};

export const normalizeLoginResponse = (rawData: unknown): (AuthUser & { sToken: string }) => {
  const root = isRecord(rawData) ? rawData : {};
  const rootResult = isRecord(root.result) ? root.result : null;
  const rootData = isRecord(root.data) ? root.data : null;
  const resultData = rootResult && isRecord(rootResult.data) ? rootResult.data : null;

  const candidates = [rootResult, resultData, rootData, root];
  let selected: UnknownRecord | null = null;
  let token: string | null = null;

  for (const candidate of candidates) {
    if (!candidate) continue;
    token = sanitizeToken(candidate.sToken ?? candidate.token ?? candidate.accessToken);
    if (token) {
      selected = candidate;
      break;
    }
  }

  if (!selected || !token) {
    throw new Error("Respuesta de login inválida: no se encontró token de sesión.");
  }
  const selectedData = isRecord(selected.data) ? selected.data : null;
  const mergedUser = {
    ...(selectedData || {}),
    ...selected,
  } as AuthUser;

  return {
    ...(normalizeAuthUser(mergedUser)),
    sToken: token,
  };
};
