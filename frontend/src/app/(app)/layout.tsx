"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { TopBar } from "@/components/layout/TopBar";
import { Spinner } from "@/components/ui/Spinner";
import { ProfileIncompleteBanner } from "@/components/ProfileIncompleteBanner";
import { getAccessToken } from "@/lib/api/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loadMe, hydrated } = useAuth();

  const isProfileSetup = pathname === "/profile-setup";
  const sub = user?.subscription ?? null;
  const trialExpired = !sub || sub.status !== "trial" || (sub.days_left ?? 0) <= 0;
  const profileBlocked = !!user && !user.profile_completed && trialExpired && user.role !== "admin";

  // HOOK 1 — Auth: persist to'liq yuklanganidan keyin bir marta ishlaydi
  // "hydrated" dependency'si bo'lgani uchun faqat false→true o'tishida qayta ishlaydi
  useEffect(() => {
    if (!hydrated) return;

    const token = getAccessToken();
    if (!token) {
      // Token umuman yo'q → login
      router.replace("/login");
      return;
    }

    if (!user) {
      // Token bor, lekin persist'da user yo'q → API orqali tekshir
      // (masalan, boshqa brauzerda login bo'lmagan holat)
      loadMe().catch(() => router.replace("/login"));
    }
    // Token + persist'dan user → hech qanday redirect yo'q ✓
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // HOOK 2 — Profil to'ldirilishi shart bo'lsa redirect
  useEffect(() => {
    if (!hydrated || !user) return;
    if (profileBlocked && !isProfileSetup) {
      router.push("/profile-setup");
    }
  }, [profileBlocked, isProfileSetup, hydrated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // HOOK 3 — Rol bo'yicha to'g'ri bo'lim: haydovchi yo'lovchi sahifasiga (yoki
  // aksincha) kirsa, o'z bo'limiga qaytariladi. Har kim o'z "programmasini" ko'radi.
  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.role === "driver" && pathname.startsWith("/passenger")) {
      router.replace("/driver");
    } else if (user.role === "passenger" && pathname.startsWith("/driver")) {
      router.replace("/passenger");
    }
  }, [pathname, hydrated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ikkala hook ham early return'dan OLDIN — Rules of Hooks ✓

  // Hali yuklanmagan yoki foydalanuvchi aniqlanmagan
  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-muted">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-bg dark:bg-[rgb(var(--background))]">
      <TopBar />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {!isProfileSetup && <ProfileIncompleteBanner />}
        {children}
      </main>
    </div>
  );
}
