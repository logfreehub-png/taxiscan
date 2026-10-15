"use client";

/**
 * Sayt global ko'rinishi — admin panelidan boshqariladigan brend rangi + standart rejim.
 * Backenddan olinadi (public), brend rangining to'liq shkalasi CSS o'zgaruvchilariga yoziladi.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend.taxiscan.app/api/v1";

// Bir bazaviy rangdan 50–900 shkalasini olish (och tomon oqqa, quyuq tomon qoraga aralashtirib)
const TINTS: Record<number, number> = { 50: 0.9, 100: 0.8, 200: 0.6, 300: 0.4, 400: 0.2 };
const SHADES: Record<number, number> = { 600: 0.2, 700: 0.4, 800: 0.6, 900: 0.8 };

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function applyBrandColor(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb || typeof document === "undefined") return;
  const s = document.documentElement.style;
  const set = (k: number, r: number, g: number, b: number) =>
    s.setProperty(`--brand-${k}`, `${r} ${g} ${b}`);
  set(500, rgb[0], rgb[1], rgb[2]);
  for (const [k, t] of Object.entries(TINTS)) {
    set(+k, ...(rgb.map((c) => Math.round(c * (1 - t) + 255 * t)) as [number, number, number]));
  }
  for (const [k, sh] of Object.entries(SHADES)) {
    set(+k, ...(rgb.map((c) => Math.round(c * (1 - sh))) as [number, number, number]));
  }
}

export async function loadSiteSettings() {
  try {
    const res = await fetch(`${API_URL}/taxi/site-settings/`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.brand_color) {
      applyBrandColor(data.brand_color);
      localStorage.setItem("tn_brand_color", data.brand_color);
    }
    if (data.default_theme) {
      // Keyingi tashrifda pre-hydration skripti ishlatishi uchun saqlaymiz.
      // Foydalanuvchi o'z temasini tanlamagan bo'lsa — admin defaulti amal qiladi (useTheme o'qiydi).
      localStorage.setItem("tn_default_theme", data.default_theme);
    }
  } catch {
    /* backend o'chiq bo'lsa — standart ranglar qoladi */
  }
}
