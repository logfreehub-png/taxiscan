import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@/lib/api/types";
import { apiGet, apiPost, setTokens, clearTokens, getAccessToken } from "@/lib/api/client";
import { getDeviceInfo } from "@/lib/device";

const USER_KEY = "tn_user";
const ONBOARDED_KEY = "tn_onboarded";

interface RegisterData {
  phone: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  role: "driver" | "passenger";
  city?: string;
  session_id?: string;
}

interface AuthState {
  user: User | null;
  hydrated: boolean;
  /** Tanishtiruv (onboarding) ko'rilganmi */
  onboarded: boolean;
  /** Ilova ochilganda chaqiriladi — saqlangan user va tokenni tiklaydi */
  bootstrap: () => Promise<void>;
  loadMe: () => Promise<void>;
  setUser: (u: User | null) => void;
  completeOnboarding: () => Promise<void>;
  /** 409 code=other_device bo'lsa ApiError tashlanadi (boshqa qurilmada aktiv sessiya) */
  login: (phone: string, password: string) => Promise<User>;
  /** Eski qurilmani chiqarish uchun Telegramga kod yuborish */
  forceLoginRequest: (phone: string, password: string) => Promise<ForceLoginSession>;
  /** Kodni tasdiqlab kirish — eski qurilma chiqariladi (user'ni setUser bilan o'zingiz o'rnatasiz) */
  forceLoginConfirm: (phone: string, password: string, sessionId: string, code: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
}

export interface ForceLoginSession {
  session_id: string;
  phone: string;
  sent: boolean;
  bot_url: string;
  bot_username: string;
}

async function persistUser(u: User | null) {
  if (u) await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
  else await AsyncStorage.removeItem(USER_KEY);
}

export const useAuth = create<AuthState>()((set, get) => ({
  user: null,
  hydrated: false,
  onboarded: false,

  bootstrap: async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      if (raw) set({ user: JSON.parse(raw) });
      const ob = await AsyncStorage.getItem(ONBOARDED_KEY);
      if (ob === "1") set({ onboarded: true });
    } catch {
      /* ignore */
    } finally {
      set({ hydrated: true });
    }
    // Fon rejimida profilni yangilab olamiz (token bo'lsa)
    if (!(await getAccessToken())) {
      if (get().user) {
        set({ user: null });
        await persistUser(null);
      }
      return;
    }
    get()
      .loadMe()
      .catch(() => {});
  },

  setUser: (u) => {
    set({ user: u });
    persistUser(u);
  },

  completeOnboarding: async () => {
    set({ onboarded: true });
    await AsyncStorage.setItem(ONBOARDED_KEY, "1");
  },

  loadMe: async () => {
    try {
      const me = await apiGet<User>("/auth/me/");
      set({ user: me });
      persistUser(me);
    } catch (err: any) {
      // Faqat token haqiqatan yaroqsiz bo'lsa (401) chiqaramiz — 403/tarmoq xatosida sessiya saqlanadi
      if (err?.status === 401) {
        set({ user: null });
        await clearTokens();
        await persistUser(null);
      }
      throw err;
    }
  },

  login: async (phone, password) => {
    const dev = await getDeviceInfo();
    const r = await apiPost<{ access: string; refresh: string }>(
      "/auth/login/",
      { phone, password, device_id: dev.id, device_name: dev.name },
      { auth: false }
    );
    await setTokens(r.access, r.refresh);
    const me = await apiGet<User>("/auth/me/");
    set({ user: me });
    await persistUser(me);
    return me;
  },

  forceLoginRequest: async (phone, password) => {
    return apiPost<ForceLoginSession>("/auth/login/force/request/", { phone, password }, { auth: false });
  },

  forceLoginConfirm: async (phone, password, sessionId, code) => {
    const dev = await getDeviceInfo();
    const r = await apiPost<{ access: string; refresh: string }>(
      "/auth/login/force/confirm/",
      { phone, password, session_id: sessionId, code, device_id: dev.id, device_name: dev.name },
      { auth: false }
    );
    await setTokens(r.access, r.refresh);
    // User store'ga hali yozilmaydi — "Qurilma chiqarib yuborildi" oynasi ko'rsatilgach
    // chaqiruvchi setUser() qiladi (aks holda auth layout darhol yo'naltirib yuboradi)
    return apiGet<User>("/auth/me/");
  },

  register: async (data) => {
    const r = await apiPost<{ user: User; access: string; refresh: string }>(
      "/auth/register/",
      data,
      { auth: false }
    );
    await setTokens(r.access, r.refresh);
    set({ user: r.user });
    await persistUser(r.user);
    return r.user;
  },

  logout: async () => {
    // Serverda shu qurilma sessiyasini yopamiz (xato bo'lsa ham lokal chiqamiz)
    try {
      await apiPost("/auth/logout/", {});
    } catch {
      /* ignore */
    }
    await clearTokens();
    set({ user: null });
    await persistUser(null);
  },
}));
