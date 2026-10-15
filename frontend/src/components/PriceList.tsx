"use client";

import { useState, useMemo } from "react";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import { formatUzs, formatNum } from "@/lib/format";
import { ExternalLink, Sparkles, ChevronDown, Maximize2, Lock } from "lucide-react";
import { openTaxiApp } from "@/lib/openTaxiApp";

interface ServiceInfo {
  id: number;
  code: string;
  name: string;
  brand?: string;
  tier?: string;
  color: string;
  logo: string | null;
  deeplink_template: string;
  website?: string;
  base_fare_uzs?: number;
  per_km_uzs?: number;
  per_minute_uzs?: number;
  minimum_fare_uzs?: number;
}

export interface PriceRow {
  service: ServiceInfo;
  price_uzs: number;
  distance_km: number;
  duration_min: number;
  surge: number;
  source: string;
  is_cheapest?: boolean;
  diff_from_cheapest?: number;
  breakdown?: {
    base: number;
    distance_part: number;
    time_part: number;
    surge_extra: number;
  };
}

const TIER_LABELS: Record<string, string> = {
  econom: "Start",
  comfort: "Comfort",
  comfort_plus: "Comfort+",
  business: "Business",
  delivery: "Dostavka",
};

const TIER_ORDER = ["econom", "comfort", "comfort_plus", "business", "delivery"];

// Brend bo'yicha aksiya eslatmalari (foydalanuvchiga ko'rsatiladi).
export const BRAND_NOTES: Record<string, string> = {
  // WB Taxi — kartadan to'lovda yo'l pulining 50% i "tarvuz" bonusiga qaytadi
  "WB Taxi": "Kartadan to'lasangiz — yo'l pulining 50% i tarvuz bonusiga qaytadi",
  // Yandex Go — obuna + kartadan to'lovda ball (pul) yig'ilib boradi
  "Yandex Go": "Obuna + kartadan to'lovda ball yig'iladi",
};

