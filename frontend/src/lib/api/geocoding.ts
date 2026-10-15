import { apiGet } from "./client";

export interface GeocodeResult {
  label: string;
  full?: string;
  address?: Record<string, string>;
}

export interface SearchResult {
  label: string;
  /** Ikkinchi qator: ko'cha/uy + tuman (masalan "Katartal ko'chasi, 1, Chilonzor tumani") */
  detail?: string;
  lat: number;
  lng: number;
  type?: string;
  importance?: number;
}

let lastReverseAt = 0;
let reverseTimer: any = null;

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  // Nominatim — 1 req/sek, throttle
  const now = Date.now();
  const wait = Math.max(0, lastReverseAt + 1100 - now);
  await new Promise((r) => setTimeout(r, wait));
  lastReverseAt = Date.now();
  return apiGet<GeocodeResult>(`/taxi/geocode/reverse/?lat=${lat}&lng=${lng}`, { auth: false });
}

export function searchAddress(q: string): Promise<{ results: SearchResult[] }> {
  return apiGet<{ results: SearchResult[] }>(
    `/taxi/geocode/search/?q=${encodeURIComponent(q)}`,
    { auth: false }
  );
}

/** Debounced search uchun helper. */
export function debouncedSearch(
  q: string,
  callback: (results: SearchResult[]) => void,
  delay = 500
) {
  if (reverseTimer) clearTimeout(reverseTimer);
  if (q.trim().length < 2) {
    callback([]);
    return;
  }
  reverseTimer = setTimeout(async () => {
    try {
      const r = await searchAddress(q);
      callback(r.results || []);
    } catch {
      callback([]);
    }
  }, delay);
}
