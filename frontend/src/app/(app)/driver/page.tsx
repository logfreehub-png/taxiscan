"use client";

import { useState, useEffect, useMemo } from "react";
import { apiPost, apiGet } from "@/lib/api/client";
import type { Region } from "@/lib/api/types";
import { PriceList, type PriceRow } from "@/components/PriceList";
import { PriceDetailModal } from "@/components/PriceDetailModal";
import { Map, type MarkerPoint, type RegionZone } from "@/components/map/Map";
import { Spinner } from "@/components/ui/Spinner";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import { Radar, RefreshCcw, TrendingUp, MapPin, Crown, Layers, Banknote, Users, Activity, Maximize2, X, Lock, Timer } from "lucide-react";
import { formatUzs, formatNum } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { TierPicker } from "@/components/TierPicker";
import { useIsPremium, FREE_VISIBLE_SERVICES } from "@/lib/subscription";
import { PaywallModal } from "@/components/PaywallModal";
import type { Tier, DemandResponse, DemandRegion } from "@/lib/api/types";

const LEVEL_LABEL: Record<string, string> = { high: "Yuqori talab", medium: "O'rtacha", low: "Past talab" };
const levelColor = (lvl: string) =>
  lvl === "high" ? "text-green-600" : lvl === "medium" ? "text-orange-500" : "text-ink-muted";
const levelBg = (lvl: string) =>
  lvl === "high" ? "bg-green-500" : lvl === "medium" ? "bg-orange-500" : "bg-ink-muted";

interface QuickResp {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  region: { id: number; name: string; city: string } | null;
  route: any;
  results: PriceRow[];
  current_surge: number;
}

