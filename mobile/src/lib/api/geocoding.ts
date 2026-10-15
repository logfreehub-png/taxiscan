import { apiGet } from "./client";

export interface GeocodeResult {
  label: string;
  full?: string;
  address?: Record<string, string>;
}

export interface SearchResult {
  label: string;
  /** Ikkinchi qator: tuman/shahar (masalan "Chilonzor tumani") */
  detail?: string;
  lat: number;
  lng: number;
  type?: string;
  importance?: number;
}

let lastReverseAt = 0;

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  // Nominatim — 1 req/sek, throttle
  const now = Date.now();
  const wait = Math.max(0, lastReverseAt + 1100 - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReverseAt = Date.now();
  return apiGet<GeocodeResult>(`/taxi/geocode/reverse/?lat=${lat}&lng=${lng}`, { auth: false });
}

export function searchAddress(q: string): Promise<{ results: SearchResult[] }> {
  return apiGet<{ results: SearchResult[] }>(
    `/taxi/geocode/search/?q=${encodeURIComponent(q)}`,
    { auth: false }
  );
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced address search */
export function debouncedSearch(
  q: string,
  callback: (results: SearchResult[]) => void,
  delay = 500
) {
  if (searchTimer) clearTimeout(searchTimer);
  if (q.trim().length < 2) {
    callback([]);
    return;
  }
  searchTimer = setTimeout(async () => {
    try {
      const r = await searchAddress(q);
      callback(r.results || []);
    } catch {
      callback([]);
    }
  }, delay);
}

export function shortenLabel(s: string): string {
  const parts = s.split(",").map((p) => p.trim());
  return parts.slice(0, 3).join(", ");
}

/** Toshkentdagi mashhur joylar (offline preset) */
export const TASHKENT_PRESETS: SearchResult[] = [
  { label: "Toshkent xalqaro aeroporti", detail: "Yashnobod tumani", lat: 41.2579, lng: 69.2817 },
  { label: "Toshkent (Shimoliy) temir yo'l vokzali", detail: "Yunusobod tumani", lat: 41.3199, lng: 69.2867 },
  { label: "Chorsu bozori", detail: "Shayxontohur tumani", lat: 41.3266, lng: 69.2350 },
  { label: "Tashkent City parki", detail: "Shayxontohur tumani", lat: 41.3167, lng: 69.2717 },
  { label: "Magic City parki", detail: "Chilonzor tumani", lat: 41.2846, lng: 69.2043 },
  { label: "Mustaqillik maydoni", detail: "Mirzo Ulug'bek tumani", lat: 41.3111, lng: 69.2797 },
  { label: "Amir Temur xiyoboni", detail: "Mirzo Ulug'bek tumani", lat: 41.3115, lng: 69.2795 },
  { label: "Alay bozori", detail: "Mirobod tumani", lat: 41.3096, lng: 69.2905 },
  { label: "Samarqand darvoza savdo markazi", detail: "Olmazor tumani", lat: 41.3382, lng: 69.2419 },
  { label: "Compass savdo markazi", detail: "Yunusobod tumani", lat: 41.3536, lng: 69.2896 },
  { label: "Next savdo markazi", detail: "Yunusobod tumani", lat: 41.3634, lng: 69.2882 },
  { label: "Oybek metro bekati", detail: "Mirobod tumani", lat: 41.2990, lng: 69.2724 },
];
