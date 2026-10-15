import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@/lib/api/types";
import { apiGet, apiPost, setTokens, clearTokens } from "@/lib/api/client";

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
  login: (phone: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
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
      if (err?.status === 401 || err?.status === 403) {
        set({ user: null });
        await clearTokens();
        await persistUser(null);
      }
      throw err;
    }
  },

  login: async (phone, password) => {
    const r = await apiPost<{ access: string; refresh: string }>(
      "/auth/login/",
      { phone, password },
      { auth: false }
    );
    await setTokens(r.access, r.refresh);
    const me = await apiGet<User>("/auth/me/");
    set({ user: me });
    await persistUser(me);
    return me;
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
    await clearTokens();
    set({ user: null });
    await persistUser(null);
  },
}));
