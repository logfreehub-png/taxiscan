import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/store/auth";

/**
 * TaxiScan dizayn tizimi — web (Tailwind) bilan bir xil ranglar.
 * brand = #FFCC00 (Yandex sariq), ink = qora oilasi.
 */

export interface Palette {
  brand: string;
  brand400: string;
  brandDark: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  line: string;
  bg: string;
  card: string;
  cardAlt: string;
  white: string;
  black: string;
  red: string;
  redBg: string;
  green: string;
  greenBg: string;
  orange: string;
  orangeBg: string;
  shadow: string;
}

export const lightColors: Palette = {
  brand: "#FFCC00",
  brand400: "#FFD633",
  brandDark: "#997A00",
  ink: "#0F1216",
  inkSoft: "#1A1F26",
  inkMuted: "#5C6772",
  line: "#E5E8EC",
  bg: "#F7F8FA",
  card: "#FFFFFF",
  cardAlt: "#F2F4F7",
  white: "#FFFFFF",
  black: "#0F1216",
  red: "#DC2626",
  redBg: "#FEF2F2",
  green: "#16A34A",
  greenBg: "#F0FDF4",
  orange: "#EA580C",
  orangeBg: "#FFF7ED",
  shadow: "#0F1216",
};

export const darkColors: Palette = {
  brand: "#FFCC00",
  brand400: "#FFD633",
  brandDark: "#FFE066",
  ink: "#F3F5F7",
  inkSoft: "#E2E6EB",
  inkMuted: "#94A2B0",
  line: "#262C34",
  bg: "#0A0D11",
  card: "#14181E",
  cardAlt: "#1B2129",
  white: "#FFFFFF",
  black: "#0F1216",
  red: "#F87171",
  redBg: "#2A1416",
  green: "#4ADE80",
  greenBg: "#10231A",
  orange: "#FB923C",
  orangeBg: "#2A1C10",
  shadow: "#000000",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextValue {
  colors: Palette;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  mode: "auto",
  setMode: () => {},
});

const STORAGE_KEY = "taxinarx_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("auto");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "auto") setModeState(v);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  // Obuna faolmi — bepul foydalanuvchi uchun tungi rejim yopiq (faqat kunduzgi)
  const isPremium = useAuth((s) => Boolean(s.user?.subscription?.is_active));

  const rawDark = mode === "dark" || (mode === "auto" && system === "dark");
  const isDark = isPremium ? rawDark : false;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, mode, setMode }),
    [isDark, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
