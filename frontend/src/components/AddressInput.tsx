"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Search, Map as MapIcon, LocateFixed } from "lucide-react";
import { debouncedSearch, reverseGeocode, type SearchResult } from "@/lib/api/geocoding";
import { MapPickerModal } from "@/components/map/MapPickerModal";
import { searchPlaces } from "@/lib/tashkentPlaces";

export interface AddressValue {
  label: string;
  lat: number;
  lng: number;
}

interface Props {
  label: string;
  value: AddressValue | null;
  onChange: (v: AddressValue | null) => void;
  icon?: React.ReactNode;
  showLocate?: boolean;
  onPickFromMap?: () => void;
}

export function AddressInput({ label, value, onChange, icon, showLocate, onPickFromMap }: Props) {
  const [query, setQuery] = useState(value?.label || "");
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value?.label || "");
  }, [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const geo = await reverseGeocode(lat, lng);
          const v = { label: geo.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng };
          onChange(v);
          setQuery(v.label);
        } catch {
          onChange({ label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const onTyping = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (!text) {
      onChange(null);
      setResults([]);
      return;
    }
    setSearching(true);
    debouncedSearch(text, (r) => {
      setResults(r);
      setSearching(false);
    });
  };

  // Toshkent joylari ro'yxatidan (metro, bozorlar, mall'lar va h.k.) qidirish — 9 tagacha
  const placeMatches = searchPlaces(query, 9);

  return (
    <div className="relative" ref={ref}>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-ink-muted">
          {icon || <MapPin size={18} />}
        </span>
        <input
          className={`input pl-11 ${showLocate ? "pr-24 sm:pr-40" : "pr-14 sm:pr-28"}`}
          placeholder="Manzil yoki joy nomini yozing..."
          value={query}
          onChange={(e) => onTyping(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searching && <Loader2 size={14} className="animate-spin text-ink-muted hidden sm:block" />}
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="h-8 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-ink-line/40 px-2 rounded-lg flex items-center gap-1"
            title="Xaritadan tanlash"
          >
            <MapIcon size={15} /> <span className="hidden sm:inline">Xarita</span>
          </button>
          {showLocate && (
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              title="Joriy joyim"
              className="h-8 text-xs font-semibold text-brand-700 hover:bg-brand/10 px-2 rounded-lg flex items-center gap-1"
            >
              {locating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
              <span className="hidden sm:inline">Joyim</span>
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="absolute z-[600] mt-1.5 w-full max-h-72 overflow-auto card shadow-lg no-scrollbar">
          {placeMatches.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] uppercase font-bold text-ink-muted tracking-wider bg-ink-bg border-b border-ink-line/50">
                {query.trim() ? "Toshkent joylari" : "Mashhur joylar"}
              </div>
              {placeMatches.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const v = { label: p.label, lat: p.lat, lng: p.lng };
                    onChange(v);
                    setQuery(p.label);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-ink-bg flex items-center gap-2 border-b border-ink-line/50 last:border-0"
                >
                  <MapPin size={14} className="text-brand-700 shrink-0" />
                  <span className="text-sm text-ink truncate flex-1">{p.label}</span>
                  <span className="text-[10px] text-ink-muted shrink-0">{p.category}</span>
                </button>
              ))}
            </div>
          )}
          {results.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] uppercase font-bold text-ink-muted tracking-wider bg-ink-bg border-b border-ink-line/50">
                <Search size={10} className="inline mr-1" /> Qidiruv natijasi
              </div>
              {results.map((p, i) => (
                <button
                  key={`r${i}`}
                  type="button"
                  onClick={() => {
                    const label = shortenLabel(p.label);
                    onChange({ label, lat: p.lat, lng: p.lng });
                    setQuery(label);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-ink-bg flex items-start gap-2 border-b border-ink-line/50 last:border-0"
                >
                  <MapPin size={14} className="text-ink-muted shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink truncate leading-tight">
                      {shortenLabel(p.label)}
                    </span>
                    {p.detail && (
                      <span className="block text-xs text-ink-muted truncate leading-tight mt-0.5">
                        {p.detail}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <MapPickerModal
        open={mapOpen}
        title={label}
        initial={value}
        onClose={() => setMapOpen(false)}
        onConfirm={(v) => {
          onChange(v);
          setQuery(v.label);
          setMapOpen(false);
          setOpen(false);
        }}
      />
    </div>
  );
}

function shortenLabel(s: string): string {
  // Backend endi qisqa label qaytaradi; bu faqat ehtiyot uchun —
  // uzun (eski formatdagi) javob kelsa birinchi 3 qismini olamiz
  const parts = s.split(",").map((p) => p.trim());
  return parts.slice(0, 3).join(", ");
}