export function PriceList({
  rows,
  start,
  end,
  showBreakdown = true,
  groupByBrand = false,
  sortMode = "cheap-first",
  onRowClick,
  highlightMode = "cheapest",
  freeLimit,
  onUpgrade,
}: {
  rows: PriceRow[];
  start: { lat: number; lng: number };
  end: { lat: number; lng: number } | null;
  showBreakdown?: boolean;
  groupByBrand?: boolean;
  sortMode?: "cheap-first" | "expensive-first";
  // Berilsa — kartani bosganda inline breakdown o'rniga bu chaqiriladi
  // (web haydovchi panelida fullscreen modal ochish uchun)
  onRowClick?: (r: PriceRow) => void;
  // Qaysi qatorni ajratib ko'rsatish: yo'lovchida "cheapest" (eng arzon),
  // haydovchida "expensive" (eng ko'p to'laydigan)
  highlightMode?: "cheapest" | "expensive";
  // Bepul foydalanuvchi uchun — shu indeksdan keyingi qatorlar qulflanadi
  freeLimit?: number;
  onUpgrade?: () => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  // Ajratib ko'rsatiladigan qator id'si (rejimga qarab eng arzon yoki eng qimmat)
  const highlightId = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const pick = highlightMode === "expensive"
      ? rows.reduce((a, b) => (b.price_uzs > a.price_uzs ? b : a))
      : rows.reduce((a, b) => (b.price_uzs < a.price_uzs ? b : a));
    return pick.service.id;
  }, [rows, highlightMode]);

  // Sortlash
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) =>
      sortMode === "expensive-first" ? b.price_uzs - a.price_uzs : a.price_uzs - b.price_uzs
    );
    return copy;
  }, [rows, sortMode]);

  // Brend bo'yicha guruhlash
  const grouped = useMemo(() => {
    if (!groupByBrand) return null;
    const map: Record<string, PriceRow[]> = {};
    for (const r of sorted) {
      const k = r.service.brand || r.service.name;
      (map[k] = map[k] || []).push(r);
    }
    // Har bir brend ichida tier bo'yicha tartiblash
    for (const k of Object.keys(map)) {
      map[k].sort(
        (a, b) =>
          TIER_ORDER.indexOf(a.service.tier || "") -
          TIER_ORDER.indexOf(b.service.tier || "")
      );
    }
    return map;
  }, [sorted, groupByBrand]);

  if (!rows || rows.length === 0) {
    return (
      <div className="card p-8 text-center text-ink-muted">
        <p>Hozircha hech narsa yo'q. Manzilni kiriting va narxni hisoblang.</p>
      </div>
    );
  }

  const renderRow = (r: PriceRow, locked = false) => {
    const isOpen = openId === r.service.id;
    const tierLabel = r.service.tier ? TIER_LABELS[r.service.tier] : null;
    const isHighlighted = !locked && r.service.id === highlightId;
    if (locked) {
      return (
        <div
          key={r.service.id}
          onClick={onUpgrade}
          className="relative card-hover overflow-hidden animate-slide-up cursor-pointer"
        >
          <div className="p-4 flex items-center gap-4">
            <ServiceLogo code={r.service.code} color={r.service.color} size={44} />
            <div className="flex-1 min-w-0 opacity-60">
              <h3 className="font-bold text-ink truncate">{r.service.name}</h3>
              <div className="text-xs text-ink-muted mt-0.5">
                {formatNum(r.distance_km, 1)} km • {formatNum(r.duration_min, 0)} daq
              </div>
            </div>
            <div className="text-right shrink-0 relative">
              <div className="text-xl font-extrabold text-ink blur-[6px] select-none">
                {formatUzs(r.price_uzs)}
              </div>
              <div className="absolute inset-0 flex items-center justify-end gap-1 text-brand-700 font-bold text-sm">
                <Lock size={13} /> Obuna
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div
        key={r.service.id}
        onClick={onRowClick ? () => onRowClick(r) : undefined}
        className={`relative card-hover overflow-hidden animate-slide-up ${isHighlighted ? "ring-2 ring-brand" : ""} ${onRowClick ? "cursor-pointer" : ""}`}
      >
        {onRowClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onRowClick(r); }}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-ink-bg/80 hover:bg-ink-line text-ink-muted hover:text-ink flex items-center justify-center transition"
            title="Kattalashtirish"
            aria-label="Kattalashtirish"
          >
            <Maximize2 size={13} />
          </button>
        )}
        <div className="p-4 flex items-center gap-4">
          <ServiceLogo code={r.service.code} color={r.service.color} size={44} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink truncate">
                {groupByBrand && tierLabel ? tierLabel : r.service.name}
              </h3>
              {!groupByBrand && tierLabel && (
                <span className="badge bg-ink-bg text-ink-muted">{tierLabel}</span>
              )}
              {isHighlighted && (
                <span className="badge bg-brand text-ink">
                  <Sparkles size={10} /> {highlightMode === "expensive" ? "Eng ko'p to'laydi" : "Eng arzon"}
                </span>
              )}
              {r.surge > 1.05 && (
                <span className="badge bg-orange-100 text-orange-700">
                  Surge x{formatNum(r.surge, 1)}
                </span>
              )}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              {formatNum(r.distance_km, 1)} km • {formatNum(r.duration_min, 0)} daq
              {r.diff_from_cheapest && r.diff_from_cheapest > 0 ? (
                <span className="ml-2 text-red-600">+{formatUzs(r.diff_from_cheapest)}</span>
              ) : null}
            </div>
            {BRAND_NOTES[r.service.brand || ""] && (
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 rounded-md px-1.5 py-0.5">
                💳 {BRAND_NOTES[r.service.brand || ""]}
              </div>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-xl font-extrabold text-ink">{formatUzs(r.price_uzs)}</div>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              {!onRowClick && showBreakdown && r.breakdown && (
                <button
                  onClick={() => setOpenId(isOpen ? null : r.service.id)}
                  className="text-xs text-ink-muted font-semibold hover:text-ink inline-flex items-center gap-0.5"
                >
                  Hisob <ChevronDown size={12} className={isOpen ? "rotate-180 transition" : "transition"} />
                </button>
              )}
              {(r.service.deeplink_template || r.service.website) && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openTaxiApp(r.service, start, end); }}
                  className="text-xs text-brand-700 font-semibold hover:underline inline-flex items-center gap-1 ml-2"
                  title={`${r.service.name} ilovasini ochish`}
                >
                  Ochish <ExternalLink size={11} />
                </button>
              )}
            </div>
          </div>
        </div>

        {isOpen && r.breakdown && (
          <div className="bg-ink-bg border-t border-ink-line/50 px-4 py-3 text-xs space-y-1 animate-fade-in">
            <Row label="Bazaviy" value={r.breakdown.base} />
            <Row
              label={`${formatNum(r.distance_km, 1)} km x ${formatUzs(r.service.per_km_uzs || 0).replace(" so'm", "")}`}
              value={r.breakdown.distance_part}
            />
            <Row
              label={`${formatNum(r.duration_min, 0)} daq x ${formatUzs(r.service.per_minute_uzs || 0).replace(" so'm", "")}`}
              value={r.breakdown.time_part}
            />
            {r.surge > 1.05 && (
              <Row label={`Surge x${formatNum(r.surge, 2)}`} value={r.breakdown.surge_extra} accent />
            )}
            <div className="border-t border-ink-line pt-1.5 mt-1.5 flex justify-between font-bold text-ink">
              <span>Jami</span>
              <span>{formatUzs(r.price_uzs)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (groupByBrand && grouped) {
    // Brend tartibi: eng arzon birinchi (yoki teskari) tarif boshlangan
    const brandOrder = Object.keys(grouped).sort((a, b) => {
      const ax = grouped[a][0]?.price_uzs ?? 0;
      const bx = grouped[b][0]?.price_uzs ?? 0;
      return sortMode === "expensive-first" ? bx - ax : ax - bx;
    });
    return (
      <div className="space-y-5">
        {brandOrder.map((brand) => (
          <div key={brand} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <ServiceLogo code={grouped[brand][0].service.code} color={grouped[brand][0].service.color} size={20} />
              <h2 className="text-sm font-extrabold text-ink uppercase tracking-wider">{brand}</h2>
              <span className="text-xs text-ink-muted">({grouped[brand].length} tarif)</span>
            </div>
            <div className="space-y-2">{grouped[brand].map((r) => renderRow(r))}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {sorted.map((r, i) => renderRow(r, freeLimit != null && i >= freeLimit))}
    </div>
  );
}

function Row({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-orange-600 font-semibold" : "text-ink-muted"}`}>
      <span>{label}</span>
      <span className="text-ink">{formatUzs(value)}</span>
    </div>
  );
}
