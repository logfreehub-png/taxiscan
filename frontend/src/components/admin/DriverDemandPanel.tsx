"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { formatUzs } from "@/lib/format";
import { Radar, TrendingUp, Eye, EyeOff } from "lucide-react";
import type { DemandRegion } from "@/lib/api/types";

interface AdminDemand {
  window: string;
  totals: { searches: number; drivers: number; passengers: number; regions: number };
  regions: DemandRegion[];
}

const levelColor = (lvl: string) =>
  lvl === "high" ? "text-green-600" : lvl === "medium" ? "text-orange-500" : "text-ink-muted";
const levelBg = (lvl: string) =>
  lvl === "high" ? "bg-green-500" : lvl === "medium" ? "bg-orange-500" : "bg-ink-muted";

export function DriverDemandPanel() {
  const [data, setData] = useState<AdminDemand | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<AdminDemand>("/admin/demand/"),
      apiGet<{ demand_enabled: boolean }>("/admin/settings/"),
    ])
      .then(([d, s]) => {
        setData(d);
        setEnabled(s.demand_enabled);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    if (enabled === null) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await apiPatch("/admin/settings/", { demand_enabled: next });
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card p-8 flex justify-center"><Spinner size={24} /></div>;
  if (!data) return null;

  const top = data.regions.filter((r) => r.searches > 0).slice(0, 8);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
            <Radar size={18} className="text-brand-700" /> Qayerda yo'lovchi ko'p
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Real qidiruvlar statistikasi · {data.window} · jami {data.totals.searches.toLocaleString()} qidiruv
          </p>
        </div>

        {/* Global yoqish/o'chirish — faqat admin ko'radi */}
        <div className="flex items-center gap-3 bg-ink-bg rounded-xl px-3 py-2">
          <div className="text-right">
            <div className="text-[11px] font-bold text-ink flex items-center gap-1 justify-end">
              {enabled ? <Eye size={12} /> : <EyeOff size={12} />}
              Haydovchilarga ko'rsatish
            </div>
            <div className="text-[10px] text-ink-muted">{enabled ? "Yoqilgan" : "O'chirilgan"}</div>
          </div>
          <button
            onClick={toggle}
            disabled={saving}
            role="switch"
            aria-checked={!!enabled}
            className={`relative w-12 h-6 rounded-full transition disabled:opacity-50 ${enabled ? "bg-green-500" : "bg-ink-line"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {top.map((r, i) => (
          <div
            key={r.region_id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-ink-line"
          >
            <span className="text-xs font-extrabold text-ink-muted w-5">{i + 1}</span>
            <span className="flex-1 text-sm font-semibold text-ink truncate">{r.region_name}</span>
            <span className="text-xs text-ink-muted hidden sm:inline">
              ~{r.avg_price ? formatUzs(r.avg_price) : "—"}
            </span>
            <span className="text-sm font-bold text-ink tabular-nums">
              {r.searches.toLocaleString()}
            </span>
            <span className="text-[11px] text-ink-muted w-12 text-right">{r.share_pct}%</span>
            <span className={`text-[10px] font-extrabold ${levelColor(r.level)} w-14 text-right`}>
              {r.level === "high" ? "Yuqori" : r.level === "medium" ? "O'rta" : "Past"}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${levelBg(r.level)}`} />
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ink-muted mt-3">
        Tizimda: {data.totals.drivers} haydovchi · {data.totals.passengers} yo'lovchi · {data.totals.regions} tuman
      </p>
    </div>
  );
}
