"use client";

import { Route, Clock, Eye, EyeOff } from "lucide-react";
import { formatUzs, formatNum } from "@/lib/format";

export interface AlternativeRoute {
  id: number;
  label: string;
  distance_km: number;
  duration_min: number;
  cheapest_price_uzs: number;
  is_fastest?: boolean;
  is_cheapest_route?: boolean;
}

const ROUTE_COLORS = ["#FFCC00", "#00C853", "#0066FF", "#FF6B35"];
const TOTAL_SLOTS = 4;

export function RoutePicker({
  routes,
  selectedId,
  visibleIds,
  onSelect,
  onToggleVisible,
}: {
  routes: AlternativeRoute[];
  selectedId: number;
  visibleIds: number[];
  onSelect: (id: number) => void;
  onToggleVisible: (id: number) => void;
}) {
  // Doim 4 ta slot — bo'sh joylarni placeholder bilan to'ldiramiz
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => routes[i] || null);

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Route size={14} className="text-ink-muted" />
        <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">
          Yo'l variantlari
        </h3>
        <span className="ml-auto text-[10px] text-ink-muted">
          ko'z ikonini bosib xaritada ko'rsating
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {slots.map((r, idx) => {
          const color = ROUTE_COLORS[idx];
          const slotNum = idx + 1;

          // Bo'sh slot - hech qanday yo'l yo'q
          if (!r) {
            return (
              <div
                key={`slot-${idx}`}
                className="p-3 rounded-xl border-2 border-dashed border-ink-line/60 bg-ink-bg/50 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1 opacity-40">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ background: color }}
                  />
                  <span className="font-extrabold text-ink-muted text-sm">
                    {slotNum}-yo'l
                  </span>
                </div>
                <div className="text-[10px] text-ink-muted/70 mt-2 italic">
                  yo'l topilmadi
                </div>
              </div>
            );
          }

          const isSel = selectedId === r.id;
          const isVisible = visibleIds.includes(r.id);

          return (
            <div
              key={r.id}
              className={`relative p-3 rounded-xl border-2 transition-all ${
                isSel
                  ? "border-ink shadow-md -translate-y-0.5"
                  : "border-ink-line bg-white hover:border-ink/30 hover:-translate-y-0.5"
              }`}
              style={isSel ? { background: `linear-gradient(135deg, ${color}25, ${color}08)` } : {}}
            >
              {/* Eye toggle - xaritada ko'rsatish */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisible(r.id); }}
                className={`absolute top-1.5 right-1.5 p-1 rounded-md transition ${
                  isVisible
                    ? "text-ink hover:bg-ink-line/40"
                    : "text-ink-muted/50 hover:text-ink hover:bg-ink-line/40"
                }`}
                title={isVisible ? "Xaritadan yashirish" : "Xaritada ko'rsatish"}
              >
                {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>

              <button
                onClick={() => onSelect(r.id)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ background: color, boxShadow: isSel ? `0 0 0 2px ${color}40` : "none" }}
                  />
                  <span className="font-extrabold text-ink text-sm">{slotNum}-yo'l</span>
                  {r.is_cheapest_route && (
                    <span className="badge bg-brand text-ink ml-auto mr-5 text-[9px]">Arzon</span>
                  )}
                </div>
                <div className="text-[10px] text-ink-muted flex items-center gap-2">
                  <span>{formatNum(r.distance_km, 1)} km</span>
                  <span className="opacity-50">•</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Clock size={9} /> {formatNum(r.duration_min, 0)} daq
                  </span>
                </div>
                <div className="text-base font-extrabold text-ink mt-1">
                  <span className="text-[10px] font-semibold text-ink-muted mr-0.5">dan</span>
                  {formatUzs(r.cheapest_price_uzs)}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
