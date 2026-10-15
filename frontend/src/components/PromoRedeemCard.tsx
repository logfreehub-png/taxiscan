"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { Ticket, Check, AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/store/auth";

interface Redemption {
  id: number;
  code: string;
  description: string;
  status: "applied" | "expired" | "invalid";
  status_display: string;
  free_days_granted: number;
  redeemed_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  applied: "bg-green-100 text-green-700",
  expired: "bg-orange-100 text-orange-700",
  invalid: "bg-red-100 text-red-700",
};

/** Yo'lovchi/haydovchi promo-kod kiritadigan va ishlatganlarini statuslari bilan ko'radigan card. */
export function PromoRedeemCard({ onApplied }: { onApplied?: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [list, setList] = useState<Redemption[]>([]);

  const loadList = async () => {
    try {
      const r = await apiGet<{ results: Redemption[] }>("/billing/promo/mine/");
      setList(r.results || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await apiPost<{ detail: string }>("/billing/promo/redeem/", { code: code.trim().toUpperCase() });
      setMsg({ ok: true, text: r.detail });
      setCode("");
      await loadList();
      // MUHIM: obuna holatini yangilash — cheklovlar darhol olib tashlanadi
      await useAuth.getState().loadMe().catch(() => {});
      onApplied?.();
    } catch (err: any) {
      setMsg({ ok: false, text: err?.data?.detail || "Promo-kodni qo'llab bo'lmadi" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5">
      <h3 className="font-bold text-ink flex items-center gap-2 mb-3">
        <Ticket size={18} className="text-brand-600" /> Promo-kod
      </h3>
      <form onSubmit={redeem} className="flex gap-2">
        <input
          className="input uppercase flex-1"
          placeholder="Kodni kiriting"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" disabled={loading || !code.trim()} className="btn-primary shrink-0">
          {loading ? <Spinner /> : "Qo'llash"}
        </button>
      </form>

      {msg && (
        <div
          className={`mt-3 text-sm rounded-xl px-3 py-2 flex items-start gap-2 ${
            msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg.ok ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {list.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">Ishlatilgan kodlar</div>
          <div className="space-y-1.5">
            {list.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span className="font-bold text-ink">{r.code}</span>
                <span className="text-ink-muted text-xs">
                  {r.free_days_granted > 0 ? `+${r.free_days_granted} kun` : "chegirma"}
                </span>
                <span className={`badge ml-auto ${STATUS_BADGE[r.status]}`}>{r.status_display}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
