import { create } from "zustand";

export interface ParsedLocation {
  lat: number;
  lng: number;
  label?: string;
  source?: "telegram" | "geo" | "maps" | "custom";
}

export interface GeoIntentState {
  pendingDestination: ParsedLocation | null;
  setPendingDestination: (loc: ParsedLocation | null) => void;
  clearPendingDestination: () => void;
}

export const useGeoIntentStore = create<GeoIntentState>((set) => ({
  pendingDestination: null,
  setPendingDestination: (loc) => set({ pendingDestination: loc }),
  clearPendingDestination: () => set({ pendingDestination: null }),
}));

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (lat !== 0 || lng !== 0)
  );
}

/**
 * Telegram, Google Maps, Yandex yoki tizimdan kelgan har qanday lokatsiya URL manzilini
 * tahlil qilib, lat, lng va label ni ajratib oladi.
 */
export function parseLocationUri(rawUrl: string): ParsedLocation | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  const url = rawUrl.trim();

  // 1. "geo:" scheme — Telegram, WhatsApp va Android standart xarita intents
  // Masalan:
  // "geo:41.2995,69.2401?q=41.2995,69.2401"
  // "geo:0,0?q=41.2995,69.2401(Tashkent City)"
  // "geo:41.2995,69.2401"
  // "geo:41.2995,69.2401?z=16"
  if (url.toLowerCase().startsWith("geo:")) {
    const afterGeo = url.slice(4);
    const [pathPart, queryPart] = afterGeo.split("?");

    let lat: number | null = null;
    let lng: number | null = null;
    let label: string | undefined = undefined;

    // A) Agar queryPart mavjud bo'lsa (q=...)
    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      const qVal = params.get("q");

      if (qVal) {
        const decodedQ = decodeURIComponent(qVal);

        // Qavs ichidagi nomni qidiramiz: (Chilonzor) yoki (Tashkent City)
        const labelMatch = decodedQ.match(/\(([^)]+)\)/);
        if (labelMatch) {
          label = labelMatch[1].trim();
        }

        // Koordinatalarni qidiramiz: 41.2995,69.2401
        const coordMatch = decodedQ.match(/([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/);
        if (coordMatch) {
          const pLat = parseFloat(coordMatch[1]);
          const pLng = parseFloat(coordMatch[2]);
          if (isValidCoordinate(pLat, pLng)) {
            lat = pLat;
            lng = pLng;
          }
        }
      }
    }

    // B) Agar queryda topilmasa, pathPart'dan olamiz: geo:41.2995,69.2401
    if (lat == null || lng == null) {
      const pathCoord = pathPart.match(/([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/);
      if (pathCoord) {
        const pLat = parseFloat(pathCoord[1]);
        const pLng = parseFloat(pathCoord[2]);
        if (isValidCoordinate(pLat, pLng)) {
          lat = pLat;
          lng = pLng;
        }
      }
    }

    if (lat != null && lng != null) {
      return { lat, lng, label, source: "telegram" };
    }
  }

  // 2. "taxiscan://" custom scheme
  // taxiscan://geo?lat=41.2995&lng=69.2401&label=Chilonzor
  // taxiscan://location?lat=41.2995&lng=69.2401
  if (url.toLowerCase().startsWith("taxiscan://")) {
    try {
      const parsed = new URL(url);
      const latStr = parsed.searchParams.get("lat");
      const lngStr = parsed.searchParams.get("lng");
      const label = parsed.searchParams.get("label") || undefined;
      if (latStr && lngStr) {
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (isValidCoordinate(lat, lng)) {
          return { lat, lng, label, source: "custom" };
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Google Maps linklari
  // https://maps.google.com/?q=41.2995,69.2401
  // https://www.google.com/maps/search/?api=1&query=41.2995,69.2401
  // https://maps.google.com/maps?daddr=41.2995,69.2401
  // https://www.google.com/maps/@41.2995,69.2401,17z
  if (url.includes("google.com/maps") || url.includes("maps.google.") || url.includes("goo.gl")) {
    const qMatch = url.match(/[?&](?:q|query|daddr)=([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/i);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng, source: "maps" };
      }
    }

    const atMatch = url.match(/@([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng, source: "maps" };
      }
    }
  }

  // 4. Yandex Maps linklari
  // https://yandex.uz/maps/?ll=69.2401,41.2995&pt=69.2401,41.2995
  // https://yandex.ru/maps/?text=41.2995,69.2401
  if (url.includes("yandex.uz/maps") || url.includes("yandex.ru/maps")) {
    const textMatch = url.match(/[?&]text=([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/i);
    if (textMatch) {
      const lat = parseFloat(textMatch[1]);
      const lng = parseFloat(textMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng, source: "maps" };
      }
    }

    // Yandex pt: lng,lat
    const ptMatch = url.match(/[?&]pt=([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/i);
    if (ptMatch) {
      const lng = parseFloat(ptMatch[1]);
      const lat = parseFloat(ptMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng, source: "maps" };
      }
    }
  }

  return null;
}
