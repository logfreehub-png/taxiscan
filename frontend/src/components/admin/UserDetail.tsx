"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { formatUzs, formatDateTime } from "@/lib/format";
import {
  ArrowLeft, Phone, MapPin, Calendar, User as UserIcon,
  CreditCard, CheckCircle2, XCircle, Clock, RefreshCcw,
  Activity, ShieldCheck, Radar,
} from "lucide-react";

interface DetailResp {
  id: number;
  phone: string;
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
  city: string;
  age: number | null;
  date_of_birth: string | null;
  gender: string;
  avatar_url: string | null;
  home_lat: number | null;
  home_lng: number | null;
  has_card: boolean;
  card_last4: string;
  profile_completed: boolean;
  demand_access: "inherit" | "on" | "off";
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  last_seen: string | null;
  total_seconds_active: number;
  inactive_days: number | null;
  sessions_count: number;
  avg_session_seconds: number;
  subscription: any;
  cards: Array<any>;
  transactions: Array<any>;
  activity_chart: Array<{ date: string; seconds: number; minutes: number; sessions: number }>;
  estimates_count: number;
  total_spent_uzs: number;
  failed_transactions: number;
}

function fmtDuration(sec: number) {
  if (!sec) return "0 soniya";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h} soat ${m} daqiqa ${s} soniya`;
  if (m > 0) return `${m} daqiqa ${s} soniya`;
  return `${s} soniya`;
}

export function UserDetail({ id, backHref }: { id: string; backHref: string }) {
  const [data, setData] = useState<DetailResp | null>(null);
  const [loading, setLoading] = useState(true);

  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    apiGet<DetailResp>(`/admin/users/${id}/`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  const setDemandAccess = async (val: "inherit" | "on" | "off") => {
    if (!data) return;
    const prev = data.demand_access;
    setData({ ...data, demand_access: val });
    setSavingAccess(true);
    try {
      await apiPatch(`/admin/users/${id}/`, { demand_access: val });
    } catch {
      setData({ ...data, demand_access: prev });
    } finally {
      setSavingAccess(false);
    }
  };

  if (loading) return <div className="card p-12 flex justify-center"><Spinner size={32} /></div>;
  if (!data) return <div className="card p-6 text-red-600">Foydalanuvchi topilmadi</div>;

  const TxIcon = (s: string) =>
    s === "success" ? CheckCircle2 : s === "failed" ? XCircle :
    s === "pending" ? Clock : RefreshCcw;
  const txColor = (s: string) =>
    s === "success" ? "text-green-600" : s === "failed" ? "text-red-600" :
    s === "pending" ? "text-orange-500" : "text-blue-600";

  return (
    <div className="space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> Orqaga
      </Link>

      {/* Talab ma'lumoti ruxsati — faqat haydovchilar uchun, faqat admin ko'radi */}
      {data.role === "driver" && (
        <div className="card p-4">
          <div className="flex items-center gap-2 font-bold text-ink">
            <Radar size={16} className="text-brand-700" /> Talab ma'lumoti (haydovchiga ko'rsatish)
          </div>
          <p className="text-xs text-ink-muted mt-1 mb-3">
            "Qayerda yo'lovchi ko'p" / talab statistikasi shu haydovchiga ko'rinadimi.
            Haydovchi bu sozlamani ko'rmaydi — faqat siz boshqarasiz.
          </p>
          <div className="flex flex-wrap gap-2">
            {([
              { v: "inherit", label: "Global sozlama" },
              { v: "on", label: "Yoqilgan" },
              { v: "off", label: "O'chirilgan" },
            ] as const).map((o) => (
              <button
                key={o.v}
                disabled={savingAccess}
                onClick={() => setDemandAccess(o.v)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition disabled:opacity-50 ${
                  data.demand_access === o.v
                    ? "border-ink bg-ink text-white"
                    : "border-ink-line bg-white text-ink-muted hover:border-ink/40"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Profile header */}
      <div className="card p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
        <div className="shrink-0">
          {data.avatar_url ? (
            <img src={data.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover ring-4 ring-brand/20" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-brand flex items-center justify-center text-ink text-3xl font-extrabold">
              {data.full_name?.[0] || "?"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2 flex-wrap">
            {data.full_name || data.phone}
            <span className="badge bg-ink text-white">{data.role}</span>
            {data.is_active ? (
              <span className="badge bg-green-100 text-green-700">Aktiv</span>
            ) : (
              <span className="badge bg-red-100 text-red-700">Bloklangan</span>
            )}
            {data.profile_completed ? (
              <span className="badge bg-blue-100 text-blue-700">
                <ShieldCheck size={10} /> Profil to'liq
              </span>
            ) : (
              <span className="badge bg-orange-100 text-orange-700">Profil to'liq emas</span>
            )}
          </h1>
          <div className="mt-2 text-sm text-ink-muted space-y-1">
            <div className="flex items-center gap-2"><Phone size={13} /> {data.phone}</div>
            {data.city && <div className="flex items-center gap-2"><MapPin size={13} /> {data.city}</div>}
            <div className="flex items-center gap-2">
              <Calendar size={13} /> {data.age ? `${data.age} yosh` : "yosh noma'lum"}
              {data.gender && ` • ${data.gender === "male" ? "Erkak" : "Ayol"}`}
            </div>
            <div className="flex items-center gap-2"><UserIcon size={13} /> @{data.username}</div>
          </div>
        </div>
        <div className="text-right space-y-1 shrink-0">
          <div className="text-xs text-ink-muted">Qo'shilgan</div>
          <div className="text-sm font-bold text-ink">{formatDateTime(data.date_joined)}</div>
          {data.last_login && (
            <>
              <div className="text-xs text-ink-muted mt-1">Oxirgi kirish</div>
              <div className="text-sm font-bold text-ink">{formatDateTime(data.last_login)}</div>
            </>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Jami sarflagan" value={formatUzs(data.total_spent_uzs)} />
        <Stat label="Tranzaksiyalar" value={data.transactions.length.toString()} />
        <Stat label="Muvaffaqiyatsiz" value={data.failed_transactions.toString()} color="text-red-600" />
        <Stat label="Narx so'rovlari" value={data.estimates_count.toString()} />
      </div>

      {/* Aktivlik */}
      <div className="card p-5">
        <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
          <Activity size={16} /> Aktivlik
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
          <Field
            label="Oxirgi aktivlik"
            value={
              data.last_seen
                ? `${formatDateTime(data.last_seen)}${data.inactive_days === 0 ? " (bugun)" : data.inactive_days === 1 ? " (kecha)" : ` (${data.inactive_days} kun oldin)`}`
                : "Hech qachon"
            }
          />
          <Field label="Jami vaqt onlayn" value={fmtDuration(data.total_seconds_active)} />
          <Field label="Sessiyalar soni" value={String(data.sessions_count)} />
          <Field label="O'rtacha sessiya" value={fmtDuration(data.avg_session_seconds)} />
        </div>

        {/* Kunlik aktivlik heatmap */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-ink-muted uppercase font-bold tracking-wider mb-1">
            Oxirgi 30 kun aktivligi
          </div>
          <div className="grid grid-cols-15 gap-1" style={{ gridTemplateColumns: "repeat(30, 1fr)" }}>
            {data.activity_chart.map((d, i) => {
              const intensity =
                d.minutes === 0 ? 0 :
                d.minutes < 5 ? 1 :
                d.minutes < 15 ? 2 :
                d.minutes < 60 ? 3 : 4;
              const colors = ["#E5E8EC", "#FFE066", "#FFCC00", "#CCA300", "#997A00"];
              return (
                <div
                  key={i}
                  className="aspect-square rounded-sm tooltip"
                  style={{ background: colors[intensity] }}
                  title={`${d.date}: ${d.minutes} daqiqa (${d.sessions} sessiya)`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-ink-muted mt-2">
            <span>{data.activity_chart[0]?.date.slice(5)}</span>
            <div className="flex items-center gap-1">
              <span>kam</span>
              {["#E5E8EC", "#FFE066", "#FFCC00", "#CCA300", "#997A00"].map((c) => (
                <div key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />
              ))}
              <span>ko'p</span>
            </div>
            <span>{data.activity_chart[29]?.date.slice(5)}</span>
          </div>
        </div>
      </div>

      {/* Subscription */}
      {data.subscription && (
        <div className="card p-5">
          <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
            <ShieldCheck size={16} /> Obuna ma'lumotlari
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Field label="Holat" value={data.subscription.status_display} />
            <Field label="Qolgan kun" value={`${data.subscription.days_left} kun`} />
            <Field label="Boshlangan" value={formatDateTime(data.subscription.started_at)} />
            <Field label="Tugaydi" value={formatDateTime(data.subscription.expires_at)} />
            <Field label="Auto-renew" value={data.subscription.auto_renew ? "Yoqilgan" : "O'chirilgan"} />
            <Field label="Oylik narx" value={`$${data.subscription.monthly_price_usd}`} />
            {data.subscription.last_charge_at && (
              <Field label="Oxirgi to'lov" value={formatDateTime(data.subscription.last_charge_at)} />
            )}
            {data.subscription.next_charge_at && (
              <Field label="Keyingi to'lov" value={formatDateTime(data.subscription.next_charge_at)} />
            )}
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="card p-5">
        <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
          <CreditCard size={16} /> Kartalar ({data.cards.length})
        </h3>
        {data.cards.length === 0 ? (
          <p className="text-sm text-ink-muted">Karta yo'q</p>
        ) : (
          <div className="space-y-2">
            {data.cards.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-bg">
                <div className="w-12 h-8 rounded-md bg-ink text-brand text-[10px] font-bold flex items-center justify-center uppercase">
                  {c.card_type}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-ink">•••• •••• •••• {c.card_last4}</div>
                  <div className="text-xs text-ink-muted">
                    {c.holder_name} • {String(c.expiry_month).padStart(2, "0")}/{c.expiry_year}
                  </div>
                </div>
                {c.is_default && <span className="badge bg-brand text-ink">Asosiy</span>}
                <span className="text-xs text-ink-muted">{formatDateTime(c.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="card p-5">
        <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
          <Activity size={16} /> Tranzaksiyalar tarixi ({data.transactions.length})
        </h3>
        {data.transactions.length === 0 ? (
          <p className="text-sm text-ink-muted">Tranzaksiyalar yo'q</p>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-auto">
            {data.transactions.map((t) => {
              const Icon = TxIcon(t.status);
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-ink-bg">
                  <Icon size={18} className={txColor(t.status)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-ink truncate">{t.description}</div>
                    <div className="text-xs text-ink-muted">
                      {formatDateTime(t.created_at)} • •••• {t.card_last4}
                    </div>
                    {t.error_message && (
                      <div className="text-xs text-red-600 mt-0.5">{t.error_message}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-ink">${t.amount_usd}</div>
                    <div className="text-xs text-ink-muted">{formatUzs(t.amount_uzs)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-ink" }: any) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">{label}</div>
      <div className={`text-lg font-extrabold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">{label}</div>
      <div className="font-bold text-ink mt-0.5">{value}</div>
    </div>
  );
}
