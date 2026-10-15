"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import type { AdminUserListItem, PaginatedResponse } from "@/lib/api/types";
import { Spinner } from "@/components/ui/Spinner";
import { formatUzs } from "@/lib/format";
import {
  Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock,
} from "lucide-react";

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}soat ${m}daq`;
  if (m > 0) return `${m}daq ${s}son`;
  return `${s} soniya`;
}

function formatLastSeen(iso: string | null, inactiveDays: number | null) {
  if (!iso) return <span className="text-red-600 font-semibold">hech qachon</span>;
  if (inactiveDays === null) return "—";
  if (inactiveDays === 0) return <span className="text-green-600 font-semibold">bugun</span>;
  if (inactiveDays === 1) return "kecha";
  if (inactiveDays < 7) return `${inactiveDays} kun oldin`;
  if (inactiveDays < 30) return <span className="text-orange-500">{inactiveDays} kun oldin</span>;
  return <span className="text-red-600 font-semibold">{inactiveDays}+ kun oldin</span>;
}

const FILTERS = [
  { v: "all", label: "Hammasi" },
  { v: "completed", label: "To'liq profil" },
  { v: "incomplete", label: "To'liq emas" },
  { v: "never_logged_in", label: "Hech kirmaganlar" },
  { v: "inactive7", label: "7+ kun yo'q" },
  { v: "inactive30", label: "30+ kun yo'q" },
];

const SORTS = [
  { v: "-date_joined", label: "Yangi qo'shilgan" },
  { v: "-last_seen", label: "Yaqinda kirgan" },
  { v: "-total_seconds_active", label: "Ko'p vaqt o'tkazgan" },
  { v: "date_joined", label: "Eski qo'shilgan" },
];

export function UsersTable({ role }: { role: "passenger" | "driver" }) {
  const [data, setData] = useState<PaginatedResponse<AdminUserListItem> | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("-date_joined");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role, page: String(page), sort });
      if (q.trim()) params.append("q", q.trim());
      if (filter === "completed") params.append("completed", "true");
      if (filter === "incomplete") params.append("completed", "false");
      if (filter === "never_logged_in") params.append("never_logged_in", "true");
      if (filter === "inactive7") params.append("inactive_days", "7");
      if (filter === "inactive30") params.append("inactive_days", "30");
      const r = await apiGet<PaginatedResponse<AdminUserListItem>>(`/admin/users/?${params}`);
      setData(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [page, q, filter, sort, role]);

  const baseHref = role === "driver" ? "/admin/drivers" : "/admin/users";
  const totalPages = data ? Math.ceil(data.count / 10) : 0;

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-ink-line flex items-center gap-3 flex-wrap">
        <h2 className="font-bold text-ink">
          {role === "driver" ? "Haydovchilar" : "Yo'lovchilar"}
          {data && <span className="text-ink-muted font-normal ml-2">({data.count})</span>}
        </h2>
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            placeholder="Telefon, ism, familiya..."
            className="input pl-9 !py-2 !text-sm !w-64"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Filterlar va sort */}
      <div className="px-4 py-2.5 border-b border-ink-line flex items-center gap-2 flex-wrap bg-ink-bg/50">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => { setFilter(f.v); setPage(1); }}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                filter === f.v
                  ? "bg-ink text-white"
                  : "bg-white border border-ink-line text-ink-muted hover:bg-ink-bg"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="ml-auto input !py-1.5 !px-2 !text-xs !w-auto"
        >
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Spinner size={28} /></div>
      ) : !data || data.results.length === 0 ? (
        <div className="p-12 text-center text-ink-muted">Hech kim topilmadi</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-bg text-ink-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Ism / Telefon</th>
                <th className="text-left px-4 py-3">Yosh / Jins</th>
                <th className="text-left px-4 py-3">Profil</th>
                <th className="text-left px-4 py-3">Obuna</th>
                <th className="text-left px-4 py-3">Oxirgi aktivlik</th>
                <th className="text-right px-4 py-3">Jami vaqt</th>
                <th className="text-right px-4 py-3">Sarflagan</th>
                <th className="text-left px-4 py-3">Qo'shilgan</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((u) => (
                <tr key={u.id} className="border-t border-ink-line hover:bg-ink-bg/50">
                  <td className="px-4 py-3">
                    <Link href={`${baseHref}/${u.id}`} className="flex items-center gap-2 group">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-ink-bg flex items-center justify-center text-xs font-bold text-ink-muted">
                          {(u.full_name || u.phone)[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-ink group-hover:underline">
                          {u.full_name || "Ism kiritilmagan"}
                        </div>
                        <div className="text-xs text-ink-muted">{u.phone}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {u.age ? `${u.age} y` : "—"}
                    {u.gender && (
                      <span className={u.gender === "male" ? "text-blue-500" : "text-pink-500"}>
                        {" "}{u.gender === "male" ? "♂" : "♀"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.profile_completed ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                        <CheckCircle2 size={12} /> To'liq
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-orange-500 text-xs font-semibold">
                        <XCircle size={12} /> To'liq emas
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.subscription_status === "active" ? (
                      <span className="badge bg-green-100 text-green-700">Aktiv</span>
                    ) : u.subscription_status === "trial" ? (
                      <span className="badge bg-blue-100 text-blue-700">Trial</span>
                    ) : (
                      <span className="text-ink-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {formatLastSeen(u.last_seen, u.inactive_days)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-ink-muted inline-flex items-center justify-end gap-1">
                    <Clock size={11} /> {formatDuration(u.total_seconds_active)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-ink">
                    {u.total_spent_uzs ? formatUzs(u.total_spent_uzs) : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
                    {new Date(u.date_joined).toLocaleDateString("uz-UZ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="p-3 border-t border-ink-line flex items-center justify-between text-sm">
          <div className="text-ink-muted">
            Sahifa {page} / {totalPages} ({data.count} ta)
          </div>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                    className="btn-outline !py-1 !px-2 text-xs">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="btn-outline !py-1 !px-2 text-xs">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
