"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { PhoneCodeFlow, VerifySession } from "@/components/auth/PhoneCodeFlow";
import { StepBars, AuthStep } from "@/components/auth/StepBars";
import { Phone, Lock, User as UserIcon, Car, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

type Step = AuthStep;

function firstError(err: any, fallback: string) {
  const data = err?.data;
  const first = (data && typeof data === "object" && Object.values(data)[0]) || fallback;
  return Array.isArray(first) ? String(first[0]) : String(first);
}

function RegisterContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [step, setStep] = useState<Step>("phone");
  const [role, setRole] = useState<"passenger" | "driver">(
    (sp.get("role") as "passenger" | "driver") || "passenger"
  );
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<VerifySession | null>(null);

  const sendCode = async () => {
    const clean = phone.replace(/[^\d+]/g, "");
    if (clean.replace(/\D/g, "").length < 12) {
      setError("Telefon raqam noto'g'ri kiritildi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ session_id: string; bot_url: string; bot_username: string }>(
        "/auth/phone/send-code/",
        { phone: clean, purpose: "register" },
        { auth: false }
      );
      setSession({
        sessionId: res.session_id,
        botUrl: res.bot_url,
        botUsername: res.bot_username || "TaxiScan_auth_bot",
        phone: clean,
      });
      setStep("verify");
    } catch (err: any) {
      setError(firstError(err, "Kod yuborishda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  const finish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError("Parol kamida 6 ta belgidan iborat bo'lsin");
    if (password !== password2) return setError("Parollar mos kelmaydi");
    setLoading(true);
    setError(null);
    try {
      await apiPost(
        "/auth/register/",
        {
          phone: session?.phone || phone,
          password,
          password2,
          role,
          first_name: "",
          last_name: "",
          city: "Tashkent",
          session_id: session?.sessionId,
        },
        { auth: false }
      );
      router.push("/login?registered=1");
    } catch (err: any) {
      setError(firstError(err, "Ro'yhatdan o'tishda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    step === "phone"
      ? "Telefon raqamingizni kiriting — Telegram orqali tasdiqlash kodi yuboriladi."
      : step === "verify"
      ? "Telefon raqamingizni tasdiqlang"
      : "Raqam tasdiqlandi. Endi parol o'rnating.";

  const errorBox = error && (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
  );

  return (
    <div className="w-full max-w-md card p-8 animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Ro'yhatdan o'tish</h1>
      <p className="text-ink-muted mt-1 text-sm">{subtitle}</p>
      <StepBars step={step} />

      {step === "phone" && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2 p-1 bg-ink-bg rounded-xl">
            {([
              { key: "passenger", label: "Yo'lovchi", Icon: UserIcon },
              { key: "driver", label: "Haydovchi", Icon: Car },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRole(key)}
                className={clsx(
                  "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition",
                  role === key ? "bg-white shadow-sm text-ink" : "text-ink-muted"
                )}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
            className="mt-5 space-y-4"
          >
            <div>
              <label className="label">Telefon raqam</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  required
                  type="tel"
                  className="input pl-10"
                  placeholder="+998 90 123 45 67"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </div>
            </div>
            {errorBox}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner /> : "Kod olish"}
            </button>
          </form>
        </>
      )}

      {step === "verify" && session && (
        <PhoneCodeFlow
          session={session}
          onVerified={() => {
            setError(null);
            setStep("password");
          }}
          onResend={sendCode}
          onChangePhone={() => {
            setError(null);
            setStep("phone");
          }}
        />
      )}

      {step === "password" && (
        <form onSubmit={finish} className="mt-5 space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm font-bold text-green-700">
            <CheckCircle2 size={18} /> {session?.phone} tasdiqlandi
          </div>
          <div>
            <label className="label">Parol</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                required
                autoFocus
                type="password"
                minLength={6}
                className="input pl-10"
                placeholder="kamida 6 ta belgi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Parolni tasdiqlang</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                required
                type="password"
                minLength={6}
                className="input pl-10"
                placeholder="••••••"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </div>
          </div>
          {errorBox}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner /> : "Ro'yhatdan o'tish"}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-ink-muted">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Kirish
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="card p-8"><Spinner /></div>}>
      <RegisterContent />
    </Suspense>
  );
}
