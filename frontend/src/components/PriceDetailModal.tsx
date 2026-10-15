"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Clock, Route as RouteIcon, Banknote, Crown } from "lucide-react";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import { formatUzs, formatNum } from "@/lib/format";
import type { PriceRow } from "@/components/PriceList";
import { BRAND_NOTES } from "@/components/PriceList";
import { openTaxiApp } from "@/lib/openTaxiApp";

const TIER_LABELS: Record<string, string> = {
  econom: "Start",
  comfort: "Comfort",
  comfort_plus: "Comfort+",
  business: "Business",
  delivery: "Dostavka",
};

/**
 * Katta ekranni egallaydigan narx tafsiloti — haydovchi kartani bosganda
 * (mobiledagidek) to'liq hisob-kitob va boshqa tariflari bilan ochiladi.
 */
export function PriceDetailModal({
  row,
  brandRows,
  start,
  end,
  onClose,
}: {
  row: PriceRow | null;
  brandRows?: PriceRow[];
  start: { lat: number; lng: number };
  end: { lat: number; lng: number } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    // Faqat modal ochiq (row bor) bo'lganda scroll'ni qulflaymiz —
    // aks holda sahifa scroll'i butunlay yo'qoladi.
    if (!row) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, row]);

  if (!row || typeof document === "undefined") return null;

  const hasLink = !!(row.service.deeplink_template || row.service.website);
  const b = row.breakdown;
  // Shu brendning boshqa tariflari (bor bo'lsa) — pastda ko'rsatamiz
  const others = (brandRows || []).filter((r) => r.service.id !== row.service.id);

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[rgb(var(--surface))] w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-auto no-scrollbar shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sarlavha — brend rangi bilan */}
        <div
          className="p-6 pb-5 relative"
          style={{ background: `linear-gradient(135deg, ${row.service.color}22, ${row.service.color}05)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/70 dark:bg-black/30 flex items-center justify-center hover:bg-white"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-4">
            <ServiceLogo code={row.service.code} color={row.service.color} size={56} />
            <div className="min-w-0">
              <div className="text-xl font-extrabold text-ink truncate">{row.service.name}</div>
              {row.service.tier && (
                <span className="badge bg-white/70 dark:bg-black/20 text-ink-muted mt-1">
                  {TIER_LABELS[row.service.tier] || row.service.tier}
                </span>
              )}
            </div>
          </div>
          <div className="mt-5 flex items-end gap-3">
            <div className="text-4xl font-extrabold text-ink">{formatUzs(row.price_uzs)}</div>
            {row.surge > 1.05 && (
              <span className="badge bg-orange-100 text-orange-700 mb-1.5">
                Surge x{formatNum(row.surge, 2)}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <RouteIcon size={14} /> {formatNum(row.distance_km, 1)} km
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {formatNum(row.duration_min, 0)} daqiqa
            </span>
          </div>
          {BRAND_NOTES[row.service.brand || ""] && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-100 rounded-lg px-3 py-1.5">
              💳 {BRAND_NOTES[row.service.brand || ""]}
            </div>
          )}
        </div>

        {/* Hisob-kitob */}
        {b && (
          <div className="px-6 py-5 space-y-2.5 text-sm border-t border-ink-line/40">
            <div className="text-xs font-extrabold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Banknote size={13} /> Narx qanday hisoblandi
            </div>
            <DetailRow label="Bazaviy (podacha + posadka)" value={b.base} />
            <DetailRow
              label={`${formatNum(row.distance_km, 1)} km × ${formatUzs(row.service.per_km_uzs || 0).replace(" so'm", "")}`}
              value={b.distance_part}
            />
            <DetailRow
              label={`${formatNum(row.duration_min, 0)} daq × ${formatUzs(row.service.per_minute_uzs || 0).replace(" so'm", "")}`}
              value={b.time_part}
            />
            {row.surge > 1.05 && (
              <DetailRow label={`Surge x${formatNum(row.surge, 2)}`} value={b.surge_extra} accent />
            )}
            <div className="border-t border-ink-line pt-2.5 mt-1 flex justify-between font-extrabold text-ink text-base">
              <span>Jami</span>
              <span>{formatUzs(row.price_uzs)}</span>
            </div>
          </div>
        )}

        {/* Shu brendning boshqa tariflari */}
        {others.length > 0 && (
          <div className="px-6 py-4 border-t border-ink-line/40">
            <div className="text-xs font-extrabold text-ink-muted uppercase tracking-wider mb-2">
              Boshqa tariflar
            </div>
            <div className="space-y-1.5">
              {others
                .sort((a, c) => a.price_uzs - c.price_uzs)
                .map((r) => (
                  <div
                    key={r.service.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-ink-bg text-sm"
                  >
                    <span className="text-ink font-medium">
                      {r.service.tier ? TIER_LABELS[r.service.tier] || r.service.name : r.service.name}
                    </span>
                    <span className="font-bold text-ink">{formatUzs(r.price_uzs)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Ochish tugmasi — sayt emas, imkon bo'lsa ilova ochiladi */}
        {hasLink && (
          <div className="px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={() => openTaxiApp(row.service, start, end)}
              className="btn-primary w-full justify-center"
            >
              {row.service.name} ilovasida ochish <ExternalLink size={15} />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function DetailRow({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-orange-600 font-semibold" : "text-ink-muted"}`}>
      <span>{label}</span>
      <span className="text-ink font-medium">{formatUzs(value)}</span>
    </div>
  );
}
