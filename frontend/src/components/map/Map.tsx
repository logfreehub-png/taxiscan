"use client";

/**
 * Leaflet'ni client-only qilib yuklash uchun wrapper.
 * Server-side render xato bermasligi uchun dynamic import bilan.
 */
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/Spinner";

export const Map = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-ink-line bg-ink-bg flex items-center justify-center" style={{ height: 400 }}>
      <Spinner size={28} />
    </div>
  ),
});

export type { MarkerPoint, RegionZone, RoutePath } from "./LeafletMap";
