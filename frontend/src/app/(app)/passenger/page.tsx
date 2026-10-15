"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { apiPost } from "@/lib/api/client";
import { reverseGeocode } from "@/lib/api/geocoding";
import { AddressInput, type AddressValue } from "@/components/AddressInput";
import { PriceList } from "@/components/PriceList";
import { TierPicker } from "@/components/TierPicker";
import type { Tier } from "@/lib/api/types";
import { Map, type MarkerPoint, type RoutePath } from "@/components/map/Map";
import { Spinner } from "@/components/ui/Spinner";
import { ArrowDownUp, MapPin, Navigation, Search, Info, Crosshair, Plus, Trash2, Lock, Timer } from "lucide-react";
import { formatNum, formatUzs } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { useIsPremium, canSearchToday, markSearchUsed, FREE_VISIBLE_SERVICES } from "@/lib/subscription";
import { PaywallModal } from "@/components/PaywallModal";

interface RouteFromApi {
  id: number;
  label: string;
  distance_km: number;
  duration_min: number;
  geometry: { type: string; coordinates: [number, number][] };
  source: string;
  is_fastest: boolean;
  is_cheapest_route: boolean;
  cheapest_price_uzs: number;
  prices: Array<{ service_id: number; brand: string; tier: string; color: string; price_uzs: number }>;
}

interface EstimateResp {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  stops?: Array<{ lat: number; lng: number; address?: string }>;
  region: { id: number; name: string; city: string } | null;
  route: {
    distance_km: number;
    duration_min: number;
    geometry: { type: string; coordinates: [number, number][] };
    source: string;
  };
  routes: RouteFromApi[];
  results: any[];
  // Yo'nalish xizmat hududidan tashqarida bo'lgani uchun chiqmagan brendlar
  unavailable_services?: Array<{ brand: string; area: string; reason: string }>;
  current_surge: number;
  surge_reason?: string;
  weather?: { boost: number; reason: string | null; temp_c?: number | null };
}

const TIER_LABEL: Record<string, string> = {
  econom: "Start",
  comfort: "Comfort",
  comfort_plus: "Comfort+",
  business: "Business",
  delivery: "Dostavka",
};

