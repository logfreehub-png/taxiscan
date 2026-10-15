import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./config";

const ACCESS_KEY = "tn_access";
const REFRESH_KEY = "tn_refresh";

// Token xotirada ham saqlanadi — har so'rovda AsyncStorage o'qimaslik uchun
let accessTokenCache: string | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (accessTokenCache) return accessTokenCache;
  accessTokenCache = await AsyncStorage.getItem(ACCESS_KEY);
  return accessTokenCache;
}

export async function setTokens(access: string, refresh?: string) {
  accessTokenCache = access;
  await AsyncStorage.setItem(ACCESS_KEY, access);
  if (refresh) await AsyncStorage.setItem(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  accessTokenCache = null;
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
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

interface Options {
  method?: string;
  body?: any;
  auth?: boolean;
  headers?: Record<string, string>;
}

export async function api<T = any>(path: string, options: Options = {}): Promise<T> {
  const { auth = true, headers = {}, method = "GET", body } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (auth) {
    const token = await getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    // Tarmoq xatosi (backend o'chiq yoki IP noto'g'ri)
    throw new ApiError(0, { detail: "Serverga ulanib bo'lmadi. Backend ishga tushganini tekshiring." });
  }

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const apiGet = <T = any>(path: string, opts?: Options) =>
  api<T>(path, { ...opts, method: "GET" });

export const apiPost = <T = any>(path: string, body?: any, opts?: Options) =>
  api<T>(path, { ...opts, method: "POST", body });

export const apiPatch = <T = any>(path: string, body?: any, opts?: Options) =>
  api<T>(path, { ...opts, method: "PATCH", body });

export const apiDelete = <T = any>(path: string, opts?: Options) =>
  api<T>(path, { ...opts, method: "DELETE" });

/** Multipart (FormData) yuborish — masalan avatar rasm. Content-Type ni o'rnatmaymiz. */
export async function apiUpload<T = any>(
  path: string,
  form: FormData,
  method: "POST" | "PATCH" = "PATCH"
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: form });
  } catch {
    throw new ApiError(0, { detail: "Serverga ulanib bo'lmadi." });
  }

  let data: any = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
