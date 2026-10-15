"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api/client";
import { Map, type RegionZone } from "@/components/map/Map";
import { Spinner } from "@/components/ui/Spinner";
import { DriverDemandPanel } from "@/components/admin/DriverDemandPanel";
import { DriverAccessManager } from "@/components/admin/DriverAccessManager";
import { LivePriceBar } from "@/components/LivePriceBar";
import { useTheme } from "@/lib/theme";
import { Radar } from "lucide-react";
import type { Region, DemandRegion } from "@/lib/api/types";

interface AdminDemand {
  window: string;
  totals: { searches: number; drivers: number; passengers: number; regions: number };
  regions: DemandRegion[];
}

const LEVEL_FILL: Record<string, string> = {
  high: "#16A34A",
  medium: "#EA580C",
  low: "#94A2B0",
};

const LIVE_TIERS = [
  { code: "econom", label: "Start" },
  { code: "comfort", label: "Comfort" },
  { code: "comfort_plus", label: "Comfort+" },
  { code: "business", label: "Business" },
];

export default function AdminRegionsPage() {
  const { isDark } = useTheme();
  const [regions, setRegions] = useState<Region[]>([]);
  const [demand, setDemand] = useState<AdminDemand | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [liveTier, setLiveTier] = useState("econom");

  useEffect(() => {
    Promise.all([
      apiGet<{ results: Region[] }>("/taxi/regions/"),
      apiGet<AdminDemand>("/admin/demand/"),
    ])
      .then(([r, d]) => {
        setRegions(r.results || []);
        setDemand(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const demandById = useMemo(() => {
    const m: Record<number, DemandRegion> = {};
    for (const d of demand?.regions || []) m[d.region_id] = d;
    return m;
  }, [demand]);

  const zones: RegionZone[] = useMemo(
    () =>
      regions.map((r) => {
        const dm = demandById[r.id];
        const hasData = dm && dm.searches > 0;
        return {
          id: r.id,
          name: r.name,
          center_lat: r.center_lat,
          center_lng: r.center_lng,
          radius_km: r.radius_km,
          geometry: r.geometry || null,
          color: hasData ? LEVEL_FILL[dm.level] : undefined,
          highlighted: selectedRegion?.id === r.id || (hasData && dm.level === "high"),
          stat: dm
            ? `${dm.searches.toLocaleString()} qidiruv${dm.share_pct ? ` · ${dm.share_pct}%` : ""}`
            : "Ma'lumot yo'q",
        };
      }),
    [regions, demandById, selectedRegion]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Radar size={22} className="text-brand-700" /> Rayonlar va talab
        </h1>
        <p className="text-sm text-ink-muted">
          Tuman xaritasi, "Qayerda yo'lovchi ko'p" statistikasi va haydovchilarga ko'rsatishni boshqarish
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-600" /> Yuqori talab</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500" /> O'rtacha</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "#94A2B0" }} /> Past / ma'lumot yo'q</span>
      </div>

      {/* Xarita */}
      {loading ? (
        <div className="card p-12 flex justify-center"><Spinner size={32} /></div>
      ) : (
        <Map
          height={460}
          zones={zones}
          fitToContent={false}
          defaultCenter={[41.311, 69.279]}
          defaultZoom={11}
          dark={isDark}
          onZoneClick={(z) => setSelectedRegion(regions.find((r) => r.id === z.id) || null)}
        />
      )}

      {/* Real-time narxlar — faqat rayon tanlanganda chiqadi (admin uchun) */}
      {selectedRegion ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-ink">
              Real-time narxlar — <span className="text-brand-700">{selectedRegion.name}</span>
            </h3>
            <button
              onClick={() => setSelectedRegion(null)}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Yopish ✕
            </button>
          </div>
          {/* Tarif tanlash qatori — bosilganda real-time o'sha tarif bo'yicha */}
          <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
            {LIVE_TIERS.map((t) => (
              <button
                key={t.code}
                onClick={() => setLiveTier(t.code)}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                  liveTier === t.code
                    ? "bg-ink text-white"
                    : "bg-white border border-ink-line text-ink-muted hover:bg-ink-bg hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <LivePriceBar tier={liveTier} />
        </div>
      ) : (
        <div className="card p-4 text-sm text-ink-muted text-center">
          Real-time narxlarni ko'rish uchun xaritadan rayonni tanlang
        </div>
      )}

      {/* Talab paneli (toggle + reyting) */}
      <DriverDemandPanel />

      {/* Kimga ko'rsatish — haydovchilar ro'yxati */}
      <DriverAccessManager />
    </div>
  );
}
