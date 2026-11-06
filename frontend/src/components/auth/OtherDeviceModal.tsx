"use client";

import { useEffect, useState } from "react";
import { Smartphone, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth, type ForceLoginSession } from "@/lib/store/auth";
import type { User } from "@/lib/api/types";
import { Spinner } from "@/components/ui/Spinner";
import { OtpInput } from "./OtpInput";

interface Props {
  open: boolean;
  phone: string;
  password: string;
  deviceName?: string;
  onClose: () => void;
  onLoggedIn: (user: User) => void;
}

/**
 * 1) "Siz boshqa qurilmadan kirgansiz — u qurilmani chiqarib yuborasizmi?"
 * 2) Telegram'ga kelgan 6 xonali kod
 * 3) "Qurilma chiqarib yuborildi" → kirish
 */
export function OtherDeviceModal({ open, phone, password, deviceName, onClose, onLoggedIn }: Props) {
  const forceLoginRequest = useAuth((s) => s.forceLoginRequest);
  const forceLoginConfirm = useAuth((s) => s.forceLoginConfirm);
  const [step, setStep] = useState<"ask" | "code" | "done">("ask");
  const [session, setSession] = useState<ForceLoginSession | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (open) {
      setStep("ask");
      setSession(null);
      setCode("");
      setError(null);
      setUser(null);
    }
  }, [open]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (!open) return null;

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const s = await forceLoginRequest(phone, password);
      setSession(s);
      setCode("");
      setCountdown(60);
      setStep("code");
    } catch (err: any) {
      setError(err?.data?.detail || "Kod yuborib bo'lmadi");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!session || code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const u = await forceLoginConfirm(phone, password, session.session_id, code);
      setUser(u);
      setStep("done");
    } catch (err: any) {
      setError(err?.data?.detail || "Tasdiqlash kodi noto'g'ri");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error && (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm text-left">
      <AlertCircle size={16} className="shrink-0" /> {error}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 text-center animate-fade-in space-y-4">
        {step === "ask" && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
              <Smartphone size={30} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-ink">Siz boshqa qurilmadan kirgansiz</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Akkauntingiz hozir {deviceName ? <b>«{deviceName}»</b> : "boshqa qurilma"}da ochiq. U qurilmani
                chiqarib yuborib, shu yerdan kirmoqchimisiz?
              </p>
              <p className="mt-1 text-xs text-ink-muted">Tasdiqlash kodi Telegram'ga yuboriladi.</p>
            </div>
            {errorBox}
            <div className="space-y-2">
              <button onClick={requestCode} className="btn-primary w-full" disabled={busy}>
                {busy ? <Spinner /> : "Ha, chiqarib yuborish"}
              </button>
              <button onClick={onClose} className="btn-outline w-full" disabled={busy}>
                Yo'q, bekor qilish
              </button>
            </div>
          </>
        )}

        {step === "code" && session && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-[#0088cc]/15 flex items-center justify-center">
              <Send size={28} className="text-[#0088cc]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-ink">Telegram'dagi kodni kiriting</h2>
              <p className="mt-2 text-sm text-ink-muted">
                {session.sent
                  ? `@${session.bot_username} botiga 6 xonali kod yuborildi.`
                  : `@${session.bot_username} botini oching va «📱 Telefon raqamni ulashish» tugmasini bosing — bot kod yuboradi.`}
              </p>
            </div>
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              error={!!error}
              onComplete={confirm}
            />
            {errorBox}
            <button onClick={confirm} className="btn-primary w-full" disabled={busy || code.length < 6}>
              {busy ? <Spinner /> : "Tasdiqlash"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <a href={session.bot_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0088cc] hover:underline">
                Telegramni ochish
              </a>
              {countdown > 0 ? (
                <span className="text-ink-muted">Qayta yuborish: {countdown}s</span>
              ) : (
                <button onClick={requestCode} disabled={busy} className="font-semibold text-brand-700 hover:underline">
                  Kodni qayta yuborish
                </button>
              )}
            </div>
            <button onClick={onClose} className="text-sm font-semibold text-ink-muted hover:text-ink">
              Bekor qilish
            </button>
          </>
        )}

        {step === "done" && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={34} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-ink">Qurilma chiqarib yuborildi</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Eski qurilmadagi akkaunt yopildi. Endi shu yerdan foydalanishingiz mumkin.
              </p>
            </div>
            <button onClick={() => user && onLoggedIn(user)} className="btn-primary w-full">
              Kirish
            </button>
          </>
        )}
      </div>
    </div>
  );
}
