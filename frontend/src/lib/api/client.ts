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

  if (!res.ok) throw new ApiError(res.status, body);
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
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
