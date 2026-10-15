"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import { Phone, Lock, User as UserIcon, Car } from "lucide-react";
import clsx from "clsx";

function RegisterContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const register = useAuth((s) => s.register);

  const [role, setRole] = useState<"passenger" | "driver">(
    (sp.get("role") as "passenger" | "driver") || "passenger"
  );
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) {
      setError("Parollar mos kelmaydi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Faqat telefon va parol bilan - profile keyin to'ldiriladi
      const user = await register({
        phone,
        password,
        password2,
        role,
        first_name: "",
        last_name: "",
        city: "Tashkent",
      });
      // Profile setup sahifasiga yo'naltirish
      router.push("/profile-setup");
    } catch (err: any) {
      const data = err?.data;
      const firstError =
        (data && typeof data === "object" && Object.values(data)[0]) ||
        "Ro'yhatdan o'tishda xatolik";
      setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md card p-8 animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Ro'yhatdan o'tish</h1>
      <p className="text-ink-muted mt-1 text-sm">
        Telefon raqamingiz va parolni kiriting. Boshqa ma'lumotlarni keyin to'ldirasiz.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 p-1 bg-ink-bg rounded-xl">
        <button
          type="button"
          onClick={() => setRole("passenger")}
          className={clsx(
            "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition",
            role === "passenger" ? "bg-white shadow-sm text-ink" : "text-ink-muted"
          )}
        >
          <UserIcon size={16} /> Yo'lovchi
        </button>
        <button
          type="button"
          onClick={() => setRole("driver")}
          className={clsx(
            "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition",
            role === "driver" ? "bg-white shadow-sm text-ink" : "text-ink-muted"
          )}
        >
          <Car size={16} /> Haydovchi
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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

        <div>
          <label className="label">Parol</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              required
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner /> : "Davom etish"}
        </button>
      </form>

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
