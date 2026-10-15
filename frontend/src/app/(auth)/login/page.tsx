"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import { Phone, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(phone, password);
      const dest =
        user.role === "admin"
          ? "/admin/dashboard"
          : user.role === "driver"
          ? "/driver"
          : !user.profile_completed
          ? "/profile-setup"
          : "/passenger";
      router.push(dest);
    } catch (err: any) {
      setError(err?.data?.detail || "Telefon yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md card p-8 animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Hisobingizga kiring</h1>
      <p className="text-ink-muted mt-1 text-sm">Telefon raqamingiz va parolingizni kiriting</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          {loading ? <Spinner /> : "Kirish"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-ink-muted">
        Hisobingiz yo'qmi?{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">
          Ro'yhatdan o'tish
        </Link>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-brand/10 border border-brand/20 text-xs text-ink-muted">
        <span className="font-semibold text-ink">Sinov:</span> +998900000000 / admin12345
      </div>
    </div>
  );
}
