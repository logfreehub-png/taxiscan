"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/Spinner";
import {
  MapPinned, ShieldAlert, ChevronDown, ChevronUp, ArrowRight,
  MapPin, Navigation, User as UserIcon, RefreshCw,
} from "lucide-react";

type RoleFilter = "all" | "passenger" | "driver";

interface SearchItem {
  id: number;
  kind: "route" | "local";
  user: { id: number; name: string; phone: string; role: string };
  start: { lat: number; lng: number; address: string };
  end: { lat: number; lng: number; address: string } | null;
  stops: { lat?: number; lng?: number; address?: string }[];
  distance_km: number | null;
  duration_min: number | null;
  min_price_uzs: number | null;
  max_price_uzs: number | null;
  created_at: string;
}

// Boshida nechtasi ko'rinadi — qolgani "ochiladi"
const VISIBLE = 2;
// Jami nechta qidiruv olib kelinadi
const LIMIT = 20;

function fmtPlace(p: { address?: string; lat?: number; lng?: number } | null) {
  if (!p) return "—";
  if (p.address) return p.address;
  if (p.lat != null && p.lng != null) return `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
  return "—";
}

function roleBadge(role: string) {
  if (role === "driver") return { label: "Haydovchi", cls: "bg-blue-100 text-blue-700" };
  if (role === "passenger") return { label: "Yo'lovchi", cls: "bg-green-100 text-green-700" };
  return { label: role, cls: "bg-ink-bg text-ink-muted" };
}

export default function GlobalSearchesPage() {
  const { user, hydrated } = useAuth();
  const [items, setItems] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<RoleFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams({ limit: String(LIMIT) });
      if (role !== "all") qp.set("role", role);
      const r = await apiGet<{ count: number; results: SearchItem[] }>(`/admin/searches/?${qp}`);
      setItems(r.results || []);
      setTotal(r.count || 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (user?.is_superadmin) load();
    else setLoading(false);
  }, [hydrated, role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (hydrated && user && !user.is_superadmin) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto mt-10">
        <ShieldAlert size={36} className="mx-auto text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-ink">Ruxsat yo&apos;q</h2>
        <p className="text-sm text-ink-muted mt-1">Bu bo&apos;lim faqat bosh admin uchun.</p>
      </div>
    );
  }

  const shown = expanded ? items : items.slice(0, VISIBLE);
  const hiddenCount = Math.max(0, items.length - VISIBLE);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <MapPinned size={22} className="text-brand-700" /> Qidiruvlar
          </h1>
          <p className="text-sm text-ink-muted">
            Yo&apos;lovchi va haydovchilar qayerdan qayerga narx qidirgani — eng oxirgi {LIMIT} tasi.
          </p>
        </div>
        <button onClick={load} className="btn-outline" title="Yangilash">
          <RefreshCw size={16} /> Yangilash
        </button>
      </div>

      {/* Rol filtri */}
      <div className="flex items-center gap-2">
        {([
          { k: "all", label: "Hammasi" },
          { k: "passenger", label: "Yo'lovchilar" },
          { k: "driver", label: "Haydovchilar" },
        ] as { k: RoleFilter; label: string }[]).map((t) => (
          <button
            key={t.k}
            onClick={() => { setRole(t.k); setExpanded(false); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${
              role === t.k ? "bg-brand text-ink border-brand" : "border-ink-line text-ink-muted hover:bg-ink-line/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner size={28} /></div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">Hali qidiruv yo&apos;q</div>
      ) : (
        <div className="card overflow-hidden">
          {/* Jadval sarlavhasi */}
          <div className="hidden md:grid grid-cols-[1.3fr_2fr_1fr_0.9fr] gap-3 px-4 py-2.5 bg-ink-bg text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <div>Kim</div>
            <div>Qayerdan → Qayerga</div>
            <div>Narx / masofa</div>
            <div className="text-right">Sana / vaqt</div>
          </div>

          <div className="divide-y divide-ink-line">
            {shown.map((h) => {
              const rb = roleBadge(h.user.role);
              return (
                <div key={h.id} className="grid md:grid-cols-[1.3fr_2fr_1fr_0.9fr] gap-2 md:gap-3 px-4 py-3 items-center">
                  {/* Kim */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <UserIcon size={13} className="text-ink-muted shrink-0" />
                      <span className="font-semibold text-ink text-sm truncate">{h.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-ink-muted">{h.user.phone}</span>
                      <span className={`badge text-[9px] ${rb.cls}`}>{rb.label}</span>
                    </div>
                  </div>

                  {/* Qayerdan → qayerga */}
                  <div className="text-sm min-w-0">
                    {h.kind === "local" ? (
                      <span className="flex items-center gap-1.5 text-ink">
                        <Navigation size={13} className="text-brand-700 shrink-0" />
                        <span className="truncate">Turgan joyida narx ko&apos;rdi</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin size={13} className="text-green-600 shrink-0" />
                        <span className="truncate text-ink" title={fmtPlace(h.start)}>{fmtPlace(h.start)}</span>
                        <ArrowRight size={13} className="text-ink-muted shrink-0" />
                        <MapPin size={13} className="text-red-500 shrink-0" />
                        <span className="truncate text-ink" title={fmtPlace(h.end)}>{fmtPlace(h.end)}</span>
                      </div>
                    )}
                    {h.stops?.length > 0 && (
                      <div className="text-[11px] text-ink-muted mt-0.5">+{h.stops.length} oraliq to&apos;xtash</div>
                    )}
                  </div>

                  {/* Narx / masofa */}
                  <div className="text-xs text-ink-muted">
                    {h.min_price_uzs != null && (
                      <div className="text-ink font-semibold">
                        {h.min_price_uzs.toLocaleString("uz-UZ")}
                        {h.max_price_uzs && h.max_price_uzs !== h.min_price_uzs
                          ? `–${h.max_price_uzs.toLocaleString("uz-UZ")}` : ""} so&apos;m
                      </div>
                    )}
                    {h.distance_km != null && <div>{h.distance_km.toFixed(1)} km</div>}
                  </div>

                  {/* Sana va vaqt */}
                  <div className="text-[11px] text-ink-muted md:text-right">
                    <div className="text-ink font-semibold">
                      {new Date(h.created_at).toLocaleDateString("uz-UZ", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                    </div>
                    <div>
                      {new Date(h.created_at).toLocaleTimeString("uz-UZ", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Eskilarini ochish / yopish */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-ink-bg border-t border-ink-line"
            >
              {expanded ? (
                <><ChevronUp size={16} /> Yopish</>
              ) : (
                <><ChevronDown size={16} /> Eskilarini ko&apos;rsatish (+{hiddenCount})</>
              )}
            </button>
          )}
        </div>
      )}

      {total > LIMIT && (
        <p className="text-[11px] text-ink-muted text-center">
          Jami {total.toLocaleString("uz-UZ")} ta qidiruv — eng oxirgi {LIMIT} tasi ko&apos;rsatildi.
        </p>
      )}
    </div>
  );
}
