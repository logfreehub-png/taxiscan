"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { AdminDashboard } from "@/lib/api/types";
import { Spinner } from "@/components/ui/Spinner";
import { formatUzs, formatNum } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import {
  Users, Car, CreditCard, TrendingUp, Activity,
  CheckCircle2, XCircle, Clock, RefreshCcw, UserX, AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar,
} from "recharts";

export default function AdminDashboardPage() {
  const { isDark } = useTheme();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const gridStroke = isDark ? "#2A313B" : "#E5E8EC";
  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${gridStroke}`,
    fontSize: 12,
    background: isDark ? "#161B22" : "#fff",
    color: isDark ? "#E6E8EB" : "#0F1216",
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiGet<AdminDashboard>("/admin/dashboard/");
      setData(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="card p-12 flex justify-center"><Spinner size={32} /></div>;
  if (!data) return <div className="card p-6 text-ink-muted">Ma'lumot yo'q</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-muted">Umumiy ko'rsatkichlar va statistika</p>
        </div>
        <button onClick={load} className="btn-outline text-sm">
          <RefreshCcw size={14} /> Yangilash
        </button>
      </div>

      {/* Asosiy raqamlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="text-brand-700" size={20} />}
          label="Foydalanuvchilar"
          value={data.users.total.toString()}
          sub={`+${data.users.new_7d} (7 kun)`}
        />
        <StatCard
          icon={<Car className="text-blue-600" size={20} />}
          label="Haydovchi / Yo'lovchi"
          value={`${data.users.drivers} / ${data.users.passengers}`}
        />
        <StatCard
          icon={<TrendingUp className="text-green-600" size={20} />}
          label="Jami daromad"
          value={formatUzs(data.revenue.total_uzs)}
          sub={`$${formatNum(data.revenue.total_usd, 2)}`}
        />
        <StatCard
          icon={<Activity className="text-violet-600" size={20} />}
          label="Aktiv obunalar"
          value={data.subscriptions.active.toString()}
          sub={`Trial: ${data.subscriptions.trial}`}
        />
      </div>

      {/* Ro'yxatdan o'tganlar holati */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<UserX className="text-red-500" size={20} />}
          label="Hech kirmagan"
          value={data.users.never_logged_in.toString()}
          sub="ro'yxatdan o'tgan, lekin kirmaganllar"
          color="text-red-600"
        />
        <StatCard
          icon={<AlertCircle className="text-orange-500" size={20} />}
          label="Profil to'ldirilmagan"
          value={data.users.profile_incomplete.toString()}
          sub="ism, jins yoki yosh kiritilmagan"
          color="text-orange-600"
        />
        <StatCard
          icon={<CheckCircle2 className="text-green-600" size={20} />}
          label="To'liq profil"
          value={(data.users.total - data.users.profile_incomplete).toString()}
          sub="profili to'liq to'ldirilganlar"
        />
        <StatCard
          icon={<Users className="text-blue-600" size={20} />}
          label="Yangi (30 kun)"
          value={data.users.new_30d.toString()}
          sub={`shu oyda qo'shilganlar`}
        />
      </div>

      {/* Daromad statistikasi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RevenueCard label="Bugun" value={formatUzs(data.revenue.today_uzs)} />
        <RevenueCard label="7 kun" value={formatUzs(data.revenue.last_7d_uzs)} />
        <RevenueCard label="30 kun" value={formatUzs(data.revenue.last_30d_uzs)} />
      </div>

      {/* Daromad grafigi */}
      <div className="card p-5">
        <h3 className="font-bold text-ink mb-4">30 kunlik daromad</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily_chart}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFCC00" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#FFCC00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4}
                     tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: any) => [formatUzs(Number(v)), "Daromad"]}
                contentStyle={tooltipStyle}
              />
              <Area type="monotone" dataKey="revenue_uzs" stroke={isDark ? "#FFCC00" : "#0F1216"} fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Yangi foydalanuvchilar grafigi */}
      <div className="card p-5">
        <h3 className="font-bold text-ink mb-4">Yangi foydalanuvchilar (30 kun)</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.daily_chart}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4}
                     tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="new_users" fill={isDark ? "#FFCC00" : "#0F1216"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tranzaksiyalar va so'rovlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
            <CreditCard size={16} /> Tranzaksiyalar
          </h3>
          <div className="space-y-2">
            <TxRow icon={<CheckCircle2 size={14} className="text-green-600" />}
                   label="Muvaffaqiyatli" value={data.transactions.success} />
            <TxRow icon={<XCircle size={14} className="text-red-600" />}
                   label="Muvaffaqiyatsiz" value={data.transactions.failed} />
            <TxRow icon={<Clock size={14} className="text-orange-500" />}
                   label="Kutilmoqda" value={data.transactions.pending} />
            <TxRow icon={<RefreshCcw size={14} className="text-blue-600" />}
                   label="Qaytarilgan" value={data.transactions.refunded} />
            <div className="border-t border-ink-line pt-2 mt-2 flex justify-between font-bold">
              <span>Jami</span><span>{data.transactions.total}</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
            <Activity size={16} /> Narx so'rovlari
          </h3>
          <div className="space-y-2">
            <TxRow icon={null} label="O'rtacha kunlik (7 kun)" value={Math.round(data.estimates.last_7d / 7)} />
            <TxRow icon={null} label="Oxirgi 7 kun" value={data.estimates.last_7d} />
            <TxRow icon={null} label="Oxirgi 30 kun" value={data.estimates.last_30d} />
            <div className="border-t border-ink-line pt-2 mt-2 flex justify-between font-bold">
              <span>Jami</span><span>{data.estimates.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = "text-ink" }: any) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
        {icon} {label}
      </div>
      <div className={`text-xl font-extrabold mt-1.5 ${color}`}>{value}</div>
      {sub && <div className="text-xs text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function RevenueCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 bg-gradient-to-br from-brand/15 to-brand/5">
      <div className="text-xs uppercase font-bold text-ink-muted tracking-wider">{label}</div>
      <div className="text-2xl font-extrabold text-ink mt-1">{value}</div>
    </div>
  );
}

function TxRow({ icon, label, value }: any) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="text-ink-muted">{label}</span>
      <span className="ml-auto font-bold text-ink">{value}</span>
    </div>
  );
}
