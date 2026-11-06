"use client";

import { useEffect, useState } from "react";
import { Send, Phone, AlertCircle } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { OtpInput } from "./OtpInput";

export interface VerifySession {
  sessionId: string;
  botUrl: string;
  botUsername: string;
  phone: string;
}

interface Props {
  session: VerifySession;
  onVerified: (code: string) => void;
  onResend: () => Promise<void>;
  onChangePhone: () => void;
}

/**
 * 1) "telegram" — botni ochib kontakt ulashish, bot kod yuborguncha kutish
 * 2) "code"     — 6 xonali kodni kataklarga kiritib "Tasdiqlash"
 */
export function PhoneCodeFlow({ session, onVerified, onResend, onChangePhone }: Props) {
  const [step, setStep] = useState<"telegram" | "code">("telegram");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    setStep("telegram");
    setCode("");
    setError(null);
    setCountdown(60);
  }, [session.sessionId]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Bot kodni yuborganini kuzatish → kod oynasiga avtomatik o'tish
  useEffect(() => {
    if (step !== "telegram") return;
    const id = setInterval(async () => {
      try {
        const res = await apiGet<{ code_sent?: boolean; verified?: boolean }>(
          `/auth/phone/check-status/?session_id=${session.sessionId}`,
          { auth: false }
        );
        if (res?.code_sent || res?.verified) setStep("code");
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => clearInterval(id);
  }, [step, session.sessionId]);

  const botLink = session.botUrl || `https://t.me/${session.botUsername}?start=auth_${session.sessionId}`;

  const verify = async () => {
    if (code.length < 6) {
      setError("6 xonali kodni to'liq kiriting");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost<{ verified: boolean }>(
        "/auth/phone/verify-code/",
        { session_id: session.sessionId, code, phone: session.phone },
        { auth: false }
      );
      if (res?.verified) onVerified(code);
    } catch (err: any) {
      setError(err?.data?.detail || "Tasdiqlash kodi noto'g'ri");
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    setError(null);
    try {
      await onResend();
    } catch {
      setError("Kodni qayta yuborib bo'lmadi");
    }
  };

  const phoneRow = (
    <div className="flex items-center gap-2 rounded-xl bg-ink-bg px-4 py-3">
      <Phone size={16} className="text-ink-muted" />
      <span className="flex-1 font-bold text-ink tabular-nums">{session.phone}</span>
      <button type="button" onClick={onChangePhone} className="text-sm font-semibold text-brand-700 hover:underline">
        O'zgartirish
      </button>
    </div>
  );

  if (step === "telegram") {
    return (
      <div className="mt-5 space-y-4">
        {phoneRow}
        <div className="rounded-2xl border-2 border-[#0088cc]/30 bg-[#0088cc]/5 p-5 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#0088cc]/15 flex items-center justify-center">
            <Send size={26} className="text-[#0088cc]" />
          </div>
          <h3 className="mt-3 text-lg font-extrabold text-ink">Telegram orqali kod oling</h3>
          <p className="mt-1 text-sm text-ink-muted leading-relaxed">
            @{session.botUsername} botini oching va «📱 Telefon raqamni ulashish» tugmasini bosing. Bot sizga
            6 xonali kod yuboradi.
          </p>
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0088cc] py-3 font-bold text-white shadow-lg shadow-[#0088cc]/25 hover:bg-[#0077b3] transition"
          >
            <Send size={18} /> Telegram botni ochish
          </a>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-ink-muted">
            <Spinner size={14} /> Bot kodni yuborishini kutyapmiz...
          </div>
        </div>
        <button type="button" onClick={() => setStep("code")} className="btn-outline w-full">
          Kod keldi — kiritish
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {phoneRow}
      <p className="text-center text-sm text-ink-muted">Telegram botga kelgan 6 xonali kodni kiriting</p>
      <OtpInput
        value={code}
        onChange={(v) => {
          setCode(v);
          if (error) setError(null);
        }}
        error={!!error}
        onComplete={verify}
      />
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      <button type="button" onClick={verify} className="btn-primary w-full" disabled={submitting || code.length < 6}>
        {submitting ? <Spinner /> : "Tasdiqlash"}
      </button>
      <div className="flex items-center justify-between text-sm">
        <a href={botLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0088cc] hover:underline">
          Telegramni ochish
        </a>
        {countdown > 0 ? (
          <span className="text-ink-muted">Qayta yuborish: {countdown}s</span>
        ) : (
          <button type="button" onClick={resend} className="font-semibold text-brand-700 hover:underline">
            Kodni qayta yuborish
          </button>
        )}
      </div>
    </div>
  );
}
