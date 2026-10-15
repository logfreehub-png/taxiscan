"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, X, Crosshair, Check, Loader2 } from "lucide-react";
import { reverseGeocode } from "@/lib/api/geocoding";
import { useTheme } from "@/lib/theme";
import { Spinner } from "@/components/ui/Spinner";

const PickerLeaflet = dynamic(() => import("./PickerLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-ink-bg">
      <Spinner size={28} />
    </div>
  ),
});

export interface PickedAddress {
  label: string;
  lat: number;
  lng: number;
}

const TASHKENT = { lat: 41.311, lng: 69.279 };

function shortenLabel(s: string): string {
  return s.split(",").map((p) => p.trim()).slice(0, 3).join(", ");
}

export function MapPickerModal({
  open,
  title,
  initial,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  initial?: PickedAddress | null;
  onConfirm: (v: PickedAddress) => void;
  onClose: () => void;
}) {
  const { isDark } = useTheme();
  const startCenter = initial ? { lat: initial.lat, lng: initial.lng } : TASHKENT;

  const [center, setCenter] = useState(startCenter);
  const [label, setLabel] = useState(initial?.label || "");
  const [geoLoading, setGeoLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [recenterTo, setRecenterTo] = useState<{ lat: number; lng: number; nonce: number } | null>(null);

  const geoTimer = useRef<any>(null);
  const lastReq = useRef(0);

  // Modal har ochilganda boshlang'ich holatga qaytaramiz
  useEffect(() => {
    if (open) {
      setCenter(startCenter);
      setLabel(initial?.label || "");
      if (!initial) goToCurrentLocation(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Xarita surila boshlaganda — nomni tozalaymiz, tasdiqlash tugmasi o'chadi (hira)
  const handleMoveStart = () => {
    setGeoLoading(true);
    setLabel("");
  };

  const handleMove = (lat: number, lng: number) => {
    setCenter({ lat, lng });
    if (geoTimer.current) clearTimeout(geoTimer.current);
    setGeoLoading(true);
    const reqId = ++lastReq.current;
    geoTimer.current = setTimeout(async () => {
      try {
        const geo = await reverseGeocode(lat, lng);
        if (reqId === lastReq.current)
          setLabel(shortenLabel(geo.label) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } catch {
        if (reqId === lastReq.current) setLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } finally {
        if (reqId === lastReq.current) setGeoLoading(false);
      }
    }, 650);
  };

  const goToCurrentLocation = (silent = false) => {
    if (!navigator.geolocation) return;
    if (!silent) setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRecenterTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, nonce: Date.now() });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-ink-bg animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-ink-line shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-line/40" title="Yopish">
          <X size={22} className="text-ink" />
        </button>
        <h2 className="font-extrabold text-ink text-lg truncate">{title}</h2>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <PickerLeaflet center={center} dark={isDark} onMove={handleMove} onMoveStart={handleMoveStart} recenterTo={recenterTo} />

        {/* Markaziy pin — doim markazda turadi */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-[500] pointer-events-none -mt-1">
          <MapPin size={44} className="text-brand-700 drop-shadow-lg fill-brand" strokeWidth={2.5} />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[499] pointer-events-none w-3 h-1.5 bg-black/25 rounded-full" />

        {/* Hint */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <div className="bg-ink/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            Xaritani suring — nuqta markazda turadi
          </div>
        </div>

        {/* Joyim FAB */}
        <button
          onClick={() => goToCurrentLocation(false)}
          className="absolute right-4 bottom-4 z-[500] w-12 h-12 rounded-full bg-white border border-ink-line shadow-lg flex items-center justify-center hover:bg-ink-line/20"
          title="Joriy joylashuvim"
        >
          {locating ? <Loader2 size={20} className="animate-spin text-brand-700" /> : <Crosshair size={22} className="text-brand-700" />}
        </button>
      </div>

      {/* Bottom confirm */}
      <div className="px-4 pt-4 pb-5 bg-white border-t border-ink-line shrink-0 space-y-3">
        <div className="flex items-center gap-2.5">
          <MapPin size={18} className="text-brand-700 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-ink-muted">Tanlangan manzil</div>
            {geoLoading ? (
              <div className="text-sm text-ink-muted">Aniqlanmoqda…</div>
            ) : (
              <div className="text-[15px] font-bold text-ink truncate">
                {label || "Xaritani harakatlantiring"}
              </div>
            )}
          </div>
        </div>
        {/* Tasdiqlash — faqat xarita to'xtab, nom topilganda yonadi.
            Surilayotganda/aniqlanayotganda hira va bosilmaydi. */}
        <button
          onClick={() => {
            if (geoLoading || !label) return;
            onConfirm({ label, lat: center.lat, lng: center.lng });
          }}
          disabled={geoLoading || !label}
          className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {geoLoading ? (
            <><Loader2 size={18} className="animate-spin" /> Aniqlanmoqda…</>
          ) : (
            <><Check size={18} /> Tasdiqlash</>
          )}
        </button>
      </div>
    </div>
  );
}
