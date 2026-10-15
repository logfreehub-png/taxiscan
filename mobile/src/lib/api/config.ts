import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Backend manzili — avtomatik aniqlanadi.
 *
 * - Real telefon (Expo Go): Expo dev-server ishlayotgan kompyuterning
 *   LAN IP si `hostUri` dan avtomatik olinadi (telefon va kompyuter bir Wi-Fi da bo'lsin).
 * - Android emulyator:   http://10.0.2.2:8001
 * - iOS simulyator / web: http://127.0.0.1:8001
 *
 * Agar avtomatik aniqlash ishlamasa, pastdagi LAN_IP ni qo'lda yozing
 * va USE_LAN ni `true` qiling.
 */

const PROD_API_BASE = "https://backend.taxiscan.app";
const USE_PROD = true; // Server bilan ishlash uchun faollashtirildi

const LAN_IP = "192.168.100.28";
const USE_LAN = false;

const PORT = 8001;

/** Expo dev-server host IP sini (masalan "192.168.100.101") aniqlaydi. */
function getDevHostIp(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    // eski Expo versiyalari uchun zaxira
    (Constants as any)?.manifest?.debuggerHost ||
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost;
  if (!hostUri) return null;
  const host = String(hostUri).split(":")[0];
  return host || null;
}

function resolveBase(): string {
  if (USE_PROD) return PROD_API_BASE;
  if (USE_LAN) return `http://${LAN_IP}:${PORT}`;

  // Web (Expo web) — brauzer kompyuterda ishlaydi
  if (Platform.OS === "web") return `http://127.0.0.1:${PORT}`;

  // Real qurilma / Expo Go — dev-server IP sini ishlat
  const ip = getDevHostIp();
  if (ip && ip !== "127.0.0.1" && ip !== "localhost") {
    // Android emulyator 10.0.2.2 dan foydalanadi, lekin Expo Go LAN IP beradi
    return `http://${ip}:${PORT}`;
  }

  // Zaxira: emulyatorlar uchun
  if (Platform.OS === "android") return `http://10.0.2.2:${PORT}`;
  return `http://127.0.0.1:${PORT}`;
}

export const API_BASE = resolveBase();
export const API_URL = `${API_BASE}/api/v1`;

