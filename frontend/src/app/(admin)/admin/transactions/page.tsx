"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";
import { Spinner } from "@/components/ui/Spinner";
import { formatUzs, formatDateTime } from "@/lib/format";
import {
  Search, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, RefreshCcw, Receipt,
} from "lucide-react";

interface Txn {
  id: number;
  user: number;
  user_phone: string;
  user_name: string;
  amount_usd: number;
  amount_uzs: number;
  status: "success" | "failed" | "pending" | "refunded";
  status_display: string;
  card_last4: string;
  description: string;
  error_message: string;
  external_id: string;
  created_at: string;
}

const STATUS_FILTERS = [
  { v: "", label: "Hammasi" },
  { v: "success", label: "Muvaffaqiyatli", icon: CheckCircle2, color: "text-green-600" },
  { v: "failed", label: "Xatolik", icon: XCircle, color: "text-red-600" },
  { v: "pending", label: "Kutilmoqda", icon: Clock, color: "text-orange-500" },
  { v: "refunded", label: "Qaytarilgan", icon: RefreshCcw, color: "text-blue-600" },
];

export default function TransactionsPage() {
  const [data, setData] = useState<PaginatedResponse<Txn> | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.append("status", status);
      if (q.trim()) params.append("q", q.trim());
      const r = await apiGet<PaginatedResponse<Txn>>(`/admin/transactions/?${params}`);
      setData(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [page, status, q]);

  const totalPages = data ? Math.ceil(data.count / 10) : 0;

  const StatusIcon = (s: string) => {
    const item = STATUS_FILTERS.find((x) => x.v === s);
    return item?.icon || Receipt;
  };
  const statusColor = (s: string) => STATUS_FILTERS.find((x) => x.v === s)?.color || "text-ink-muted";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Tranzaksiyalar</h1>
        <p className="text-sm text-ink-muted">Barcha to'lov harakatlari va ularning holati</p>
      </div>

      {/* Filterlar */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => { setStatus(f.v); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                status === f.v
                  ? "bg-ink text-white"
                  : "bg-white border border-ink-line text-ink-muted hover:bg-ink-bg"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            placeholder="Telefon, ID, karta..."
            className="input pl-9 !py-2 !text-sm !w-64"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Spinner size={28} /></div>
        ) : !data || data.results.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">Tranzaksiya yo'q</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-bg text-ink-muted text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Holat</th>
                  <th className="text-left px-4 py-3">Foydalanuvchi</th>
                  <th className="text-left px-4 py-3">Tavsif</th>
                  <th className="text-left px-4 py-3">Karta</th>
                  <th className="text-right px-4 py-3">Summa</th>
                  <th className="text-left px-4 py-3">Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((t) => {
                  const Icon = StatusIcon(t.status);
                  return (
                    <tr key={t.id} className="border-t border-ink-line hover:bg-ink-bg/50">
                      <td className="px-4 py-3 text-ink-muted font-mono text-xs">
                        #{t.id}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 font-bold ${statusColor(t.status)}`}>
                          <Icon size={14} /> {t.status_display}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${t.user}`} className="hover:underline">
                          <div className="font-semibold text-ink">{t.user_name || t.user_phone}</div>
                          <div className="text-xs text-ink-muted">{t.user_phone}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-muted max-w-xs truncate">
                        {t.description}
                        {t.error_message && (
                          <div className="text-xs text-red-600 mt-0.5">{t.error_message}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        {t.card_last4 ? `•••• ${t.card_last4}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-ink">${t.amount_usd}</div>
                        <div className="text-xs text-ink-muted">{formatUzs(t.amount_uzs)}</div>
                      </td>
                      <td className="px-4 py-3 text-ink-muted text-xs">
                        {formatDateTime(t.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && totalPages > 1 && (
          <div className="p-3 border-t border-ink-line flex items-center justify-between text-sm">
            <div className="text-ink-muted">Sahifa {page} / {totalPages} ({data.count} ta)</div>
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
    </div>
  );
}
