"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Map as MapIcon, MapPin, Navigation, X, Smartphone } from "lucide-react";
import { apiGet } from "@/lib/api/client";
import { formatDateTime, formatUzs } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";
import { Map, type MarkerPoint } from "@/components/map/Map";

interface Point {
  lat: number;
  lng: number;
  address?: string;
}

interface SearchItem {
  id: number;
  kind: "route" | "local";
  start: Point;
  end: Point | null;
  stops: Point[];
  distance_km: number | null;
  duration_min: number | null;
  min_price_uzs: number | null;
  max_price_uzs: number | null;
  route_coords: [number, number][];
  created_at: string;
}

interface DeviceSessionItem {
  device_name: string;
  ip_address: string | null;
  created_at: string;
  last_seen: string;
  active: boolean;
  revoke_reason: string;
}

interface Resp {
  count: number;
  results: SearchItem[];
  sessions: DeviceSessionItem[];
}

const coord = (p: Point) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
const REVOKE_LABEL: Record<string, string> = {
  logout: "Chiqib ketgan",
  other_device: "Boshqa qurilma chiqargan",
  relogin: "Qayta kirgan",
};

/** Admin: foydalanuvchining qidiruv tarixi (qator-qator) va har birini kartada ko'rish. */
export function UserSearchHistory({ userId }: { userId: string | number }) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "route" | "local">("all");
  const [selected, setSelected] = useState<SearchItem | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<Resp>(`/admin/users/${userId}/searches/`)
      .then(setData)
      .catch(() => setData({ count: 0, results: [], sessions: [] }))
      .finally(() => setLoading(false));
  }, [userId]);

  const rows = useMemo(
    () => (data?.results || []).filter((r) => filter === "all" || r.kind === filter),
    [data, filter]
  );

  return (
    <>
      {/* Qurilma sessiyalari */}
      {data && data.sessions.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
            <Smartphone size={16} /> Qurilmalar
          </h3>
          <div className="space-y-1.5">
            {data.sessions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-ink-bg">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.active ? "bg-green-500" : "bg-ink-line"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-ink truncate">{s.device_name}</div>
                  <div className="text-xs text-ink-muted">
                    Kirgan: {formatDateTime(s.created_at)} · Oxirgi faollik: {formatDateTime(s.last_seen)}
                    {s.ip_address ? ` · ${s.ip_address}` : ""}
                  </div>
                </div>
                <span className={`text-xs font-bold ${s.active ? "text-green-600" : "text-ink-muted"}`}>
                  {s.active ? "Aktiv" : REVOKE_LABEL[s.revoke_reason] || "Yopilgan"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h3 className="font-bold text-ink flex items-center gap-2 flex-1">
            <History size={16} /> Qidiruv tarixi ({data?.count ?? 0})
          </h3>
          <div className="flex gap-1 p-1 bg-ink-bg rounded-xl text-xs font-semibold">
            {([
              ["all", "Hammasi"],
              ["route", "Marshrut"],
              ["local", "Turgan joyda"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg transition ${filter === k ? "bg-white shadow-sm text-ink" : "text-ink-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-muted">Qidiruvlar yo'q</p>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-[rgb(var(--surface))] text-left text-xs text-ink-muted uppercase">
                <tr className="border-b border-ink-line">
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="py-2 pr-3 font-semibold">Qachon</th>
                  <th className="py-2 pr-3 font-semibold">Turi</th>
                  <th className="py-2 pr-3 font-semibold">Qayerdan</th>
                  <th className="py-2 pr-3 font-semibold">Qayerga</th>
                  <th className="py-2 pr-3 font-semibold whitespace-nowrap">Masofa</th>
                  <th className="py-2 pr-3 font-semibold whitespace-nowrap">Narx</th>
                  <th className="py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-ink-line/60 hover:bg-ink-bg">
                    <td className="py-2.5 pr-3 text-ink-muted tabular-nums">{i + 1}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">{formatDateTime(r.created_at)}</td>
                    <td className="py-2.5 pr-3">
                      {r.kind === "route" ? (
                        <span className="badge bg-brand/20 text-ink">Marshrut</span>
                      ) : (
                        <span className="badge bg-blue-100 text-blue-700">Turgan joyda</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 max-w-[220px] truncate" title={r.start.address || coord(r.start)}>
                      {r.start.address || coord(r.start)}
                    </td>
                    <td className="py-2.5 pr-3 max-w-[220px] truncate" title={r.end ? r.end.address || coord(r.end) : ""}>
                      {r.end ? (
                        <>
                          {r.end.address || coord(r.end)}
                          {r.stops?.length ? <span className="text-ink-muted"> (+{r.stops.length} to'xtash)</span> : null}
                        </>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">
                      {r.distance_km != null ? `${r.distance_km.toFixed(1)} km` : "—"}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">
                      {r.min_price_uzs ? formatUzs(r.min_price_uzs) : "—"}
                      {r.max_price_uzs && r.max_price_uzs !== r.min_price_uzs ? (
                        <span className="text-ink-muted"> – {formatUzs(r.max_price_uzs)}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => setSelected(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-bold hover:bg-ink-soft whitespace-nowrap"
                      >
                        <MapIcon size={13} /> Kartadan ko'rish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <SearchMapModal item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function SearchMapModal({ item, onClose }: { item: SearchItem; onClose: () => void }) {
  const markers: MarkerPoint[] = [
    { lat: item.start.lat, lng: item.start.lng, type: "start", label: item.start.address || "A" },
    ...(item.stops || []).map((s, i) => ({
      lat: s.lat,
      lng: s.lng,
      type: "stop" as const,
      stopLabel: String.fromCharCode(66 + i),
      label: s.address,
    })),
    ...(item.end ? [{ lat: item.end.lat, lng: item.end.lng, type: "end" as const, label: item.end.address || "B" }] : []),
  ];
  const geometry = item.route_coords?.length ? { type: "LineString", coordinates: item.route_coords } : null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-ink-line">
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-ink">
              {item.kind === "route" ? "Marshrut qidiruvi" : "Turgan joyda qidirgan"}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">{formatDateTime(item.created_at)}</div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Navigation size={14} className="text-brand-700 shrink-0" />
                <span className="truncate">{item.start.address || coord(item.start)}</span>
              </div>
              {item.end && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-ink shrink-0" />
                  <span className="truncate">{item.end.address || coord(item.end)}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-bg text-ink-muted" aria-label="Yopish">
            <X size={20} />
          </button>
        </div>
        <Map
          height={460}
          markers={markers}
          routeGeometry={geometry}
          fitToContent
          defaultCenter={[item.start.lat, item.start.lng]}
          defaultZoom={15}
        />
      </div>
    </div>
  );
}
