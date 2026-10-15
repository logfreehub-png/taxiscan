"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { apiDelete } from "@/lib/api/client";
import { Bell, Send, Search, X, CheckCircle2, MessageSquare, Eye, EyeOff, Users2, Trash2 } from "lucide-react";

type Target = "all" | "passengers" | "drivers" | "user";

interface Batch {
  id: number;
  title: string;
  body: string;
  kind: string;
  target: string;
  sms: boolean;
  total: number;
  read: number;
  unread: number;
  created_at: string;
}

const TARGET_LABEL: Record<string, string> = {
  all: "Hammaga", passengers: "Yo'lovchilarga", drivers: "Haydovchilarga", user: "Bitta odamga",
};

interface UserLite {
  id: number;
  phone: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export default function AdminNotificationsPage() {
  const [target, setTarget] = useState<Target>("all");
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState("");
  const [body, setBody] = useState("");
  const [sms, setSms] = useState(false);
  const [kind, setKind] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bitta odam tanlash
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<UserLite | null>(null);

  // Yuborilgan xabarlar tarixi (har 15s yangilanib turadi — status o'zgaradi)
  const [batches, setBatches] = useState<Batch[]>([]);
  const loadBatches = async () => {
    try {
      const r = await apiGet<{ results: Batch[] }>("/admin/notification-batches/");
      setBatches(r.results || []);
    } catch { /* ignore */ }
  };
  useEffect(() => {
    loadBatches();
    const t = setInterval(loadBatches, 15_000);
    return () => clearInterval(t);
  }, []);

  const deleteBatch = async (id: number) => {
    if (!confirm("Bu xabarni o'chirasizmi? Foydalanuvchilardan ham o'chiriladi.")) return;
    setBatches((prev) => prev.filter((b) => b.id !== id)); // optimistik
    try {
      await apiDelete(`/admin/notification-batches/${id}/`);
    } catch {
      loadBatches();
    }
  };

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await apiGet<{ results: UserLite[] }>(`/admin/users/?q=${encodeURIComponent(query.trim())}&page_size=8`);
      setResults(r.results || []);
    } finally {
      setSearching(false);
    }
  };

  const send = async () => {
    setError(null);
    setResult(null);
    if (!title.trim()) { setError("Sarlavha kiriting"); return; }
    if (target === "user" && !picked) { setError("Foydalanuvchini tanlang"); return; }
    setLoading(true);
    try {
      const r = await apiPost<{ detail: string }>("/admin/send-notification/", {
        title: title.trim(),
        preview: preview.trim(),
        body: body.trim(),
        kind,
        sms,
        target,
        user_id: target === "user" ? picked?.id : undefined,
      });
      setResult(r.detail);
      setTitle("");
      setPreview("");
      setBody("");
      loadBatches();
    } catch (err: any) {
      setError(err?.data?.detail || "Yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const targets: { key: Target; label: string }[] = [
    { key: "all", label: "Hammaga" },
    { key: "passengers", label: "Yo'lovchilarga" },
    { key: "drivers", label: "Haydovchilarga" },
    { key: "user", label: "Bitta odamga" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Bell size={22} className="text-brand-700" /> Xabarlar
        </h1>
        <p className="text-sm text-ink-muted">
          Foydalanuvchilarga bildirishnoma (va ixtiyoriy SMS) yuboring va yuborilganlarni kuzating.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
      {/* CHAP — yuborilgan xabarlar tarixi */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-ink-muted uppercase tracking-wider">Yuborilgan xabarlar</h2>
        {batches.length === 0 ? (
          <div className="card p-6 text-sm text-ink-muted text-center">Hali xabar yuborilmagan</div>
        ) : (
          batches.map((b) => {
            const pct = b.total > 0 ? Math.round((b.read / b.total) * 100) : 0;
            return (
              <div key={b.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-ink text-sm truncate">{b.title}</div>
                    {b.body && <div className="text-xs text-ink-muted line-clamp-2 mt-0.5">{b.body}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="badge bg-ink-bg text-ink text-[10px] flex items-center gap-1">
                        <Users2 size={11} /> {TARGET_LABEL[b.target] || b.target}
                      </span>
                      <button
                        onClick={() => deleteBatch(b.id)}
                        className="p-1 rounded-md text-ink-muted hover:text-red-600 hover:bg-red-50"
                        title="O'chirish"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {b.sms && <span className="badge bg-brand/20 text-brand-700 text-[10px]">SMS</span>}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="text-ink-muted flex items-center gap-1"><Users2 size={13} /> {b.total}</span>
                  <span className="text-green-600 flex items-center gap-1"><Eye size={13} /> {b.read} o'qidi</span>
                  <span className="text-orange-500 flex items-center gap-1"><EyeOff size={13} /> {b.unread} ko'rmadi</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-ink-bg overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 text-[10px] text-ink-muted">
                  {pct}% o'qidi · {new Date(b.created_at).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* O'NG — yuborish formasi */}
      <div className="space-y-4">
      {result && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={16} /> {result}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card p-5 space-y-4">
        {/* Kimga */}
        <div>
          <label className="label">Kimga</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {targets.map((t) => (
              <button
                key={t.key}
                onClick={() => setTarget(t.key)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                  target === t.key ? "bg-brand text-ink border-brand" : "border-ink-line text-ink-muted hover:bg-ink-line/30"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bitta odam tanlash */}
        {target === "user" && (
          <div>
            {picked ? (
              <div className="flex items-center justify-between rounded-xl bg-ink-bg px-3 py-2.5">
                <div className="text-sm">
                  <span className="font-bold text-ink">{picked.first_name || "—"} {picked.last_name || ""}</span>
                  <span className="text-ink-muted ml-2">{picked.phone}</span>
                </div>
                <button onClick={() => setPicked(null)} className="text-ink-muted hover:text-ink"><X size={16} /></button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    placeholder="Telefon yoki ism bo'yicha qidirish"
                    className="input flex-1"
                  />
                  <button onClick={search} disabled={searching} className="btn-outline">
                    {searching ? <Spinner size={16} /> : <Search size={16} />}
                  </button>
                </div>
                {results.length > 0 && (
                  <div className="mt-2 border border-ink-line rounded-xl divide-y divide-ink-line overflow-hidden">
                    {results.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setPicked(u); setResults([]); setQuery(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-ink-line/30"
                      >
                        <span className="font-semibold text-ink">{u.first_name || "—"} {u.last_name || ""}</span>
                        <span className="text-ink-muted ml-2">{u.phone}</span>
                        <span className="text-[10px] text-ink-muted ml-2">{u.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tur */}
        <div>
          <label className="label">Turi</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="input">
            <option value="admin">Admin xabari</option>
            <option value="news">Yangilik</option>
            <option value="promo">Aksiya</option>
            <option value="info">Ma'lumot</option>
          </select>
        </div>

        <div>
          <label className="label">Sarlavha</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Yangi yangilik!" className="input" maxLength={160} />
        </div>
        <div>
          <label className="label">Qisqa tavsif (mini)</label>
          <input value={preview} onChange={(e) => setPreview(e.target.value)} placeholder="Ro'yxatda ko'rinadigan qisqa matn" className="input" maxLength={200} />
          <p className="text-[11px] text-ink-muted mt-1">Ro'yxatda sarlavha ostida ko'rinadi.</p>
        </div>
        <div>
          <label className="label">To'liq tavsif</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Bosib kirilganda ko'rinadigan to'liq matn..." className="input resize-none" />
          <p className="text-[11px] text-ink-muted mt-1">Foydalanuvchi xabarni bosganda ochiladi.</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="w-4 h-4 accent-brand" />
          <MessageSquare size={15} /> SMS ham yuborilsin (provayder ulangan bo'lsa)
        </label>

        <button onClick={send} disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner /> : (<><Send size={16} /> Yuborish</>)}
        </button>
      </div>
      </div>
      </div>
    </div>
  );
}
