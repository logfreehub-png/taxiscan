"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { apiGet } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { formatUzs } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { useIsPremium } from "@/lib/subscription";
import { PaywallModal } from "@/components/PaywallModal";
import { useRouter } from "next/navigation";
import { Activity, RefreshCcw, TrendingUp, TrendingDown, Lock } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface Series {
  brand: string;
  color: string;
  current: number;
  max: number;
  min: number;
  trend: "up" | "down" | "flat";
  trend_pct: number;
}
interface Resp {
  updated_at: string;
  date?: string;
  tier?: string | null;
  available_tiers?: string[];
  series: Series[];
  chart: Array<Record<string, any>>;
  region?: { id: number; name: string } | null;
  rising?: { brand: string; trend_pct: number; color: string } | null;
}

const TIER_TABS = [
  { code: "econom", label: "Start" },
  { code: "comfort", label: "Comfort" },
  { code: "comfort_plus", label: "Comfort+" },
  { code: "business", label: "Business" },
];

const REFRESH_MS = 60_000; // 1 daqiqa

export default function DriverStats() {
  const { isDark } = useTheme();
  const isPremium = useIsPremium();
  const router = useRouter();
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [secsLeft, setSecsLeft] = useState(60);
  const [selBrand, setSelBrand] = useState<string | null>(null);
  const [tier, setTier] = useState("econom");
  const timerRef = useRef<any>(null);
  const locRef = useRef<{ lat: number; lng: number } | null>(null);

  const gridStroke = isDark ? "#2A313B" : "#E5E8EC";

  const load = async (t = tier) => {
    setRefreshing(true);
    try {
      // Haydovchi turgan joy (lat/lng) berilsa — o'sha tuman narxi ko'rsatiladi
      const l = locRef.current;
      const q = l ? `&lat=${l.lat}&lng=${l.lng}` : "";
      const r = await apiGet<Resp>(`/stats/hourly-by-brand/?tier=${t}${q}`);
      setData(r);
      setSecsLeft(60);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Haydovchi joylashuvini bir marta aniqlaymiz — keyin shu tuman narxini ko'rsatamiz
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          load(tier); // joy aniqlangach o'sha tuman narxi bilan qayta yuklash
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(tier);
    timerRef.current = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          load(tier);
          return 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  const totalRequests = useMemo(
    () => (data?.chart || []).reduce((a, p) => a + Object.keys(p).filter(k => k !== "hour" && k !== "label" && p[k]).length, 0),
    [data]
  );

  // Y-o'qi 0 dan emas — eng arzon (min) dan eng qimmat (max) gacha, chiziqlar
  // butun balandlikni egallaydi (diagramma kattaroq/aniqroq ko'rinadi).
  const yDomain = useMemo<[number, number] | [number, string]>(() => {
    const s = data?.series || [];
    const mins = s.map((x) => x.min).filter((v) => v > 0);
    const maxs = s.map((x) => x.max).filter((v) => v > 0);
    if (!mins.length || !maxs.length) return [0, "auto"];
    const lo = Math.min(...mins);
    const hi = Math.max(...maxs);
    const pad = Math.max(500, Math.round((hi - lo) * 0.2));
    return [Math.max(0, Math.floor((lo - pad) / 500) * 500), Math.ceil((hi + pad) / 500) * 500];
  }, [data]);

  const updatedTime = data?.updated_at
    ? new Date(data.updated_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  // Statistika faqat obunali haydovchilar uchun
  if (!isPremium) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-brand/15 border border-brand flex items-center justify-center">
          <Lock size={38} className="text-brand-700" />
        </div>
        <h1 className="text-2xl font-extrabold text-ink">Statistika obuna bilan ochiladi</h1>
        <p className="text-sm text-ink-muted leading-relaxed">
          Narx tendensiyalari va talab statistikasini ko'rish uchun obuna bo'ling.
        </p>
        <PaywallModal open onClose={() => router.push("/driver")} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Activity size={22} /> Real statistika
          </h1>
          <p className="text-sm text-ink-muted">
            Bugun (00:00–23:59) — har bir taksopark soatma-soat o'rtacha narxi.
            {data?.region ? (
              <> <strong className="text-ink">{data.region.name}</strong> tumani narxlari bo'yicha.</>
            ) : null}{" "}
            Har <strong>1 daqiqada</strong> avtomatik yangilanadi.
          </p>
        </div>
        <button onClick={() => load(tier)} disabled={refreshing} className="btn-outline text-xs">
          <RefreshCcw size={12} className={refreshing ? "animate-spin" : ""} />
          {secsLeft}s da yangilanadi
        </button>
      </div>

      {/* Tarif tanlovi — Start/Comfort/Comfort+/Business */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {TIER_TABS.map((t) => {
          const has = !data?.available_tiers || data.available_tiers.includes(t.code);
          return (
            <button
              key={t.code}
              onClick={() => setTier(t.code)}
              className={`shrink-0 px-4 py-2 text-sm font-semibold rounded-xl transition ${
                tier === t.code
                  ? "bg-ink text-white"
                  : "bg-white border border-ink-line text-ink-muted hover:bg-ink-bg hover:text-ink"
              } ${!has ? "opacity-40" : ""}`}
              title={has ? "" : "Bu tarif bo'yicha bugun ma'lumot yo'q"}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="card p-12 flex justify-center"><Spinner size={28} /></div>
      ) : !data || data.series.length === 0 ? (
        <div className="card p-12 text-center text-ink-muted">
          <p>Hali statistika ma'lumotlari yo'q.</p>
          <p className="text-xs mt-2">Yo'lovchilar narx so'raganida statistika to'planadi.</p>
        </div>
      ) : (
        <>
          {/* Hozir eng tez O'SAYOTGAN brend — dinamika ko'rsatkichi */}
          {data.rising ? (
            <div className="card p-4 flex items-center gap-3 border-2 border-green-500/40 bg-green-50/50">
              <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-green-700 uppercase tracking-wider">Hozir o'smoqda</div>
                <div className="text-lg font-extrabold text-ink truncate">
                  {data.rising.brand} narxi ko'tarilmoqda
                </div>
              </div>
              <div className="text-xl font-extrabold text-green-600 tabular-nums shrink-0">
                +{data.rising.trend_pct}%
              </div>
            </div>
          ) : (
            <div className="card p-3 text-xs text-ink-muted text-center">
              Hozircha narx barqaror — keskin o'sayotgan brend yo'q.
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-ink">
                {selBrand ? `${selBrand} — soatma-soat narx` : "Soatma-soat o'rtacha narx"}
              </h3>
              <div className="flex items-center gap-3">
                {selBrand && (
                  <button onClick={() => setSelBrand(null)} className="text-xs font-bold text-brand-700 hover:underline">
                    Barchasi
                  </button>
                )}
                <div className="text-xs text-ink-muted">
                  Yangilangan: <span className="font-bold text-ink">{updatedTime}</span>
                </div>
              </div>
            </div>
            <div className="h-[460px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chart} margin={{ top: 16, right: 16, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis domain={yDomain} tick={{ fontSize: 11 }} width={44} allowDecimals={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    formatter={(v: any, name: string) => [v ? formatUzs(Number(v)) : "—", name]}
                    labelFormatter={(l) => `Soat ${l}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${gridStroke}`,
                      fontSize: 12,
                      background: isDark ? "#161B22" : "#fff",
                      color: isDark ? "#E6E8EB" : "#0F1216",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
                    onClick={(e: any) => setSelBrand((prev) => (prev === e.dataKey ? null : e.dataKey))}
                  />
                  {data.series.map((s) => {
                    const dim = selBrand && selBrand !== s.brand;
                    const sel = selBrand === s.brand;
                    return (
                      <Line
                        key={s.brand}
                        type="monotone"
                        dataKey={s.brand}
                        stroke={s.color}
                        strokeWidth={sel ? 4 : 2.5}
                        strokeOpacity={dim ? 0.15 : 1}
                        dot={dim ? false : { r: 2.5 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.series.map((s) => {
              const sel = selBrand === s.brand;
              const dim = selBrand && !sel;
              return (
                <button
                  key={s.brand}
                  onClick={() => setSelBrand(sel ? null : s.brand)}
                  className={`card p-3 text-left transition ${
                    sel ? "ring-2 ring-brand bg-brand/10" : ""
                  } ${dim ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="rounded-full"
                      style={{ background: sel ? "#FFCC00" : s.color, width: sel ? 14 : 12, height: sel ? 14 : 12 }}
                    />
                    <div className="text-xs font-bold text-ink truncate">{s.brand}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-extrabold text-ink">
                      {s.current ? formatUzs(s.current) : "—"}
                    </span>
                    {s.trend !== "flat" && (
                      <span className={`inline-flex items-center text-[11px] font-bold ${s.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                        {s.trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {s.trend_pct > 0 ? "+" : ""}{s.trend_pct}%
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-ink-muted">
                    {s.min ? `${formatUzs(s.min)} – ${formatUzs(s.max)}` : "ma'lumot yo'q"}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
