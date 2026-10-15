import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/api/types";
import { apiGet, apiPost, setTokens, clearTokens } from "@/lib/api/client";

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
  loading: boolean;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  /** Persist rehydratsiyasi tugagach chaqiriladi — set() orqali, to'g'ri re-render beradi */
  setHydrated: () => void;
  loadMe: () => Promise<void>;
  login: (phone: string, password: string) => Promise<User>;
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
          if (err?.status === 401 || err?.status === 403) {
            set({ user: null });
            clearTokens();
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
        setTokens(r.access, r.refresh);
        const me = await apiGet<User>("/auth/me/");
        set({ user: me });
        return me;
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
