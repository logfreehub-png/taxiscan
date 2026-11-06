import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/api/types";
import { apiGet, apiPost, setTokens, clearTokens, getDeviceInfo } from "@/lib/api/client";

interface RegisterData {
  phone: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  role: "driver" | "passenger";
  city?: string;
}

export interface ForceLoginSession {
  session_id: string;
  phone: string;
  sent: boolean;
  bot_url: string;
  bot_username: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  /** Persist rehydratsiyasi tugagach chaqiriladi — set() orqali, to'g'ri re-render beradi */
  setHydrated: () => void;
  loadMe: () => Promise<void>;
  /** Boshqa qurilmada aktiv sessiya bo'lsa 409 (code=other_device) ApiError tashlanadi */
  login: (phone: string, password: string) => Promise<User>;
  forceLoginRequest: (phone: string, password: string) => Promise<ForceLoginSession>;
  /** Kod bilan tasdiqlab kirish — eski qurilma chiqariladi. User'ni setUser bilan o'rnating. */
  forceLoginConfirm: (phone: string, password: string, sessionId: string, code: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      hydrated: false,

      setUser: (user) => set({ user }),

      setHydrated: () => set({ hydrated: true }),

      loadMe: async () => {
        set({ loading: true });
        try {
          const me = await apiGet<User>("/auth/me/");
          set({ user: me, loading: false });
        } catch (err: any) {
          set({ loading: false });
          // Faqat 401/403 da token va user tozalanadi (muddati o'tgan yoki noto'g'ri)
          // Tarmoq xatosida (backend o'chiq) — user va token saqlanadi
          if (err?.status === 401) {
            set({ user: null });
            clearTokens();
          }
          throw err;
        }
      },

      login: async (phone, password) => {
        const dev = getDeviceInfo();
        const r = await apiPost<{ access: string; refresh: string }>(
          "/auth/login/",
          { phone, password, device_id: dev.id, device_name: dev.name },
          { auth: false }
        );
        setTokens(r.access, r.refresh);
        const me = await apiGet<User>("/auth/me/");
        set({ user: me });
        return me;
      },

      forceLoginRequest: (phone, password) =>
        apiPost<ForceLoginSession>("/auth/login/force/request/", { phone, password }, { auth: false }),

      forceLoginConfirm: async (phone, password, sessionId, code) => {
        const dev = getDeviceInfo();
        const r = await apiPost<{ access: string; refresh: string }>(
          "/auth/login/force/confirm/",
          { phone, password, session_id: sessionId, code, device_id: dev.id, device_name: dev.name },
          { auth: false }
        );
        setTokens(r.access, r.refresh);
        return apiGet<User>("/auth/me/");
      },

      register: async (data) => {
        const r = await apiPost<{ user: User; access: string; refresh: string }>(
          "/auth/register/",
          data,
          { auth: false }
        );
        setTokens(r.access, r.refresh);
        set({ user: r.user });
        return r.user;
      },

      logout: () => {
        // Serverda shu qurilma sessiyasini yopamiz (javobini kutmaymiz)
        apiPost("/auth/logout/", {}).catch(() => {});
        clearTokens();
        set({ user: null });
      },
    }),
    {
      name: "tn-auth",
      // Faqat user saqlanadi (token alohida localStorage'da)
      partialize: (s) => ({ user: s.user }),
      // onRehydrateStorage: state?.setHydrated() — set() orqali ishlaydi, re-render to'g'ri
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