export default function PassengerHome() {
  const { isDark } = useTheme();
  const isPremium = useIsPremium();
  const [paywall, setPaywall] = useState<{ title: string; message: string } | null>(null);
  const openPaywall = (title: string, message: string) => setPaywall({ title, message });
  const [start, setStart] = useState<AddressValue | null>(null);
  const [end, setEnd] = useState<AddressValue | null>(null);
  // Oraliq to'xtashlar (A → B → C) — ko'pi bilan 3 ta
  const [stops, setStops] = useState<(AddressValue | null)[]>([]);
  const [data, setData] = useState<EstimateResp | null>(null);
  const [pickupOnly, setPickupOnly] = useState<any | null>(null);
  const [tier, setTier] = useState<Tier>("econom");
  const [loading, setLoading] = useState(false);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState<null | "start" | "end">(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number>(0);
  const [autoLocating, setAutoLocating] = useState(false);

  // 15 soniyalik avtomatik yangilanish taymeri va boshlang'ich narxlar
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [refreshing, setRefreshing] = useState(false);
  const [initialRates, setInitialRates] = useState<any | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);

  const loadInitialRates = async (lat = 41.311, lng = 69.279) => {
    setInitialLoading(true);
    try {
      const r = await apiPost<any>("/taxi/quick-local/", {
        lat,
        lng,
        sample_distance_km: 5,
      });
      setInitialRates(r);
    } catch {
      // ignore
    } finally {
      setInitialLoading(false);
    }
  };

  // Sahifaga kirishi bilan foydalanuvchining joriy joyini va boshlang'ich tariflarni avtomatik olamiz
  const autoLocTried = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoLocTried.current) return;
    autoLocTried.current = true;
    setAutoLocating(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          loadInitialRates(lat, lng);
          try {
            const geo = await reverseGeocode(lat, lng);
            setStart((prev) => prev ?? { label: geo.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
          } catch {
            setStart((prev) => prev ?? { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
          } finally {
            setAutoLocating(false);
          }
        },
        () => {
          setAutoLocating(false);
          loadInitialRates(41.311, 69.279);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      setAutoLocating(false);
      loadInitialRates(41.311, 69.279);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculate = async () => {
    if (!start || !end) {
      setError("Boshlang'ich va manzil kiriting");
      return;
    }
    // Bepul foydalanuvchi — kuniga 1 marta qidiruv
    if (!canSearchToday()) {
      openPaywall(
        "Kunlik limit tugadi",
        "Bepul rejimda kuniga faqat 1 marta narx qidirish mumkin. Cheksiz qidirish uchun obuna bo'ling."
      );
      return;
    }
    setLoading(true);
    setError(null);
    setPickupOnly(null); // "Narxlarni ko'rish" bosilganda taxminiy pickup natijasi yo'qoladi
    try {
      const validStops = stops.filter((s): s is AddressValue => !!s);
      const r = await apiPost<EstimateResp>("/taxi/estimate/", {
        start_lat: start.lat,
        start_lng: start.lng,
        end_lat: end.lat,
        end_lng: end.lng,
        start_address: start.label,
        end_address: end.label,
        stops: validStops.map((s) => ({ lat: s.lat, lng: s.lng, address: s.label })),
      });
      setData(r);
      setSelectedRouteId(0);
      setSecondsLeft(15);
      markSearchUsed();
    } catch (err: any) {
      setError(err?.data?.detail || "Narxni hisoblab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const stateRef = useRef({ data, start, end, stops, tier });
  useEffect(() => {
    stateRef.current = { data, start, end, stops, tier };
  }, [data, start, end, stops, tier]);

  // Har 15 soniyada serverdan real narxlarni yangilash (soxta/random narxlarsiz)
  const refreshLivePrices = async () => {
    const { data: curData, start: curStart, end: curEnd, stops: curStops } = stateRef.current;
    setRefreshing(true);
    try {
      // 1. Agar marshrut hisoblangan bo'lsa (A -> B): serverdan eng so'nggi real narxlar
      if (curData && curStart && curEnd) {
        const validStops = curStops.filter((s): s is AddressValue => !!s);
        const r = await apiPost<EstimateResp>("/taxi/estimate/", {
          start_lat: curStart.lat,
          start_lng: curStart.lng,
          end_lat: curEnd.lat,
          end_lng: curEnd.lng,
          start_address: curStart.label,
          end_address: curEnd.label,
          stops: validStops.map((s) => ({ lat: s.lat, lng: s.lng, address: s.label })),
        });
        setData(r);
        return;
      }

      // 2. Agar marshrut hisoblanmagan bo'lsa ("Boshlang'ich tariflar")
      const lat = curStart?.lat || 41.311;
      const lng = curStart?.lng || 69.279;
      const r = await apiPost<any>("/taxi/quick-local/", { lat, lng, sample_distance_km: 5 });
      setInitialRates(r);
    } catch {
      // server xatosi bo'lsa mavjud real narxlar o'zgarmasdan saqlanadi
    } finally {
      setRefreshing(false);
    }
  };

  const triggerRefresh = () => {
    setSecondsLeft(15);
    refreshLivePrices();
  };

  // Har 1 soniyada orqaga hisoblash va har 15 soniyada yangilanish
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          refreshLivePrices();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // "Hozirgi joyimdan chaqirsam qancha bo'ladi" - manzilsiz, taxminiy 5km
  const quickPickupQuote = async () => {
    if (!start) {
      // Geolocation orqali olamiz
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const geo = await reverseGeocode(lat, lng).catch(() => null);
        const v: AddressValue = { label: geo?.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng };
        setStart(v);
        await runPickupQuote(lat, lng);
      });
      return;
    }
    await runPickupQuote(start.lat, start.lng);
  };

  const runPickupQuote = async (lat: number, lng: number) => {
    setPickupLoading(true);
    setError(null);
    try {
      const r = await apiPost("/taxi/quick-local/", { lat, lng, sample_distance_km: 5 });
      setPickupOnly(r);
    } catch (err: any) {
      setError(err?.message || "Xatolik");
    } finally {
      setPickupLoading(false);
    }
  };

  const swap = () => {
    setStart(end);
    setEnd(start);
  };

  // ——— Yo'nalish nuqtalari: A = ketadigan joy (start), oraliq to'xtashlar B/C…,
  //     oxirgi harf = yakuniy manzil (end). 0 to'xtash → A→B, 1 to'xtash → A→B→C ———
  const stopLetter = (i: number) => String.fromCharCode(66 + i); // B, C, D
  const endLetter = String.fromCharCode(66 + stops.length); // B / C / D / E
  const addStop = () => {
    // Bepul foydalanuvchi faqat A va B nuqta qo'ya oladi
    if (!isPremium) {
      openPaywall(
        "Qo'shimcha manzil qulflangan",
        "Bepul rejimda faqat A va B nuqta mavjud. Bir nechta manzil (C, D...) obuna bilan ishlaydi."
      );
      return;
    }
    setStops((s) => (s.length >= 3 ? s : [...s, null]));
  };
  const updateStop = (i: number, v: AddressValue | null) =>
    setStops((s) => s.map((x, idx) => (idx === i ? v : x)));
  const removeStop = (i: number) => setStops((s) => s.filter((_, idx) => idx !== i));

  const onMapClick = async (lat: number, lng: number) => {
    if (!pickMode) return;
    try {
      const geo = await reverseGeocode(lat, lng);
      const v: AddressValue = { label: geo.label, lat, lng };
      if (pickMode === "start") setStart(v);
      else setEnd(v);
    } catch {
      const v: AddressValue = { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng };
      if (pickMode === "start") setStart(v);
      else setEnd(v);
    }
    setPickMode(null);
  };

  const markers: MarkerPoint[] = [];
  if (start) markers.push({ lat: start.lat, lng: start.lng, type: "start", stopLabel: "A", label: start.label });
  stops.forEach((s, i) => {
    if (s) markers.push({ lat: s.lat, lng: s.lng, type: "stop", stopLabel: stopLetter(i), label: s.label });
  });
  if (end) markers.push({ lat: end.lat, lng: end.lng, type: "end", stopLabel: endLetter, label: end.label });

  // Faqat 1 va 2-yo'l (bepul foydalanuvchi faqat 1 ta yo'lni ko'radi)
  const twoRoutes = useMemo(
    () => (data?.routes || []).slice(0, isPremium ? 2 : 1),
    [data, isPremium]
  );

  // Xarita uchun yo'l chiziqlari — tanlangani ajralib turadi
  const mapRoutes: RoutePath[] = useMemo(
    () =>
      twoRoutes.map((r) => ({
        id: r.id,
        label: r.label,
        geometry: r.geometry,
        selected: r.id === selectedRouteId,
        color: r.id === selectedRouteId ? "#FFCC00" : "#0066FF",
      })),
    [twoRoutes, selectedRouteId]
  );

  // Narx qatorlari — tanlangan yo'l bo'yicha (asosiy = data.results, alternativ = prices'dan)
  const displayedRows = useMemo(() => {
    if (!data) return [];
    const rt = data.routes?.find((r) => r.id === selectedRouteId);
    if (!rt || rt.id === 0) return data.results;
    return rt.prices
      .map((p) => {
        const orig = data.results.find((x: any) => x.service.id === p.service_id);
        if (!orig) return null;
        return { ...orig, price_uzs: p.price_uzs, distance_km: rt.distance_km, duration_min: rt.duration_min, breakdown: undefined };
      })
      .filter(Boolean);
  }, [data, selectedRouteId]);

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
      <div className="space-y-4">
        <div className="card p-5">
          <h1 className="text-xl font-extrabold text-ink mb-4 flex items-center gap-2">
            <Search size={20} /> Narxni hisoblang
          </h1>

          <div className="space-y-4">
            {autoLocating && !start && (
              <div className="flex items-center gap-2 text-xs text-ink-muted bg-ink-bg rounded-lg px-3 py-2 animate-fade-in">
                <Spinner size={13} /> Joriy joyingiz aniqlanmoqda...
              </div>
            )}
            {/* A — ketadigan (turgan) joy */}
            <AddressInput
              label="A — Qayerdan"
              value={start}
              onChange={setStart}
              icon={
                <span className="w-[18px] h-[18px] rounded-full bg-brand text-ink text-[10px] font-extrabold flex items-center justify-center">
                  A
                </span>
              }
              showLocate
              onPickFromMap={() => setPickMode("start")}
            />
            {/* Oraliq to'xtashlar — B, C… (yo'lda tushadigan joylar) */}
            {stops.map((s, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <AddressInput
                    label={`${stopLetter(i)} — oraliq to'xtash`}
                    value={s}
                    onChange={(v) => updateStop(i, v)}
                    icon={
                      <span className="w-[18px] h-[18px] rounded-full bg-ink text-white text-[10px] font-bold flex items-center justify-center">
                        {stopLetter(i)}
                      </span>
                    }
                  />
                </div>
                <button
                  onClick={() => removeStop(i)}
                  className="btn-outline w-12 h-12 !p-0 shrink-0 flex items-center justify-center text-red-600"
                  title="To'xtashni olib tashlash"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <div className="flex items-center justify-center gap-2">
              <button onClick={swap} disabled={!start || !end} className="btn-outline w-10 h-10 !p-0 flex items-center justify-center rounded-full" title="O'rin almashtirish">
                <ArrowDownUp size={16} />
              </button>
              {stops.length < 3 && (
                <button onClick={addStop} className="btn-outline h-10 text-xs" title="Oraliq to'xtash qo'shish">
                  {isPremium ? <Plus size={14} /> : <Lock size={13} />} To'xtash qo'shish
                </button>
              )}
            </div>
            {/* Oxirgi harf — yakuniy manzil */}
            <AddressInput
              label={`${endLetter} — Qayerga (manzil)`}
              value={end}
              onChange={setEnd}
              icon={
                <span className="w-[18px] h-[18px] rounded-full bg-ink text-white text-[10px] font-extrabold flex items-center justify-center">
                  {endLetter}
                </span>
              }
              onPickFromMap={() => setPickMode("end")}
            />

            {pickMode && (
              <div className="bg-brand/15 border border-brand/30 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 animate-fade-in">
                <Info size={16} className="text-brand-700" />
                <span className="text-ink">
                  Xaritada <strong>{pickMode === "start" ? "qayerdan" : "qayerga"}</strong> ekanligini bosing
                </span>
                <button
                  onClick={() => setPickMode(null)}
                  className="ml-auto text-xs text-ink-muted hover:text-ink"
                >
                  bekor
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            <button onClick={calculate} className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner /> : "Narxlarni ko'rish"}
            </button>

            <button
              onClick={quickPickupQuote}
              className="btn-outline w-full"
              disabled={pickupLoading}
              title="Manzil bilmasdan ham hozirgi joyga taxi chaqirish narxini ko'ring"
            >
              {pickupLoading ? <Spinner /> : (
                <><Crosshair size={16} /> Hozirgi joyimdan chaqirsam qancha?</>
              )}
            </button>
          </div>
        </div>

        {/* Yo'l tanlash tugmalari — karta tepasida (1-yo'l / 2-yo'l) */}
        {twoRoutes.length > 1 && (
          <div className="flex gap-2">
            {twoRoutes.map((r, i) => {
              const sel = r.id === selectedRouteId;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteId(r.id)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-left transition ${
                    sel ? "border-brand bg-brand/10" : "border-ink-line hover:bg-ink-line/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? "#FFCC00" : "#0066FF" }} />
                    <span className="text-sm font-bold text-ink">{i + 1}-yo'l</span>
                    {r.is_cheapest_route && <span className="badge bg-brand text-ink text-[10px]">Arzon</span>}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {formatNum(r.distance_km, 1)} km · {formatNum(r.duration_min, 0)} daq · {formatUzs(r.cheapest_price_uzs)} dan
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <Map
          height={340}
          markers={markers}
          routes={mapRoutes}
          onRouteClick={(id) => setSelectedRouteId(id)}
          onMapClick={pickMode ? onMapClick : undefined}
          className={pickMode ? "ring-4 ring-brand/40 cursor-crosshair" : ""}
          dark={isDark}
        />

        {data && (
          <div className="card p-3 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {data.region && (
                <span className="text-ink-muted">
                  Tuman: <span className="font-bold text-ink">{data.region.name}</span>
                </span>
              )}
              <span className="text-ink-muted">
                Yo'l: <span className="font-bold text-ink">{formatNum(data.route.distance_km, 1)} km</span>
              </span>
              <span className="text-ink-muted">
                Vaqt: <span className="font-bold text-ink">{formatNum(data.route.duration_min, 0)} daq</span>
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {data.route.source === "osrm" && (
                <span className="badge bg-green-100 text-green-700">Real yo'l</span>
              )}
              {typeof data.weather?.temp_c === "number" && (
                <span className="badge bg-sky-100 text-sky-700">
                  {Math.round(data.weather.temp_c)}°C
                </span>
              )}
              {data.current_surge > 1.05 && (
                <span className="badge bg-orange-100 text-orange-700">
                  Surge x{formatNum(data.current_surge, 1)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Tarif tanlovi — doim tepada ko'rinadi */}
        <div>
          <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider mb-2 px-1">
            Tarifni tanlang
          </h3>
          <TierPicker
            rows={data?.results || initialRates?.results}
            selected={tier}
            onSelect={(t) => {
              setTier(t);
              setSecondsLeft(15);
            }}
            isPremium={isPremium}
            onLocked={() =>
              openPaywall(
                "Tarif qulflangan",
                "Comfort, Comfort+ va Biznes tariflari obuna bilan ochiladi. Bepul rejimda faqat Start tarifi mavjud."
              )
            }
          />
        </div>

        {/* Pickup-only quote natijasi */}
        {pickupOnly && pickupOnly.results?.length > 0 && (
          <div className="card p-4 bg-gradient-to-br from-brand/20 to-brand/5">
            <div className="flex items-center gap-2 mb-2">
              <Crosshair size={16} className="text-brand-700" />
              <h3 className="font-bold text-ink text-sm">
                Hozirgi joyingizdan ~5 km masofaga taxminiy
              </h3>
              <span className="ml-auto badge bg-white/70 text-ink-muted">{TIER_LABEL[tier]}</span>
            </div>
            {/* Faqat tanlangan tarif (Start/Comfort/...) — hammasini bittada ochmaymiz */}
            <PriceList
              rows={pickupOnly.results.filter((r: any) => r.service.tier === tier)}
              start={pickupOnly.start}
              end={pickupOnly.end}
              showBreakdown={false}
              sortMode="cheap-first"
              freeLimit={isPremium ? undefined : FREE_VISIBLE_SERVICES}
              onUpgrade={() =>
                openPaywall("Taksilar qulflangan", "Barcha taksilar narxini ko'rish uchun obuna bo'ling.")
              }
            />
          </div>
        )}

        {/* Narx nega shunday — talab sababi (pik / ob-havo). Natijalar tepasida. */}
        {data && data.surge_reason && (
          <div
            className={`text-xs font-medium rounded-lg px-3 py-2 ${
              data.current_surge > 1.15
                ? "bg-orange-50 text-orange-800 border border-orange-200"
                : "bg-ink-bg text-ink-muted border border-ink-line/50"
            }`}
          >
            {data.current_surge > 1.15 ? "⚡ " : "✓ "}
            {data.surge_reason}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-ink">
              {data ? `Natijalar · ${TIER_LABEL[tier]}` : "Boshlang'ich tariflar"}
            </h2>
            <button
              onClick={triggerRefresh}
              title="Har 15 soniyada avtomatik yangilanadi. Darhol yangilash uchun bosing"
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/15 hover:bg-brand/25 text-brand-800 dark:text-brand border border-brand/30 transition text-xs font-bold cursor-pointer"
            >
              {refreshing ? (
                <Spinner size={11} />
              ) : (
                <Timer size={12} className="text-brand-700 dark:text-brand" />
              )}
              <span className="tabular-nums">{secondsLeft}s</span>
            </button>
          </div>
          {data && data.results.length > 0 && (
            <span className="text-xs text-ink-muted">{data.results.length} ta tarif</span>
          )}
          {!data && initialRates && initialRates.results?.length > 0 && (
            <span className="text-xs text-ink-muted">Joyda (~5 km)</span>
          )}
        </div>

        {loading && (
          <div className="card p-8 text-center text-ink-muted flex flex-col items-center gap-2">
            <Spinner size={28} />
            <p className="text-sm">Narxlarni yig'ayapmiz...</p>
          </div>
        )}

        {/* Hudud tashqarisi — masalan WB Taxi faqat Toshkent shahri ichida ishlaydi */}
        {!loading && data && (data.unavailable_services?.length || 0) > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs space-y-1">
            {data.unavailable_services!.map((u) => (
              <div key={u.brand} className="flex items-start gap-1.5">
                <Info size={13} className="shrink-0 mt-0.5" />
                <span>{u.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* 1. Marshrut hisoblangan bo'lsa natijalar */}
        {!loading && data && displayedRows.length > 0 && (
          <PriceList
            rows={displayedRows.filter((r: any) => r.service.tier === tier)}
            start={start ? { lat: start.lat, lng: start.lng } : { lat: 0, lng: 0 }}
            end={end ? { lat: end.lat, lng: end.lng } : null}
            sortMode="cheap-first"
            freeLimit={isPremium ? undefined : FREE_VISIBLE_SERVICES}
            onUpgrade={() =>
              openPaywall("Taksilar qulflangan", "Barcha taksilar narxini ko'rish uchun obuna bo'ling.")
            }
          />
        )}

        {/* 2. Marshrut hisoblanmagan bo'lsa ("Boshlang'ich tariflar") */}
        {!loading && !data && (
          initialLoading && !initialRates ? (
            <div className="card p-6 text-center text-ink-muted flex flex-col items-center gap-2">
              <Spinner size={20} />
              <p className="text-xs">Boshlang'ich tariflar yuklanmoqda...</p>
            </div>
          ) : (
            initialRates && initialRates.results?.length > 0 ? (
              <PriceList
                rows={initialRates.results.filter((r: any) => r.service.tier === tier)}
                start={start ? { lat: start.lat, lng: start.lng } : { lat: 41.311, lng: 69.279 }}
                end={null}
                sortMode="cheap-first"
                freeLimit={isPremium ? undefined : FREE_VISIBLE_SERVICES}
                onUpgrade={() =>
                  openPaywall("Taksilar qulflangan", "Barcha taksilar narxini ko'rish uchun obuna bo'ling.")
                }
              />
            ) : null
          )
        )}

        {!loading && ((data?.results?.length || 0) > 0 || (initialRates?.results?.length || 0) > 0) && (
          <div className="text-[10px] text-ink-muted text-center mt-2 leading-relaxed">
            ⓘ Narxlar e'lon qilingan tariflar va real yo'l masofasi asosida <b>taxminiy</b> hisoblanadi.
            Aniq summa tanlangan ilovada ko'rsatiladi.
          </div>
        )}
      </div>

      <PaywallModal
        open={!!paywall}
        onClose={() => setPaywall(null)}
        title={paywall?.title}
        message={paywall?.message}
      />
    </div>
  );
}
