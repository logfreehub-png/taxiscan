"use client";

import { Car, CarFront, Crown, Briefcase, Lock } from "lucide-react";
import { formatUzs } from "@/lib/format";
import type { Tier } from "@/lib/api/types";
import type { PriceRow } from "@/components/PriceList";

const TIERS: { code: Tier; label: string; icon: any; desc: string; gradient: string; ring: string }[] = [
  {
    code: "econom",
    label: "Start",
    icon: Car,
    desc: "Eng arzon",
    gradient: "from-emerald-50 to-emerald-100/30",
    ring: "ring-emerald-400",
  },
  {
    code: "comfort",
    label: "Comfort",
    icon: CarFront,
    desc: "Qulayroq",
    gradient: "from-sky-50 to-sky-100/30",
    ring: "ring-sky-400",
  },
  {
    code: "comfort_plus",
    label: "Comfort+",
    icon: Crown,
    desc: "Yangi mashina",
    gradient: "from-violet-50 to-violet-100/30",
    ring: "ring-violet-400",
  },
  {
    code: "business",
    label: "Business",
    icon: Briefcase,
    desc: "Premium",
    gradient: "from-amber-50 to-amber-100/30",
    ring: "ring-amber-500",
  },
];

export function TierPicker({
  rows,
  selected,
  onSelect,
  isPremium = true,
  onLocked,
}: {
  rows?: PriceRow[];
  selected: Tier;
  onSelect: (t: Tier) => void;
  /** Obunasiz bo'lsa faqat "Start" tanlanadi, qolgani qulf */
  isPremium?: boolean;
  onLocked?: () => void;
}) {
  // Har tarif uchun eng arzon narxni topish (rows berilmasa - skip)
  const minByTier = TIERS.reduce<Record<string, number | null>>((acc, t) => {
    if (!rows || rows.length === 0) {
      acc[t.code] = null;
      return acc;
    }
    const xs = rows.filter((r) => r.service.tier === t.code).map((r) => r.price_uzs);
    acc[t.code] = xs.length ? Math.min(...xs) : null;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {TIERS.map((t) => {
        const Icon = t.icon;
        const minPrice = minByTier[t.code];
        const isSelected = selected === t.code;
        const locked = !isPremium && t.code !== "econom";
        return (
          <button
            key={t.code}
            onClick={() => (locked ? onLocked?.() : onSelect(t.code))}
            className={`group relative p-3 rounded-2xl border-2 text-left transition-all overflow-hidden ${
              isSelected
                ? "border-brand ring-1 ring-brand bg-brand/10 shadow-md -translate-y-0.5"
                : "border-ink-line bg-white hover:border-ink/40 hover:-translate-y-0.5 hover:shadow-md"
            } ${locked ? "opacity-70" : ""}`}
          >
            {locked && (
              <span className="absolute top-2 right-2 text-brand-700">
                <Lock size={13} />
              </span>
            )}
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${
                isSelected ? "bg-ink text-brand" : "bg-ink-bg text-ink-muted group-hover:text-ink"
              }`}>
                <Icon size={15} />
              </div>
              <span className="font-extrabold text-ink text-sm truncate">{t.label}</span>
            </div>
            <div className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
              {t.desc}
            </div>
            <div className="mt-1.5 tabular-nums">
              {minPrice !== null ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] text-ink-muted font-semibold">dan</span>
                  <span className="text-sm font-extrabold text-ink">
                    {formatUzs(minPrice).replace(" so'm", "")}
                  </span>
                  <span className="text-[10px] text-ink-muted">so'm</span>
                </div>
              ) : (
                <span className="text-ink-muted font-medium text-xs">manzil kerak</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
