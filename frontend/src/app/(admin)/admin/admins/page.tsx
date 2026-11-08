"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import {
  UserCog, UserPlus, Trash2, ShieldAlert, CheckCircle2, X,
  Phone, Lock, User as UserIcon, Power,
} from "lucide-react";

interface AdminAccount {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  created_by_name: string | null;
}

export default function AdminAccountsPage() {
  const { user, hydrated } = useAuth();

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Forma
  const [phone, setPhone] = useState("+998");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await apiGet<{ results: AdminAccount[] }>("/admin/admins/");
      setAdmins(r.results || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (user?.is_superadmin) load();
    else setLoading(false);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sidebardan "Admin yaratish" bosilsa (?new=1) — forma avtomatik ochiladi
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      setShowForm(true);
    }
  }, []);

  // Faqat bosh adminga
  if (hydrated && user && !user.is_superadmin) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto mt-10">
        <ShieldAlert size={36} className="mx-auto text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-ink">Ruxsat yo&apos;q</h2>
        <p className="text-sm text-ink-muted mt-1">
          Bu bo&apos;lim faqat bosh admin uchun.
        </p>
      </div>
    );
  }

  const resetForm = () => {
    setPhone("+998");
    setFirstName("");
    setLastName("");
    setPassword("");
    setError(null);
  };

  const create = async () => {
    setError(null);
    setResult(null);
    if (!phone.trim() || phone.trim().length < 7) { setError("To'g'ri telefon raqam kiriting"); return; }
    if (password.length < 4) { setError("Parol kamida 4 ta belgi bo'lsin"); return; }
    setSaving(true);
    try {
      await apiPost("/admin/admins/", {
        phone: phone.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
      });
      setResult("Yangi admin yaratildi");
      resetForm();
      setShowForm(false);
      load();
    } catch (err: any) {
      const d = err?.data;
      setError(d?.phone?.[0] || d?.password?.[0] || d?.detail || "Yaratib bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a: AdminAccount) => {
    setAdmins((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: !x.is_active } : x)));
    try {
      await apiPatch(`/admin/admins/${a.id}/`, { is_active: !a.is_active });
    } catch {
      load();
    }
  };

  const remove = async (a: AdminAccount) => {
    if (!confirm(`${a.full_name || a.phone} adminini butunlay o'chirasizmi?`)) return;
    setAdmins((prev) => prev.filter((x) => x.id !== a.id));
    try {
      await apiDelete(`/admin/admins/${a.id}/`);
    } catch {
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <UserCog size={22} className="text-brand-700" /> Adminlar
          </h1>
          <p className="text-sm text-ink-muted">
            Siz yaratgan adminlar. Ular faqat o&apos;zlari yaratgan promo va xabarlarni ko&apos;radi —
            sizning yuborganlaringiz ularga ko&apos;rinmaydi.
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm((v) => !v); }} className="btn-primary">
          {showForm ? (<><X size={16} /> Yopish</>) : (<><UserPlus size={16} /> Admin yaratish</>)}
        </button>
      </div>

      {result && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={16} /> {result}
        </div>
      )}

      {/* Yaratish formasi */}
      {showForm && (
        <div className="card p-5 space-y-4 max-w-xl">
          <h2 className="font-bold text-ink flex items-center gap-2"><UserPlus size={18} /> Yangi admin</h2>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1.5"><UserIcon size={13} /> Ism</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ism" className="input" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><UserIcon size={13} /> Familiya</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiya" className="input" />
            </div>
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Phone size={13} /> Telefon raqam (login)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" className="input" />
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Lock size={13} /> Parol</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" placeholder="Parol" className="input" />
            <p className="text-[11px] text-ink-muted mt-1">Bu login va parolni adminga bering.</p>
          </div>
          <button onClick={create} disabled={saving} className="btn-primary w-full">
            {saving ? <Spinner /> : (<><UserPlus size={16} /> Yaratish</>)}
          </button>
        </div>
      )}

      {/* Ro'yxat */}
      {loading ? (
        <div className="flex justify-center py-10"><Spinner size={28} /></div>
      ) : admins.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          Hali admin yaratilmagan. Yuqoridagi tugma orqali yarating.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {admins.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-ink truncate">{a.full_name || "— admin"}</div>
                  <div className="text-xs text-ink-muted">{a.phone}</div>
                </div>
                <span className={`badge text-[10px] ${a.is_active ? "bg-green-100 text-green-700" : "bg-ink-bg text-ink-muted"}`}>
                  {a.is_active ? "Faol" : "O'chirilgan"}
                </span>
              </div>
              <div className="mt-3 text-[11px] text-ink-muted">
                {a.last_login
                  ? `Oxirgi kirish: ${new Date(a.last_login).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                  : "Hali kirmagan"}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => toggleActive(a)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold border border-ink-line text-ink-muted hover:bg-ink-line/30"
                >
                  <Power size={13} /> {a.is_active ? "O'chirish" : "Yoqish"}
                </button>
                <button
                  onClick={() => remove(a)}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
                  title="Butunlay o'chirish"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
