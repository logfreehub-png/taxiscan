"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store/auth";
import { UserCircle, AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "tn_profile_banner_dismissed";

/**
 * Banner — profil to'liq emasligini ko'rsatadi.
 * - Trial muddat tugamaguncha "Keyinroq" tugmasi bilan yopib qo'yish mumkin
 * - Trial tugagandan keyin majburiy (yopa olmaydi)
 */
export function ProfileIncompleteBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!user) return null;
  if (user.profile_completed) return null;

  // Admin uchun banner kerakmas
  if (user.role === "admin") return null;

  const sub = user.subscription;
  const isTrialActive = sub?.status === "trial" && sub?.is_active && (sub?.days_left ?? 0) > 0;
  const canDismiss = isTrialActive;

  if (canDismiss && dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      className={`rounded-2xl border-2 p-4 mb-4 flex items-center gap-3 animate-fade-in ${
        canDismiss
          ? "bg-brand/15 border-brand/40"
          : "bg-red-50 border-red-300"
      }`}
    >
      <div
        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
          canDismiss ? "bg-brand text-ink" : "bg-red-500 text-white"
        }`}
      >
        {canDismiss ? <UserCircle size={20} /> : <AlertTriangle size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-ink text-sm">
          {canDismiss ? "Profilingizni to'ldiring" : "Profilni to'ldirish majburiy!"}
        </div>
        <div className="text-xs text-ink-muted mt-0.5">
          {canDismiss
            ? `Bepul muddat tugashidan oldin profilingizni to'liq to'ldirishingiz tavsiya etiladi. (${
                sub?.days_left ?? 0
              } kun qoldi)`
            : "Bepul muddat tugadi. Davom etish uchun profilingizni to'ldiring."}
        </div>
      </div>
      <Link
        href="/profile-setup"
        className={`text-xs font-bold px-3 py-2 rounded-xl shrink-0 transition ${
          canDismiss
            ? "bg-ink text-white hover:bg-ink-soft"
            : "bg-red-600 text-white hover:bg-red-700"
        }`}
      >
        To'ldirish
      </Link>
      {canDismiss && (
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-ink-line/40"
          aria-label="Keyinroq"
          title="Keyinroq"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
