const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api/v1";

const ACCESS_KEY = "tn_access";
const REFRESH_KEY = "tn_refresh";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

/** Real-time bildirishnoma uchun WebSocket manzili (token bilan). */
export function notificationsWsUrl(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const base = API_URL.replace(/\/api\/v1\/?$/, "").replace(/^http/, "ws");
  return `${base}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

export function setTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

const DEVICE_ID_KEY = "tn_device_id";
export const REVOKED_FLAG_KEY = "tn_session_revoked";

/** Brauzerning barqaror qurilma ID'si va nomi (bitta akkaunt — bitta qurilma). */
export function getDeviceInfo(): { id: string; name: string } {
  if (typeof window === "undefined") return { id: "", name: "" };
  let id = "";
  try {
    id = localStorage.getItem(DEVICE_ID_KEY) || "";
    if (!id) {
      id = "w-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
  } catch {
    /* ignore */
  }
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Brauzer";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return { id, name: `${browser}${os ? " · " + os : ""} (web)` };
}

/**
 * Akkauntga boshqa qurilmadan kirilgan — token bekor qilingan.
 * Tokenni tozalab, login sahifasiga sabab bilan yuboramiz.
 */
function handleRevoked(status: number, data: any) {
  if (typeof window === "undefined") return;
  if (status !== 401 || !data || typeof data !== "object" || data.code !== "session_revoked") return;
  clearTokens();
  try {
    localStorage.removeItem("tn-auth");
    sessionStorage.setItem(REVOKED_FLAG_KEY, data.detail || "Akkauntingizga boshqa qurilmadan kirildi.");
  } catch {
    /* ignore */
  }
  if (!window.location.pathname.startsWith("/login")) window.location.href = "/login?revoked=1";
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any) {
    super(typeof data === "string" ? data : data?.detail || `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

export async function api<T = any>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers = {}, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, { ...rest, headers: finalHeaders });

  let body: any = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  if (!res.ok) {
    if (auth) handleRevoked(res.status, body);
    throw new ApiError(res.status, body);
  }
  return body as T;
}

// Convenience helpers
export const apiGet = <T = any>(path: string, options?: RequestInit & { auth?: boolean }) =>
  api<T>(path, { ...options, method: "GET" });

export const apiPost = <T = any>(path: string, data?: any, options?: RequestInit & { auth?: boolean }) =>
  api<T>(path, { ...options, method: "POST", body: data ? JSON.stringify(data) : undefined });

export const apiPatch = <T = any>(path: string, data?: any, options?: RequestInit & { auth?: boolean }) =>
  api<T>(path, { ...options, method: "PATCH", body: data ? JSON.stringify(data) : undefined });

export const apiDelete = <T = any>(path: string, options?: RequestInit & { auth?: boolean }) =>
  api<T>(path, { ...options, method: "DELETE" });

/** Multipart/form-data uchun (rasm yuklash). Content-Type avtomatik beriladi. */
export async function apiUpload<T = any>(
  path: string,
  formData: FormData,
  method: "POST" | "PATCH" | "PUT" = "PATCH"
): Promise<T> {
  const token = getAccessToken();
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    method,
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  let body: any = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!res.ok) {
    handleRevoked(res.status, body);
    throw new ApiError(res.status, body);
  }
  return body as T;
}