export default function DriverHome() {
  const { isDark } = useTheme();
  const isPremium = useIsPremium();
  const [paywall, setPaywall] = useState<{ title: string; message: string } | null>(null);
  const openPaywall = (title: string, message: string) => setPaywall({ title, message });
  const tarifLocked = () =>
    openPaywall(
      "Tarif qulflangan",
      "Comfort, Comfort+ va Biznes tariflari obuna bilan ochiladi. Bepul rejimda faqat Start tarifi mavjud."
    );
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [data, setData] = useState<QuickResp | null>(null);
  const [regionStats, setRegionStats] = useState<Record<number, number>>({});
  const [demand, setDemand] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("econom");
  const [detailRow, setDetailRow] = useState<PriceRow | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  // 15 soniyalik avtomatik yangilanish taymeri
  const [secondsLeft, setSecondsLeft] = useState(15);

  useEffect(() => {
    apiGet<{ results: Region[] }>("/taxi/regions/").then((r) => setRegions(r.results || []));
    apiGet<any>("/stats/regions/?days=7").then((r) => {
      const map: Record<number, number> = {};
      for (const x of r.regions || []) map[x.region_id] = x.avg_price;
      setRegionStats(map);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          loadFromPoint(loc.lat, loc.lng);
        },
        () => loadFromPoint(41.311, 69.279),
        { timeout: 6000 }
      );
    } else {
      loadFromPoint(41.311, 69.279);
    }
  }, []);

  const loadFromPoint = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiPost<QuickResp>("/taxi/quick-local/", {
        lat, lng, sample_distance_km: 5,
      });
      setData(r);
    } catch (err: any) {
      setError(err?.message || "Ma'lumot olib bo'lmadi");
    } finally {
      setLoading(false);
    }
    // Talab (demand) — narx yuklanishidan alohida
    apiPost<DemandResponse>("/taxi/demand/", { lat, lng })
      .then(setDemand)
      .catch(() => {});
  };

  // Tanlangan zona talabi (yoki hozirgi joy)
  const activeDemand: DemandRegion | null = useMemo(() => {
    if (!demand) return null;
    if (selectedRegion)
      return demand.regions.find((r) => r.region_id === selectedRegion.id) || demand.here;
    return demand.here;
  }, [demand, selectedRegion]);

  const onRegionChange = (r: Region) => {
    setSelectedRegion(r);
    loadFromPoint(r.center_lat, r.center_lng);
  };

  const refresh = () => {
    setSecondsLeft(15);
    if (selectedRegion) loadFromPoint(selectedRegion.center_lat, selectedRegion.center_lng);
    else if (myLocation) loadFromPoint(myLocation.lat, myLocation.lng);
  };

  // Har 1 soniyada orqaga hisoblash va har 15 soniyada yangilanish
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (selectedRegion) loadFromPoint(selectedRegion.center_lat, selectedRegion.center_lng);
          else if (myLocation) loadFromPoint(myLocation.lat, myLocation.lng);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedRegion, myLocation]);

  // Tarifga qarab filter
  const tierRows = useMemo(
    () => (data?.results || []).filter((r: any) => r.service.tier === tier),
    [data, tier]
  );
  // Eng qimmat birinchi - haydovchi uchun foydali
  const sortedByPrice = useMemo(
    () => [...tierRows].sort((a, b) => b.price_uzs - a.price_uzs),
    [tierRows]
  );
  const mostExpensive = sortedByPrice[0];
  const cheapest = sortedByPrice[sortedByPrice.length - 1];

  const markers: MarkerPoint[] = useMemo(() => {
    const m: MarkerPoint[] = [];
    if (myLocation) m.push({ lat: myLocation.lat, lng: myLocation.lng, type: "driver", label: "Mening joyim" });
    return m;
  }, [myLocation]);

  const demandMap = useMemo(() => {
    const m: Record<number, DemandRegion> = {};
    for (const d of demand?.regions || []) m[d.region_id] = d;
    return m;
  }, [demand]);

  const zones: RegionZone[] = useMemo(
    () =>
      regions.map((r) => {
        const dm = demandMap[r.id];
        const statParts: string[] = [];
        if (dm && dm.searches > 0) statParts.push(`${dm.searches.toLocaleString()} kishi chaqirgan (7 kun)`);
        if (regionStats[r.id]) statParts.push(`O'rtacha: ${formatUzs(regionStats[r.id])}`);
        return {
          id: r.id,
          name: r.name,
          center_lat: r.center_lat,
          center_lng: r.center_lng,
          radius_km: r.radius_km,
          geometry: r.geometry || null,
          highlighted: selectedRegion?.id === r.id,
          // Talab yuqori bo'lsa yashil bilan ajratamiz
          color: dm && dm.level === "high" ? "#16A34A" : undefined,
          stat: statParts.join(" · ") || "Hali ma'lumot yo'q",
        };
      }),
    [regions, selectedRegion, regionStats, demandMap]
  );

  const mapCenter: [number, number] = selectedRegion
    ? [selectedRegion.center_lat, selectedRegion.center_lng]
    : myLocation
    ? [myLocation.lat, myLocation.lng]
    : [41.311, 69.279];

  return (
    <div className="space-y-5">
      {/* Tarif tanlovi — markazda, ikkala ustun ustida, bir tekis */}
      <div className="card p-4">
        <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1.5">
          <Layers size={13} /> Tarifni tanlang
        </h3>
        <div className="max-w-3xl mx-auto">
          <TierPicker
            rows={data?.results}
            selected={tier}
            onSelect={setTier}
            isPremium={isPremium}
            onLocked={tarifLocked}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-4">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <Radar size={18} /> Toshkent zonalari
            </h1>
            <p className="text-xs text-ink-muted">
              Real tuman chegaralari — bossangiz o'sha joydagi narxlar ko'rinadi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              title="Har 15 soniyada avtomatik yangilanadi. Darhol yangilash uchun bosing"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-brand/15 hover:bg-brand/25 text-brand-800 dark:text-brand border border-brand/30 text-xs font-bold transition cursor-pointer"
            >
              {loading ? (
                <Spinner size={12} />
              ) : (
                <Timer size={13} className="text-brand-700 dark:text-brand" />
              )}
              <span className="tabular-nums">{secondsLeft}s</span>
            </button>
            <button onClick={refresh} className="btn-outline text-xs" disabled={loading}>
              <RefreshCcw size={12} /> Yangilash
            </button>
          </div>
        </div>

        <div className="relative">
          <Map
            height={460}
            markers={markers}
            zones={zones}
            onZoneClick={(z) => {
              const r = regions.find((x) => x.id === z.id);
              if (r) onRegionChange(r);
            }}
            fitToContent={false}
            defaultCenter={mapCenter}
            defaultZoom={11}
            dark={isDark}
          />
          {/* Xaritani kattalashtirish (fullscreen) */}
          <button
            onClick={() => setMapFullscreen(true)}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-xl bg-white border border-ink-line shadow-lg flex items-center justify-center hover:bg-ink-line/20 text-ink"
            title="Xaritani kattalashtirish"
            aria-label="Xaritani kattalashtirish"
          >
            <Maximize2 size={18} />
          </button>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-bold text-ink">
            <Layers size={16} /> Tezkor tanlov
          </div>
          <div className="flex flex-wrap gap-1.5">
            {regions.map((r) => (
              <button
                key={r.id}
                onClick={() => onRegionChange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                  selectedRegion?.id === r.id
                    ? "bg-ink text-white"
                    : "bg-white border border-ink-line text-ink-muted hover:bg-ink-bg hover:text-ink"
                }`}
              >
                <MapPin size={11} className="inline mr-1" /> {r.name}
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="space-y-3">
        {/* TALAB (demand) — REAL statistikadan */}
        {activeDemand && demand?.enabled && (
          <div className={`card p-4 border-2 ${activeDemand.level === "high" ? "border-green-500/60" : activeDemand.level === "medium" ? "border-orange-400/50" : "border-ink-line"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className={levelColor(activeDemand.level)} />
              <span className="font-extrabold text-ink truncate">{activeDemand.region_name}</span>
              {activeDemand.rank && (
                <span className="text-[10px] font-bold text-ink-muted">#{activeDemand.rank}</span>
              )}
              <span className={`ml-auto text-[11px] font-extrabold px-2.5 py-1 rounded-full ${levelColor(activeDemand.level)} ${activeDemand.level === "high" ? "bg-green-500/15" : activeDemand.level === "medium" ? "bg-orange-500/15" : "bg-ink-line/40"}`}>
                {LEVEL_LABEL[activeDemand.level]}
              </span>
            </div>
            <div className="flex items-stretch">
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Users size={16} className="text-brand-700" />
                  <span className="text-2xl font-extrabold text-ink">{activeDemand.searches.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">kishi chaqirgan ({demand?.window})</div>
              </div>
              <div className="w-px bg-ink-line mx-1" />
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Banknote size={16} className="text-ink" />
                  <span className="text-2xl font-extrabold text-ink">{activeDemand.avg_price ? formatUzs(activeDemand.avg_price).replace(" so'm", "") : "—"}</span>
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">o'rtacha narx</div>
              </div>
            </div>
            <p className="text-xs text-ink-muted mt-3 leading-snug">
              Bu rayon barcha chaqiruvchilarning <strong className="text-ink">{activeDemand.share_pct}%</strong>ini tashkil etadi.{" "}
              {activeDemand.level === "high"
                ? "Yo'lovchilar shu yerda ko'p qidirmoqda — shu zonada bo'ling!"
                : activeDemand.level === "low"
                ? activeDemand.searches > 0 ? "Talab past — faolroq zonaga o'ting." : "Bu rayonda hali ma'lumot yo'q."
                : "Talab o'rtacha."}
            </p>
          </div>
        )}

        {/* Qayerda yo'lovchi ko'p — REAL qidiruvlar bo'yicha */}
        {demand?.enabled && demand.regions.length > 0 && (
          <div className="card p-3">
            <div className="flex items-center gap-2 mb-2 px-1 text-xs font-extrabold text-ink-muted uppercase tracking-wider">
              <TrendingUp size={14} /> Qayerda yo'lovchi ko'p
              <span className="ml-auto text-[9px] font-semibold normal-case tracking-normal">{demand.window}</span>
            </div>
            <div className="space-y-1.5">
              {demand.regions.filter((r) => r.searches > 0).slice(0, 6).map((r, i) => (
                <button
                  key={r.region_id}
                  onClick={() => {
                    const reg = regions.find((x) => x.id === r.region_id);
                    if (reg) onRegionChange(reg);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition text-left ${
                    selectedRegion?.id === r.region_id ? "border-ink bg-ink-bg" : "border-ink-line hover:bg-ink-bg"
                  }`}
                >
                  <span className="text-xs font-extrabold text-ink-muted w-4">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-ink truncate">{r.region_name}</span>
                  <span className="text-xs text-ink-muted">{r.searches.toLocaleString()} <span className="opacity-60">({r.share_pct}%)</span></span>
                  <span className={`w-2.5 h-2.5 rounded-full ${levelBg(r.level)}`} />
                </button>
              ))}
            </div>
            {demand.totals && (
              <div className="mt-2.5 pt-2.5 border-t border-ink-line/60 flex items-center justify-between text-[11px] text-ink-muted">
                <span>Tizimda: <strong className="text-ink">{demand.totals.searches.toLocaleString()}</strong> kishi chaqirgan</span>
                <span><strong className="text-ink">{demand.totals.drivers}</strong> haydovchi · <strong className="text-ink">{demand.totals.passengers}</strong> yo'lovchi</span>
              </div>
            )}
          </div>
        )}

        {demand?.enabled && demand.destination && (
          <div className="card p-3 bg-ink-bg text-xs flex items-center gap-2 text-ink-muted">
            <span>
              Manzilda (<strong className="text-ink">{demand.destination.region_name}</strong>):{" "}
              {demand.destination.searches.toLocaleString()} kishi chaqirgan
            </span>
            <span className={`ml-auto font-bold ${levelColor(demand.destination.level)}`}>
              {LEVEL_LABEL[demand.destination.level]}
            </span>
          </div>
        )}

        {/* HAYDOVCHI uchun: eng qimmat — eng ko'p pul */}
        {mostExpensive && (
          <div
            onClick={() => setDetailRow(mostExpensive)}
            className="card p-5 bg-gradient-to-br from-brand to-brand-400 cursor-pointer hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <ServiceLogo code={mostExpensive.service.code} color={mostExpensive.service.color} size={48} />
                <div>
                  <div className="text-[10px] uppercase font-bold text-ink/70 tracking-wider flex items-center gap-1">
                    <Banknote size={11} /> Eng ko'p to'laydi
                  </div>
                  <div className="text-xl font-extrabold text-ink">{mostExpensive.service.name}</div>
                  <div className="text-sm text-ink/80">{formatUzs(mostExpensive.price_uzs)}</div>
                </div>
              </div>
              <Crown size={26} className="text-ink/60" />
            </div>
          </div>
        )}

        {isPremium && cheapest && mostExpensive && cheapest.service.id !== mostExpensive.service.id && (
          <div className="card p-3 bg-ink-bg text-xs flex items-center gap-2 text-ink-muted">
            <span>Eng past: <strong className="text-ink">{cheapest.service.name}</strong> — {formatUzs(cheapest.price_uzs)}</span>
            <span className="ml-auto text-green-700 font-bold">
              +{formatUzs(mostExpensive.price_uzs - cheapest.price_uzs)} farq
            </span>
          </div>
        )}

        <div className="card p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted">Hozirgi joy:</span>
            <span className="font-bold text-ink">{data?.region?.name || "Sample yo'nalish"}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-ink-muted">Sample masofa:</span>
            <span className="font-bold text-ink">
              {data ? `${formatNum(data.results[0]?.distance_km || 0, 1)} km` : "—"}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-ink-muted">Surge hozir:</span>
            <span className="font-bold text-ink">x{formatNum(data?.current_surge || 1, 1)}</span>
          </div>
        </div>

        {error && (
          <div className="card p-3 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="card p-8 text-center text-ink-muted flex flex-col items-center gap-2">
            <Spinner size={24} />
            <p className="text-xs">Narxlar yig'ilmoqda...</p>
          </div>
        ) : data && data.results.length > 0 ? (
          <>
            <div className="text-xs font-bold text-ink mt-1 flex items-center gap-1">
              <TrendingUp size={14} /> Qaysi xizmat qancha to'laydi (qimmatdan boshlab)
            </div>
            <p className="text-[11px] text-ink-muted -mt-1">Kartani bosing — to'liq hisob ochiladi</p>
            <PriceList
              rows={tierRows}
              start={data.start}
              end={data.end}
              showBreakdown={true}
              sortMode="expensive-first"
              highlightMode="expensive"
              onRowClick={setDetailRow}
              freeLimit={isPremium ? undefined : FREE_VISIBLE_SERVICES}
              onUpgrade={() =>
                openPaywall("Taksilar qulflangan", "Barcha taksilar narxini ko'rish uchun obuna bo'ling.")
              }
            />
          </>
        ) : null}
        </div>
      </div>

      <PaywallModal
        open={!!paywall}
        onClose={() => setPaywall(null)}
        title={paywall?.title}
        message={paywall?.message}
      />

      {/* Kartani bosganda — katta ekranni egallaydigan narx tafsiloti */}
      <PriceDetailModal
        row={detailRow}
        brandRows={detailRow ? (data?.results || []).filter((r) => r.service.brand === detailRow.service.brand) : []}
        start={data?.start || { lat: 0, lng: 0 }}
        end={data?.end || null}
        onClose={() => setDetailRow(null)}
      />

      {/* Xarita fullscreen — xarita BUTUN ekranni egallaydi, ustiga X + tarif
          select burchakda, pastda narx cardlari (qimmatdan). Sarlavha/card yo'q. */}
      {mapFullscreen && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 sm:p-6 animate-fade-in"
          onClick={() => setMapFullscreen(false)}
        >
        <div
          className="relative w-full h-full sm:w-[92vw] sm:max-w-5xl sm:h-[88vh] sm:rounded-3xl overflow-hidden bg-ink-bg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Xarita — box'ni to'ldiradi */}
          <div className="absolute inset-0">
            <Map
              height="100%"
              markers={markers}
              zones={zones}
              onZoneClick={(z) => {
                const r = regions.find((x) => x.id === z.id);
                if (r) onRegionChange(r);
              }}
              fitToContent={false}
              defaultCenter={mapCenter}
              defaultZoom={11}
              dark={isDark}
            />
          </div>

          {/* Yuqori burchak — tarif select va X yopish */}
          <div className="absolute top-3 right-3 z-[600] flex items-center gap-2">
            <select
              value={tier}
              onChange={(e) => {
                const v = e.target.value as Tier;
                if (!isPremium && v !== "econom") {
                  tarifLocked();
                  return;
                }
                setTier(v);
              }}
              className="h-10 rounded-xl bg-white border border-ink-line shadow-lg px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              title="Tarifni tanlang"
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t.code} value={t.code}>
                  {!isPremium && t.code !== "econom" ? `${t.label} 🔒` : t.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setMapFullscreen(false)}
              className="w-10 h-10 rounded-xl bg-white border border-ink-line shadow-lg flex items-center justify-center text-ink hover:bg-ink-line/20"
              aria-label="Yopish"
              title="Yopish"
            >
              <X size={20} />
            </button>
          </div>

          {/* Pastki narx cardlari — tanlangan rayon, qimmatdan boshlab (xarita ustida suzadi) */}
          <div className="absolute bottom-0 left-0 right-0 z-[600] px-3 pb-4 pt-6 bg-gradient-to-t from-black/30 to-transparent pointer-events-none">
            <div className="pointer-events-auto">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-extrabold text-white drop-shadow uppercase tracking-wider">
                  {selectedRegion ? `${selectedRegion.name} — qimmatdan` : "Rayonni bosing"}
                </span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-white px-1 py-2 drop-shadow">
                  <Spinner size={14} /> Narxlar yig'ilmoqda...
                </div>
              ) : sortedByPrice.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {(isPremium ? sortedByPrice : sortedByPrice.slice(0, FREE_VISIBLE_SERVICES)).map((r, i) => (
                    <div
                      key={r.service.id}
                      className={`shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-2xl shadow-lg border ${
                        i === 0 ? "border-brand bg-brand/95" : "border-ink-line bg-white dark:bg-[rgb(var(--surface))]"
                      }`}
                    >
                      <ServiceLogo code={r.service.code} color={r.service.color} size={28} />
                      <div className="leading-tight">
                        <div className="text-[11px] font-bold text-ink whitespace-nowrap">{r.service.brand}</div>
                        <div className="text-sm font-extrabold text-ink tabular-nums whitespace-nowrap">
                          {formatUzs(r.price_uzs)}
                        </div>
                      </div>
                      {i === 0 && <Crown size={15} className="text-ink" />}
                    </div>
                  ))}
                  {!isPremium && sortedByPrice.length > FREE_VISIBLE_SERVICES && (
                    <button
                      onClick={() =>
                        openPaywall("Taksilar qulflangan", "Barcha taksilar narxini ko'rish uchun obuna bo'ling.")
                      }
                      className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-2xl shadow-lg border border-ink-line bg-white dark:bg-[rgb(var(--surface))] text-brand-700 font-bold text-sm"
                    >
                      <Lock size={15} /> +{sortedByPrice.length - FREE_VISIBLE_SERVICES} · Obuna
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-white px-1 py-2 drop-shadow">Rayonni bosing — narxlar shu yerda chiqadi</div>
              )}
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

const TIER_OPTIONS: { code: string; label: string }[] = [
  { code: "econom", label: "Start" },
  { code: "comfort", label: "Comfort" },
  { code: "comfort_plus", label: "Comfort+" },
  { code: "business", label: "Business" },
];
