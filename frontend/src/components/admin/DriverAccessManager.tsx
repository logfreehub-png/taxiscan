"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { Search, UserCog } from "lucide-react";

interface DriverItem {
  id: number;
  phone: string;
  full_name: string;
  demand_access: "inherit" | "on" | "off";
}

const OPTIONS = [
  { v: "inherit", label: "Global" },
  { v: "on", label: "Yoqilgan" },
  { v: "off", label: "O'chirilgan" },
] as const;

export function DriverAccessManager() {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<{ results: DriverItem[] }>("/admin/users/?role=driver&page_size=100")
      .then((r) => setDrivers(r.results || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const setAccess = async (id: number, val: "inherit" | "on" | "off") => {
    const prev = drivers.find((d) => d.id === id)?.demand_access;
    setDrivers((ds) => ds.map((d) => (d.id === id ? { ...d, demand_access: val } : d)));
    setSavingId(id);
    try {
      await apiPatch(`/admin/users/${id}/`, { demand_access: val });
    } catch {
      if (prev) setDrivers((ds) => ds.map((d) => (d.id === id ? { ...d, demand_access: prev } : d)));
    } finally {
      setSavingId(null);
    }
  };

  const filtered = drivers.filter(
    (d) =>
      !q.trim() ||
      d.full_name?.toLowerCase().includes(q.toLowerCase()) ||
      d.phone.includes(q)
  );

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <UserCog size={18} className="text-brand-700" />
        <h2 className="text-lg font-extrabold text-ink">Kimga ko'rsatish</h2>
      </div>
      <p className="text-xs text-ink-muted mb-3">
        Har bir haydovchi uchun talab ma'lumotini boshqaring. <strong>Global</strong> — umumiy sozlamaga
        bo'ysunadi, <strong>Yoqilgan/O'chirilgan</strong> — shu haydovchiga majburan. Haydovchilar buni ko'rmaydi.
      </p>

      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          className="input pl-9 py-2 text-sm"
          placeholder="Haydovchi ismi yoki telefoni..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Spinner size={24} /></div>
      ) : (
        <div className="space-y-1.5 max-h-[420px] overflow-auto no-scrollbar">
          {filtered.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-ink-line">
              <Link href={`/admin/drivers/${d.id}`} className="flex-1 min-w-0 hover:underline">
                <div className="text-sm font-semibold text-ink truncate">{d.full_name || d.phone}</div>
                <div className="text-[11px] text-ink-muted">{d.phone}</div>
              </Link>
              <div className="flex gap-1 shrink-0">
                {OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    disabled={savingId === d.id}
                    onClick={() => setAccess(d.id, o.v)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition disabled:opacity-50 ${
                      d.demand_access === o.v
                        ? o.v === "off"
                          ? "border-red-500 bg-red-500 text-white"
                          : o.v === "on"
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-ink bg-ink text-white"
                        : "border-ink-line bg-white text-ink-muted hover:border-ink/40"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-ink-muted">Haydovchi topilmadi</div>
          )}
        </div>
      )}
    </div>
  );
}
