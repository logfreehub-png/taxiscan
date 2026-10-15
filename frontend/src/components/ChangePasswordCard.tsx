"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";
import { Lock, Eye, EyeOff, CheckCircle2, Send } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Parolni o'zgartirish — email yoki telefon raqamiga tasdiqlash kodi yuboriladi,
 * kod kiritilgandan keyin yangi parol o'rnatiladi.
 */
export function ChangePasswordCard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const r = await apiPost<any>("/auth/password-reset/request/", {});
      setSentTo(r?.sent_to || "");
      setStep(2);
      if (r?.debug_code) {
        setCode(String(r.debug_code));
        setInfo(`Kod yuborildi (${r.sent_to}). Sinov kodi: ${r.debug_code}`);
      } else {
        setInfo(`Tasdiqlash kodi yuborildi: ${r?.sent_to || ""}`);
      }
    } catch (err: any) {
      setError(err?.data?.detail || "Kod yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) { setError("Kodni kiriting"); return; }
    if (newPassword !== newPassword2) { setError("Yangi parollar mos kelmaydi"); return; }
    if (newPassword.length < 6) { setError("Yangi parol kamida 6 ta belgidan iborat bo'lsin"); return; }
    setLoading(true);
    try {
      await apiPost("/auth/password-reset/confirm/", {
        code: code.trim(),
        new_password: newPassword,
        new_password2: newPassword2,
      });
      setDone(true);
      setStep(1);
      setCode(""); setNewPassword(""); setNewPassword2(""); setInfo(null);
      setTimeout(() => setDone(false), 4000);
    } catch (err: any) {
      const d = err?.data;
      setError(d?.code || d?.new_password || d?.new_password2 || d?.detail || "Parolni o'zgartirib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5">
      <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
        <Lock size={18} /> Parolni o'zgartirish
      </h3>

      {done && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 size={16} /> Parol muvaffaqiyatli o'zgartirildi
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-3 rounded-xl bg-brand/15 border border-brand/30 px-3 py-2.5 text-sm text-ink">
          {info}
        </div>
      )}

      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Xavfsizlik uchun emailingiz yoki telefon raqamingizga tasdiqlash kodi yuboriladi.
            Kodni kiritgandan so'ng yangi parol o'rnatasiz.
          </p>
          <button onClick={sendCode} disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner /> : (<><Send size={16} /> Tasdiqlash kodini yuborish</>)}
          </button>
        </div>
      ) : (
        <form onSubmit={confirm} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Tasdiqlash kodi"
            required
            className="input w-full tracking-widest"
          />
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Yangi parol"
              autoComplete="new-password"
              required
              className="input w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              tabIndex={-1}
              aria-label="Parolni ko'rsatish"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <input
            type={show ? "text" : "password"}
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            placeholder="Yangi parolni takrorlang"
            autoComplete="new-password"
            required
            className="input w-full"
          />
          <div className="flex items-center justify-between">
            <button type="button" onClick={sendCode} disabled={loading} className="text-sm text-brand-700 font-semibold hover:underline">
              Qayta yuborish
            </button>
            {sentTo && <span className="text-xs text-ink-muted">{sentTo}</span>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner /> : "Parolni o'zgartirish"}
          </button>
        </form>
      )}
    </div>
  );
}
