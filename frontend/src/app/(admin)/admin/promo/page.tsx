"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { Ticket, Plus, Trash2, Copy, Check, Power } from "lucide-react";

interface Promo {
  id: number;
  code: string;
  description: string;
  reward_type: "free_days" | "discount";
  free_days: number;
  discount_percent: number;
  audience: "all" | "passenger" | "driver";
  audience_display: string;
  max_uses: number;
  used_count: number;
  valid_until: string | null;
  is_active: boolean;
  status: "active" | "expired" | "used_up" | "disabled";
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  expired: "bg-orange-100 text-orange-700",
  used_up: "bg-ink-bg text-ink-muted",
  disabled: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Faol",
  expired: "Muddati tugagan",
  used_up: "Limit tugagan",
  disabled: "O'chirilgan",
};

export default function AdminPromoPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    reward_type: "free_days",
    free_days: 7,
    discount_percent: 20,
    audience: "all",
    max_uses: 0,
    valid_until: "",
  });

  const load = async () => {
    try {
      const r = await apiGet<{ results: Promo[] }>("/billing/admin/promo-codes/");
      setPromos(r.results || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/billing/admin/promo-codes/", {
        code: form.code.trim().toUpperCase(),
        description: form.description,
        reward_type: form.reward_type,
        free_days: Number(form.free_days),
        discount_percent: Number(form.discount_percent),
        audience: form.audience,
        max_uses: Number(form.max_uses),
        valid_until: form.valid_until || null,
      });
      setForm({ code: "", description: "", reward_type: "free_days", free_days: 7, discount_percent: 20, audience: "all", max_uses: 0, valid_until: "" });
      await load();
    } catch (err: any) {
      setError(err?.data?.code?.[0] || err?.data?.detail || "Yaratib bo'lmadi (kod takrorlanmasin)");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await apiDelete(`/billing/admin/promo-codes/${id}/`);
    setPromos((p) => p.filter((x) => x.id !== id));
  };

  const toggleActive = async (p: Promo) => {
    const updated = await apiPatch<Promo>(`/billing/admin/promo-codes/${p.id}/`, { is_active: !p.is_active });
    setPromos((list) => list.map((x) => (x.id === p.id ? updated : x)));
  };

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const randomCode = () => {
    const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c = "";
    for (let i = 0; i < 6; i++) c += s[Math.floor(Math.random() * s.length)];
    setForm((f) => ({ ...f, code: c }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
        <Ticket size={22} /> Promo-kodlar
      </h1>

      {/* Yaratish formasi */}
      <form onSubmit={create} className="card p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="sm:col-span-2 lg:col-span-3 text-sm font-bold text-ink flex items-center gap-2">
          <Plus size={16} /> Yangi promo-kod
        </div>
        <div>
          <label className="label">Kod</label>
          <div className="flex gap-2">
            <input
              required
              className="input uppercase"
              placeholder="WELCOME10"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <button type="button" onClick={randomCode} className="btn-outline shrink-0 text-xs" title="Tasodifiy kod">
              🎲
            </button>
          </div>
        </div>
        <div>
          <label className="label">Mukofot turi</label>
          <select
            className="input"
            value={form.reward_type}
            onChange={(e) => setForm({ ...form, reward_type: e.target.value })}
          >
            <option value="free_days">Bepul kunlar</option>
            <option value="discount">Obunaga chegirma (%)</option>
          </select>
        </div>
        {form.reward_type === "discount" ? (
          <div>
            <label className="label">Chegirma (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              className="input"
              value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })}
            />
          </div>
        ) : (
          <div>
            <label className="label">Bepul kunlar</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.free_days}
              onChange={(e) => setForm({ ...form, free_days: Number(e.target.value) })}
            />
          </div>
        )}
        <div>
          <label className="label">Kimga</label>
          <select
            className="input"
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
          >
            <option value="all">Hammaga</option>
            <option value="passenger">Yo'lovchilarga</option>
            <option value="driver">Haydovchilarga</option>
          </select>
        </div>
        <div>
          <label className="label">Maksimal foydalanish (0 = cheksiz)</label>
          <input
            type="number"
            min={0}
            className="input"
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Amal qilish muddati (bo'sh = cheksiz)</label>
          <input
            type="date"
            className="input"
            value={form.valid_until}
            onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Izoh</label>
          <input
            className="input"
            placeholder="Masalan: Yangi yil aksiyasi"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        {error && (
          <div className="sm:col-span-2 lg:col-span-3 text-sm text-red-600">{error}</div>
        )}
        <div className="sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : <><Plus size={16} /> Yaratish</>}
          </button>
        </div>
      </form>

      {/* Ro'yxat */}
      {loading ? (
        <div className="card p-12 flex justify-center"><Spinner size={28} /></div>
      ) : promos.length === 0 ? (
        <div className="card p-12 text-center text-ink-muted">Hali promo-kod yo'q.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-bg text-ink-muted text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Kod</th>
                <th className="text-left px-4 py-3">Mukofot</th>
                <th className="text-left px-4 py-3">Kimga</th>
                <th className="text-left px-4 py-3">Foydalanish</th>
                <th className="text-left px-4 py-3">Muddat</th>
                <th className="text-left px-4 py-3">Holat</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className="border-t border-ink-line/50">
                  <td className="px-4 py-3">
                    <button onClick={() => copy(p.code)} className="font-extrabold text-ink inline-flex items-center gap-1.5 hover:text-brand-700">
                      {p.code}
                      {copied === p.code ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="opacity-50" />}
                    </button>
                    {p.description && <div className="text-[11px] text-ink-muted">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-bold text-ink">
                    {p.reward_type === "discount" ? `−${p.discount_percent}%` : `+${p.free_days} kun`}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{p.audience_display}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {p.used_count}{p.max_uses ? ` / ${p.max_uses}` : " / ∞"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
                    {p.valid_until ? new Date(p.valid_until).toLocaleDateString("uz-UZ") : "Cheksiz"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`p-1.5 rounded-lg ${p.is_active ? "text-green-600 hover:bg-green-50" : "text-ink-muted hover:bg-ink-line/40"}`}
                        title={p.is_active ? "Faol — o'chirish" : "O'chirilgan — yoqish"}
                      >
                        <Power size={15} />
                      </button>
                      <button onClick={() => remove(p.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg" title="O'chirish">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
