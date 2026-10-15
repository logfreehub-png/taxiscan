"use client";

import { useRouter } from "next/navigation";
import { Diamond, Check, X } from "lucide-react";

const BENEFITS = [
  "Kuniga cheksiz narx qidirish",
  "Barcha tariflar: Comfort, Comfort+, Biznes",
  "Bir nechta manzil (A, B, C, D...)",
  "Bir nechta yo'l narxini solishtirish",
  "Barcha taksilar narxi",
  "Kunduzgi va tungi rejim",
];

export function PaywallModal({
  open,
  onClose,
  title = "Obuna kerak",
  message,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}) {
  const router = useRouter();
  if (!open) return null;

  const goSubscribe = () => {
    onClose();
    router.push("/billing");
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm card p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-muted hover:text-ink"
          aria-label="Yopish"
        >
          <X size={20} />
        </button>

        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand/15 border border-brand flex items-center justify-center">
          <Diamond size={30} className="text-brand-700" />
        </div>

        <h2 className="text-xl font-extrabold text-ink mt-4">{title}</h2>
        {message && <p className="text-sm text-ink-muted mt-2 leading-relaxed">{message}</p>}

        <div className="text-left space-y-2.5 mt-5 mb-6">
          {BENEFITS.map((b) => (
            <div key={b} className="flex items-center gap-2.5">
              <Check size={18} className="text-green-600 shrink-0" />
              <span className="text-sm font-medium text-ink">{b}</span>
            </div>
          ))}
        </div>

        <button onClick={goSubscribe} className="btn-primary w-full">
          <Diamond size={16} /> Obuna olish
        </button>
        <button onClick={onClose} className="text-sm text-ink-muted font-semibold mt-3 hover:text-ink">
          Keyinroq
        </button>
      </div>
    </div>
  );
}
