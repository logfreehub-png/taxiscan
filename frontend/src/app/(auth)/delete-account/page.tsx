"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { Phone, Lock, Search, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

type Step = "phone" | "confirm-account" | "password" | "ready" | "done";

interface FoundAccount {
  full_name: string;
  phone: string;
  role: string;
}

export default function DeleteAccountPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState<FoundAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  // 1-qadam: telefon raqam bo'yicha hisobni izlash
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ found: boolean } & Partial<FoundAccount>>(
        "/auth/delete-account/lookup/",
        { phone },
        { auth: false }
      );
      if (!res.found) {
        setError("Bunday telefon raqamli hisob topilmadi.");
        return;
      }
      setAccount({
        full_name: res.full_name || "",
        phone: res.phone || "",
        role: res.role || "",
      });
      setStep("confirm-account");
    } catch (err: any) {
      setError(err?.data?.detail || "Xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  // 2-qadam: parolni tekshirish
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiPost("/auth/delete-account/verify/", { phone, password }, { auth: false });
      setStep("ready");
    } catch (err: any) {
      setError(err?.data?.detail || "Parol noto'g'ri.");
    } finally {
      setLoading(false);
    }
  };

  // Yakuniy qadam: hisobni o'chirish
  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiPost("/auth/delete-account/confirm/", { phone, password }, { auth: false });
      setShowWhy(false);
      setStep("done");
    } catch (err: any) {
      setError(err?.data?.detail || "O'chirishda xatolik yuz berdi.");
      setShowWhy(false);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep("phone");
    setPassword("");
    setAccount(null);
    setError(null);
    setShowWhy(false);
  };

  return (
    <div className="w-full max-w-md card p-8 animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
        <Trash2 size={22} className="text-red-600" />
        Hisobni o'chirish
      </h1>
      <p className="text-ink-muted mt-1 text-sm">
        Hisobingizni butunlay o'chirish uchun quyidagi qadamlarni bajaring.
      </p>

      {/* 1-QADAM: telefon raqam */}
      {step === "phone" && (
        <form onSubmit={handleLookup} className="mt-6 space-y-4">
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
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
            {loading ? <Spinner /> : (<><Search size={18} /> Izlash</>)}
          </button>
        </form>
      )}

      {/* 2-QADAM: hisob topildi — tasdiqlash */}
      {step === "confirm-account" && account && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-ink-muted">Quyidagi hisob topildi. Bu sizning hisobingizmi?</p>
          <div className="rounded-xl border border-ink-line bg-ink-bg p-4">
            <div className="font-bold text-ink text-lg">{account.full_name || "Foydalanuvchi"}</div>
            <div className="text-sm text-ink-muted mt-0.5">{account.phone}</div>
            <div className="text-xs text-ink-muted mt-1 inline-block px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20">
              {account.role}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={resetAll} className="btn-ghost flex-1">Yo'q</button>
            <button onClick={() => { setError(null); setStep("password"); }} className="btn-primary flex-1">
              Ha, mening hisobim
            </button>
          </div>
        </div>
      )}

      {/* 3-QADAM: parol */}
      {step === "password" && (
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <p className="text-sm text-ink-muted">Hisobni o'chirishni tasdiqlash uchun parolingizni kiriting.</p>
          <div>
            <label className="label">Parol</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                required
                type="password"
                className="input pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner /> : "Tasdiqlash"}
          </button>
        </form>
      )}

      {/* 4-QADAM: o'chirish tugmasi (o'rtada) */}
      {step === "ready" && (
        <div className="mt-8 flex flex-col items-center justify-center gap-4 py-4">
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 size={18} /> Parol tasdiqlandi
          </div>
          <button
            onClick={() => setShowWhy(true)}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl px-8 py-4 text-lg shadow-lg shadow-red-600/20 transition-colors"
          >
            <Trash2 size={22} /> Hisobni o'chirish
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm w-full text-center">
              {error}
            </div>
          )}
        </div>
      )}

      {/* DONE: muvaffaqiyatli o'chirildi */}
      {step === "done" && (
        <div className="mt-8 flex flex-col items-center justify-center gap-4 py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-600" />
          </div>
          <div className="font-bold text-ink text-lg">Hisobingiz o'chirildi</div>
          <p className="text-sm text-ink-muted">
            Hisobingiz va unga bog'liq barcha ma'lumotlar butunlay o'chirildi.
          </p>
          <Link href="/" className="btn-primary w-full mt-2">Bosh sahifaga qaytish</Link>
        </div>
      )}

      {/* "Nima uchun" — tasdiqlash modali */}
      {showWhy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={30} className="text-red-600" />
              </div>
              <h2 className="text-xl font-extrabold text-ink">Hisobni o'chirasizmi?</h2>
              {/* Nima uchun / oqibatlari haqida izoh */}
              <p className="text-sm text-ink-muted">
                Diqqat! Bu amal <span className="font-semibold text-ink">qaytarib bo'lmaydi</span>.
                Hisobingiz o'chirilgach:
              </p>
              <ul className="text-sm text-ink-muted text-left space-y-1.5 w-full">
                <li className="flex gap-2"><span className="text-red-500">•</span> Profil ma'lumotlaringiz butunlay yo'qoladi</li>
                <li className="flex gap-2"><span className="text-red-500">•</span> Obuna va to'lov tarixingiz o'chiriladi</li>
                <li className="flex gap-2"><span className="text-red-500">•</span> Bildirishnomalar va sozlamalar tiklanmaydi</li>
                <li className="flex gap-2"><span className="text-red-500">•</span> Bu raqam bilan qaytadan ro'yxatdan o'tishingiz mumkin</li>
              </ul>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowWhy(false)} className="btn-ghost flex-1" disabled={loading}>
                Bekor qilish
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-60"
                disabled={loading}
              >
                {loading ? <Spinner /> : "OK, o'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-ink-muted">
        Fikringizni o'zgartirdingizmi?{" "}
        <Link href="/" className="font-semibold text-brand-700 hover:underline">
          Bosh sahifa
        </Link>
      </div>
    </div>
  );
}
