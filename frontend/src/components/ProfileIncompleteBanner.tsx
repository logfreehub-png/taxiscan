"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store/auth";
import { UserCircle, UserPlus } from "lucide-react";

const ASKED_KEY = "tn_profile_prompt_asked";

/**
 * Profil to'ldirilmagan bo'lsa (bepul ham, obunali ham):
 *  - kirishda "Ma'lumotlaringizni to'ldiring" oynasi chiqadi;
 *  - "Keyinroq" bosilsa oyna yopiladi, lekin sahifa tepasida
 *    "Ma'lumotlaringizni to'ldiring" eslatmasi to'ldirilmaguncha turadi.
 */
export function ProfileIncompleteBanner() {
  const { user } = useAuth();
  const [askOpen, setAskOpen] = useState(false);

  const needs = !!user && !user.profile_completed && user.role !== "admin";

  useEffect(() => {
    if (!needs) return;
    let asked = false;
    try {
      asked = sessionStorage.getItem(ASKED_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (!asked) setAskOpen(true);
  }, [needs]);

  if (!needs) return null;

  const later = () => {
    try {
      sessionStorage.setItem(ASKED_KEY, "1");
    } catch {
      /* ignore */
    }
    setAskOpen(false);
  };

  return (
    <>
      <div className="rounded-2xl border-2 p-4 mb-4 flex items-center gap-3 animate-fade-in bg-brand/15 border-brand/40">
        <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-brand text-ink">
          <UserCircle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-ink text-sm">Ma'lumotlaringizni to'ldiring</div>
          <div className="text-xs text-ink-muted mt-0.5">
            Ism, familiya, tug'ilgan sana va jinsingizni kiriting — bir daqiqa vaqt oladi.
          </div>
        </div>
        <Link
          href="/profile-setup"
          className="text-xs font-bold px-3 py-2 rounded-xl shrink-0 transition bg-ink text-white hover:bg-ink-soft"
        >
          To'ldirish
        </Link>
      </div>

      {askOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 text-center animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-brand flex items-center justify-center">
              <UserPlus size={30} className="text-ink" />
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-ink">Ma'lumotlaringizni to'ldiring</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Profilingiz to'liq emas. Ism, familiya, tug'ilgan sana va jinsingizni kiriting.
            </p>
            <div className="mt-5 space-y-2">
              <Link href="/profile-setup" onClick={later} className="btn-primary w-full">
                To'ldirish
              </Link>
              <button onClick={later} className="btn-outline w-full">
                Keyinroq
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
