"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type { PaymeCheckout, Subscription, Transaction } from "@/lib/api/types";
import { Spinner } from "@/components/ui/Spinner";
import { formatUzs, formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/store/auth";
import {
  Crown,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<PaymeCheckout | null>(null);

  const load = async () => {
    const [s, t] = await Promise.all([
      apiGet<Subscription>("/billing/subscription/"),
      apiGet<{ results: Transaction[] }>("/billing/transactions/"),
    ]);
    setSub(s);
    setTxns(t.results || []);
    // Obuna holatini auth user'ga ham yozamiz — cheklovlar (gating) darhol yangilanadi
    await useAuth.getState().loadMe().catch(() => {});
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const priceUzs = sub?.monthly_price_uzs || 0;
  const isFree = priceUzs === 0 || ((sub?.discount_percent ?? 0) >= 100);

  const subscribe = async () => {
    setBusy(true);
    try {
      const co = await apiPost<PaymeCheckout>("/billing/payme/checkout/", {});
      if (co.paid || co.amount_uzs === 0) {
        await load();
        await useAuth.getState().loadMe().catch(() => {});
        alert(co.detail || "Obuna 100% chegirma bilan faollashtirildi!");
        return;
      }
      setCheckout(co);
      // Payme to'lov sahifasini yangi oynada ochamiz (checkout.paycom.uz iframe'da ochilmaydi)
      if (co.checkout_url) {
        window.open(co.checkout_url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      alert(err?.data?.detail || "Xatolik. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  };

  const onPaid = async () => {
    setCheckout(null);
    await load();
    alert("To'lov qabul qilindi — obuna 30 kunga uzaytirildi!");
  };

  const cancel = async () => {
    if (
      !confirm(
        `Keyingi to'lovni bekor qilmoqchimisiz? Siz to'lagan kunlaringiz (${sub?.days_left || 0} kun) to'liq saqlanadi, faqat muddat tugagach keyingi oylik to'lov yechilmaydi.`
      )
    )
      return;
    setBusy(true);
    try {
      await apiPost("/billing/cancel/", {});
      await load();
      alert("Keyingi to'lov bekor qilindi. To'langan muddat tugaguncha obunadan to'liq foydalanishingiz mumkin.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="card p-12 flex justify-center"><Spinner size={28} /></div>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="card p-6 bg-gradient-to-br from-ink to-ink-soft text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand">
                <Crown size={18} /> <span className="text-xs uppercase font-bold tracking-wider">Premium obuna</span>
              </div>
              <div className="text-4xl font-extrabold mt-2">
                {formatUzs(priceUzs)}<span className="text-lg font-medium opacity-70"> /oy</span>
              </div>
              <p className="text-sm opacity-80 mt-1">
                Payme orqali xavfsiz to'lov. Istalgan vaqt bekor qilish.
              </p>
            </div>
            <div className="flex items-end gap-0.5">
              <Sparkles size={16} className="text-brand animate-star-pulse" style={{ animationDelay: "0ms" }} />
              <Sparkles size={26} className="text-brand animate-star-pulse" style={{ animationDelay: "250ms" }} />
              <Sparkles size={18} className="text-brand animate-star-pulse" style={{ animationDelay: "500ms" }} />
            </div>
          </div>

          {sub && (
            <div className="mt-5 p-3 rounded-xl bg-white/10 backdrop-blur">
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-80">Holat</span>
                <span className="font-bold">{sub.status_display}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1.5">
                <span className="opacity-80">Qoldi</span>
                <span className="font-bold">{sub.days_left} kun</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1.5">
                <span className="opacity-80">Tugaydi</span>
                <span className="font-bold">{formatDateTime(sub.expires_at)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1.5">
                <span className="opacity-80">Keyingi to'lov</span>
                <span className="font-bold">{sub.auto_renew ? "Avtomatik yechiladi" : "O'chirilgan"}</span>
              </div>
              {sub.discount_percent > 0 && (
                <div className="flex items-center justify-between text-sm mt-1.5">
                  <span className="opacity-80">Promo chegirma</span>
                  <span className="font-bold text-brand">-{sub.discount_percent}%</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            {/* To'lash — faqat obuna faol emas yoki 3 kundan kam qolganda */}
            {(!sub || !sub.is_active || sub.days_left <= 3) ? (
              <button onClick={subscribe} disabled={busy} className="btn-primary flex-1">
                {busy ? <Spinner /> : isFree ? "Obunani faollashtirish (100% bepul)" : `Payme orqali to'lash (${formatUzs(priceUzs)})`}
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-semibold">
                <CheckCircle2 size={16} className="text-brand" /> Obuna faol — {sub.days_left} kun qoldi
              </div>
            )}
            {sub?.auto_renew ? (
              <button onClick={cancel} disabled={busy} className="btn-outline !text-white !border-white/30 hover:!bg-white/10 text-xs px-3 py-2">
                Keyingi to'lovni bekor qilish
              </button>
            ) : null}
          </div>

          <div className="mt-3 p-2.5 rounded-lg bg-white/5 text-xs opacity-75 leading-relaxed">
            ⓘ To'langan obunani muddatidan oldin to'xtatib bo'lmaydi — barcha kunlaringiz to'liq saqlanadi. Faqat muddat tugagach keyingi oylik avtomatik to'lovni bekor qilish mumkin.
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs opacity-70">
            <ShieldCheck size={14} className="text-brand" />
            Karta ma'lumotlari saytda saqlanmaydi — to'lov Payme sahifasida amalga oshiriladi
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-ink mb-4">Tranzaksiyalar tarixi</h3>
        {txns.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">Hech qanday tranzaksiya yo'q</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-auto no-scrollbar">
            {txns.map((t) => {
              const Icon = t.status === "success" ? CheckCircle2 : t.status === "failed" ? XCircle : Clock;
              const color = t.status === "success" ? "text-green-600" : t.status === "failed" ? "text-red-600" : "text-orange-500";
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-ink-line last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={20} className={`${color} shrink-0`} />
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{t.description}</div>
                      <div className="text-xs text-ink-muted">
                        {formatDateTime(t.created_at)} • {t.status_display}
                      </div>
                      {t.error_message && (
                        <div className="text-xs text-red-600 mt-0.5">{t.error_message}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-bold text-ink">{formatUzs(t.amount_uzs)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {checkout && (
        <PaymeWaitModal
          checkout={checkout}
          onClose={() => { setCheckout(null); load(); }}
          onPaid={onPaid}
        />
      )}
    </div>
  );
}

/** Payme to'lov oynasi ochilgach, backend'dan holatni so'rab turadi. */
function PaymeWaitModal({
  checkout,
  onClose,
  onPaid,
}: {
  checkout: PaymeCheckout;
  onClose: () => void;
  onPaid: () => void;
}) {
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const s = await apiGet<{ paid: boolean }>(
          `/billing/payme/status/?order_id=${checkout.order_id}`
        );
        if (s.paid) {
          clearInterval(timer);
          onPaidRef.current();
        }
      } catch {
        /* ignore — keyingi urinishda qayta so'raladi */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [checkout.order_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card p-6 max-w-sm w-full text-center">
        <div className="mx-auto w-12 h-12 flex items-center justify-center">
          <Spinner size={32} />
        </div>
        <h3 className="font-bold text-ink text-lg mt-4">To'lov kutilmoqda</h3>
        <p className="text-sm text-ink-muted mt-1">
          Payme oynasida <b>{formatUzs(checkout.amount_uzs)}</b> to'lovni yakunlang.
          To'lov tasdiqlangach bu sahifa avtomatik yangilanadi.
        </p>
        <a
          href={checkout.checkout_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline w-full mt-4 flex items-center justify-center gap-2"
        >
          <ExternalLink size={16} /> Payme oynasini qayta ochish
        </a>
        <button onClick={onClose} className="text-sm text-ink-muted mt-3 hover:underline">
          Bekor qilish
        </button>
      </div>
    </div>
  );
}
