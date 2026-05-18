export type AppRole = "ADMIN" | "OPERATOR" | "USER";

export interface StoredAuthCredentials {
  username: string;
  token: string;
}

const AUTH_STORAGE_KEY = "asset-guardian.auth";
const PORTAL_AUTH_STORAGE_KEY = "cart-rio-auth";
const PORTAL_USER_STORAGE_KEY = "cart-rio-user";
const PORTAL_AUTH_COOKIE = "cart_rio_auth";

export const buildBasicToken = (username: string, password: string) =>
  `Basic ${btoa(`${username}:${password}`)}`;

export const getStoredAuth = (): StoredAuthCredentials | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const portalCookieToken = getCookie(PORTAL_AUTH_COOKIE);
  if (portalCookieToken) {
    return { username: "portal", token: portalCookieToken };
  }

  const portalRaw = window.localStorage.getItem(PORTAL_AUTH_STORAGE_KEY);
  if (portalRaw) {
    try {
      return JSON.parse(portalRaw) as StoredAuthCredentials;
    } catch {
      window.localStorage.removeItem(PORTAL_AUTH_STORAGE_KEY);
    }
  }

  const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthCredentials;
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const setStoredAuth = (value: StoredAuthCredentials) => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
  }
};

export const clearStoredAuth = () => {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(PORTAL_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(PORTAL_USER_STORAGE_KEY);
    document.cookie = `${PORTAL_AUTH_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
  }
};

export const getCurrentUsername = () => getStoredAuth()?.username || null;

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const value = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}
