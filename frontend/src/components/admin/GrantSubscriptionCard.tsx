"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { Gift, Loader2, CheckCircle2, Bell, BellOff } from "lucide-react";

interface Grant {
  id: number;
  days: number;
  reason: string;
  granted_by: string | null;
  expires_before: string | null;
  expires_after: string;
  notified: boolean;
  created_at: string;
}

const PRESETS = [
  { days: 7, label: "1 hafta" },
  { days: 30, label: "1 oy" },
  { days: 90, label: "3 oy" },
  { days: 180, label: "6 oy" },
  { days: 365, label: "1 yil" },
];

/** Admin: foydalanuvchiga tekin obuna berish + berilganlar tarixi */
export function GrantSubscriptionCard({
  userId,
  userName,
  onGranted,
}: {
  userId: string;
  userName: string;
  onGranted: (subscription: any) => void;
}) {
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);

  const loadGrants = () =>
    apiGet<{ results: Grant[] }>(`/admin/users/${userId}/grant-subscription/`)
      .then((r) => setGrants(r.results || []))
      .catch(() => {});

  useEffect(() => { loadGrants(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!days || days < 1 || days > 730) {
      setError("Kun soni 1 dan 730 gacha bo'lishi kerak");
      return;
    }
    if (!window.confirm(`${userName} ga ${days} kunlik tekin obuna berilsinmi?`)) return;
    setSaving(true);
    setError(null);
    setDone(null);
    try {
      const r = await apiPost<{ subscription: any; grant: Grant }>(
        `/admin/users/${userId}/grant-subscription/`,
        { days, reason: reason.trim(), notify }
      );
      onGranted(r.subscription);
      setDone(`${days} kunlik tekin obuna berildi. Obuna ${formatDateTime(r.grant.expires_after)} gacha faol.`);
      setReason("");
      loadGrants();
    } catch (e: any) {
      setError(e?.data?.detail || "Obunani berib bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5">
      <h3 className="font-bold text-ink mb-1 flex items-center gap-2">
        <Gift size={16} className="text-brand-700" /> Tekin obuna berish
      </h3>
      <p className="text-xs text-ink-muted mb-4">
        Obuna muddati uzaytiriladi. Hozirgi obuna tugamagan bo&apos;lsa, kunlar uning ustiga qo&apos;shiladi.
        To&apos;lov sifatida yozilmaydi.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setDays(p.days)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${
              days === p.days ? "bg-brand text-ink border-brand" : "border-ink-line text-ink-muted hover:bg-ink-line/30"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={730}
            value={days || ""}
            onChange={(e) => setDays(parseInt(e.target.value, 10) || 0)}
            className="input !py-1.5 !px-2 w-20 text-sm"
          />
          <span className="text-sm text-ink-muted">kun</span>
        </div>
      </div>

      <input
        className="input !py-2 text-sm mb-3"
        placeholder="Sabab (masalan: boshida dastur ishlamagani uchun uzr)"
        value={reason}
        maxLength={255}
        onChange={(e) => setReason(e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Foydalanuvchiga xabar yuborilsin
        </label>
        <button onClick={submit} disabled={saving} className="btn-primary !py-2 ml-auto">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
          {days ? `${days} kun tekin berish` : "Tekin berish"}
        </button>
      </div>

      {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      {done && (
        <div className="text-sm text-green-700 mt-3 flex items-center gap-1.5">
          <CheckCircle2 size={15} /> {done}
        </div>
      )}

      {grants.length > 0 && (
        <div className="mt-5 pt-4 border-t border-ink-line">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
            Berilgan tekin obunalar ({grants.length})
          </div>
          <div className="space-y-1.5">
            {grants.map((g) => (
              <div key={g.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-ink-bg text-sm">
                <span className="badge bg-brand text-ink shrink-0">+{g.days} kun</span>
                <div className="flex-1 min-w-0">
                  <div className="text-ink">{g.reason || <span className="text-ink-muted">Sabab ko&apos;rsatilmagan</span>}</div>
                  <div className="text-xs text-ink-muted">
                    {formatDateTime(g.created_at)} · {g.granted_by || "—"} · {formatDateTime(g.expires_after)} gacha
                  </div>
                </div>
                <span title={g.notified ? "Xabar yuborilgan" : "Xabar yuborilmagan"} className="text-ink-muted shrink-0">
                  {g.notified ? <Bell size={14} /> : <BellOff size={14} />}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
