"use client";

import { useEffect, useState, useRef } from "react";
import { apiGet } from "@/lib/api/client";
import { formatUzs } from "@/lib/format";
import { TrendingUp, TrendingDown, Minus, Radio } from "lucide-react";
import { ServiceLogo } from "@/components/ui/ServiceLogo";

interface Row {
  service: { id: number; code: string; name: string; brand: string; color: string; tier: string };
  price_uzs: number;
  prev_price_uzs: number;
  change_uzs: number;
  change_pct: number;
  trend: "up" | "down" | "flat";
  is_cheapest?: boolean;
}

interface LiveResp {
  updated_at: string;
  minute_bucket: string;
  results: Row[];
}

const REFRESH_MS = 30_000; // 30 soniya

/**
 * Real-time narxlar paneli. Har 30 soniyada API ga so'rov yuboradi, har minutda
 * narx o'zgaradi (backend tomonida minute-jitter formula).
 */
export function LivePriceBar({ tier, sortMode }: { tier?: string; sortMode?: "expensive-first" }) {
  const [data, setData] = useState<LiveResp | null>(null);
  const [secsLeft, setSecsLeft] = useState(30);
  const [flashing, setFlashing] = useState(false);
  const prevPrices = useRef<Record<number, number>>({});

  const load = async () => {
    const url = tier ? `/taxi/live-prices/?tier=${tier}` : "/taxi/live-prices/";
    const r = await apiGet<LiveResp>(url);
    setData(r);
    setSecsLeft(30);
    setFlashing(true);
    setTimeout(() => setFlashing(false), 600);
    // Eski narxlarni eslab qolamiz (frontend tomonida ham animatsiya uchun)
    for (const row of r.results) prevPrices.current[row.service.id] = row.price_uzs;
  };

  useEffect(() => {
    load();
    const t = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          load();
          return 30;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [tier]);

  if (!data) return null;

  // Haydovchida — eng qimmatdan pastga (qaysi xizmat ko'p to'laydi)
  const rows =
    sortMode === "expensive-first"
      ? [...data.results].sort((a, b) => b.price_uzs - a.price_uzs)
      : data.results;

  return (
    <div className="card p-4 !border-2 !border-brand/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`relative inline-flex h-2 w-2 ${flashing ? "" : ""}`}>
            <span className={`absolute inline-flex h-full w-full rounded-full bg-red-500 ${flashing ? "animate-ping" : ""}`} />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <h3 className="text-sm font-extrabold text-ink flex items-center gap-1">
            <Radio size={14} /> Real-time narxlar
          </h3>
          <span className="text-[10px] text-ink-muted">
            yangilanish: {data.minute_bucket}
          </span>
        </div>
        <span className="text-[10px] text-ink-muted">
          {secsLeft}s da yangilanadi
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const TrendIcon = r.trend === "up" ? TrendingUp : r.trend === "down" ? TrendingDown : Minus;
          const trendColor =
            r.trend === "up" ? "text-red-600 bg-red-50" :
            r.trend === "down" ? "text-green-600 bg-green-50" :
            "text-ink-muted bg-ink-bg";
          return (
            <div
              key={r.service.id}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${
                r.is_cheapest ? "bg-brand/15 ring-1 ring-brand" : ""
              } ${flashing ? "animate-fade-in" : ""}`}
            >
              <ServiceLogo code={r.service.code} color={r.service.color} size={26} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-ink truncate">{r.service.brand}</div>
              </div>
              <div className="text-sm font-extrabold text-ink tabular-nums">
                {formatUzs(r.price_uzs)}
              </div>
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trendColor} inline-flex items-center gap-0.5 tabular-nums`}>
                <TrendIcon size={10} />
                {r.trend === "flat" ? "0" : `${r.change_pct > 0 ? "+" : ""}${r.change_pct}%`}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-ink-muted mt-2 italic">
        ⓘ 5 km masofa uchun taxminiy. Har minutda surge va talab asosida o'zgaradi.
      </p>
    </div>
  );
}
