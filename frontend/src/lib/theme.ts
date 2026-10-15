"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/store/auth";

export type Theme = "light" | "dark" | "auto";

const KEY = "taxinarx_theme";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const isDark =
    t === "dark" ||
    (t === "auto" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function initTheme() {
  if (typeof window === "undefined") return;
  // Foydalanuvchi tanlamagan bo'lsa — admin sozlagan standart rejim (tn_default_theme)
  const t =
    (localStorage.getItem(KEY) as Theme) ||
    (localStorage.getItem("tn_default_theme") as Theme) ||
    "auto";
  applyTheme(t);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("auto");
  // Obuna faolmi — bepul foydalanuvchida tungi rejim yopiq (faqat kunduzgi)
  const isPremium = useAuth((s) => Boolean(s.user?.subscription?.is_active));

  useEffect(() => {
    const saved =
      (localStorage.getItem(KEY) as Theme) ||
      (localStorage.getItem("tn_default_theme") as Theme) ||
      "auto";
    setThemeState(saved);
    applyTheme(isPremium ? saved : "light");
  }, [isPremium]);

  const setTheme = useCallback(
    (t: Theme) => {
      localStorage.setItem(KEY, t);
      setThemeState(t);
      applyTheme(isPremium ? t : "light");
    },
    [isPremium]
  );

  const rawDark =
    theme === "dark" ||
    (theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const isDark = isPremium ? rawDark : false;

  return { theme, setTheme, isDark };
}
