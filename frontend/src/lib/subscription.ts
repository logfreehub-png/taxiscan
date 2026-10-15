"use client";

import { useAuth } from "@/lib/store/auth";

/**
 * Obuna (premium) holati va bepul foydalanuvchi cheklovlari (web).
 *
 * Bepul (obunasiz):
 *  - kuniga faqat 1 marta narx qidirish
 *  - faqat A va B nuqta (oraliq to'xtashlarsiz)
 *  - faqat 1 ta yo'l narxi
 *  - faqat kunduzgi (light) rejim
 *  - faqat "Start" tarifi
 *  - narxlar ro'yxatida faqat 2 ta xizmat ochiq (qolgani qulf)
 *  - haydovchi statistikani ko'ra olmaydi
 */

export const FREE_DAILY_SEARCHES = 1;
export const FREE_VISIBLE_SERVICES = 2;

export function useIsPremium(): boolean {
  return useAuth((s) => Boolean(s.user?.subscription?.is_active));
}

export function isPremiumNow(): boolean {
  return Boolean(useAuth.getState().user?.subscription?.is_active);
}

function todayKey(): string {
  const d = new Date();
  return `tn_search_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function getTodaySearchCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(todayKey()) || "0", 10) || 0;
}

export function canSearchToday(): boolean {
  if (isPremiumNow()) return true;
  return getTodaySearchCount() < FREE_DAILY_SEARCHES;
}

export function markSearchUsed(): void {
  if (isPremiumNow() || typeof window === "undefined") return;
  localStorage.setItem(todayKey(), String(getTodaySearchCount() + 1));
}
