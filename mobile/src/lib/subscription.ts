import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/store/auth";

/**
 * Obuna (premium) holati va bepul foydalanuvchi cheklovlari.
 *
 * Bepul (obunasiz) foydalanuvchi:
 *  - kuniga faqat 1 marta narx qidira oladi
 *  - faqat A va B nuqta (oraliq to'xtashlarsiz)
 *  - faqat 1 ta yo'l narxi
 *  - faqat kunduzgi (light) rejim
 *  - faqat "Start" tarifi (qolganlari qulflangan)
 *  - haydovchi statistikani ko'ra olmaydi
 * Obuna olsa — barcha cheklovlar ochiladi.
 */

export const FREE_DAILY_SEARCHES = 1;

/** Obuna faolmi (hook). */
export function useIsPremium(): boolean {
  return useAuth((s) => Boolean(s.user?.subscription?.is_active));
}

/** Obuna faolmi (hooksiz, util ichida ishlatish uchun). */
export function isPremiumNow(): boolean {
  return Boolean(useAuth.getState().user?.subscription?.is_active);
}

function todayKey(): string {
  const d = new Date();
  return `tn_search_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Bugun nechta qidiruv qilingan. */
export async function getTodaySearchCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(todayKey());
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Bugun yana qidirsa bo'ladimi (premium bo'lsa doim ha). */
export async function canSearchToday(): Promise<boolean> {
  if (isPremiumNow()) return true;
  const c = await getTodaySearchCount();
  return c < FREE_DAILY_SEARCHES;
}

/** Qidiruvni ro'yxatga oladi (premiumlar uchun hisoblanmaydi). */
export async function markSearchUsed(): Promise<void> {
  if (isPremiumNow()) return;
  try {
    const c = await getTodaySearchCount();
    await AsyncStorage.setItem(todayKey(), String(c + 1));
  } catch {
    /* ignore */
  }
}
