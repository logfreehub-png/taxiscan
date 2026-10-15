"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Circle, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TASHKENT: [number, number] = [41.311, 69.279];

// Default leaflet ikon ssr-da buzilishini tuzatish
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const startIcon = L.divIcon({
  className: "tn-marker tn-marker-start",
  html: `<div style="background:#FFCC00;border:3px solid #0F1216;width:22px;height:22px;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,.3);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const endIcon = L.divIcon({
  className: "tn-marker tn-marker-end",
  html: `<div style="background:#0F1216;border:3px solid #fff;width:22px;height:22px;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,.4);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const driverIcon = L.divIcon({
  className: "tn-marker tn-marker-driver",
  html: `
    <div style="position:relative">
      <div style="background:#FFCC00;border:3px solid #0F1216;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:#0F1216;">⌂</div>
      <div style="position:absolute;top:-4px;left:-4px;width:32px;height:32px;border-radius:50%;background:#FFCC00;opacity:.3;animation:tnpulse 2s infinite;"></div>
    </div>
    <style>@keyframes tnpulse {0%{transform:scale(1);opacity:.6}100%{transform:scale(2.5);opacity:0}}</style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export interface MarkerPoint {
  lat: number;
  lng: number;
  label?: string;
  type?: "start" | "end" | "driver" | "stop";
  // "stop" turidagi marker uchun harf (A, B, C)
  stopLabel?: string;
}

// Harfli marker (A start / B,C… to'xtash / oxirgi manzil).
// variant: "start" (sariq fon), "end" (qora fon), "stop" (qora fon, sariq harf)
function letterIcon(letter: string, variant: "start" | "end" | "stop") {
  const styles = {
    start: "background:#FFCC00;border:3px solid #0F1216;color:#0F1216;",
    end: "background:#0F1216;border:3px solid #fff;color:#fff;",
    stop: "background:#0F1216;border:3px solid #FFCC00;color:#FFCC00;",
  }[variant];
  return L.divIcon({
    className: `tn-marker tn-marker-${variant}`,
    html: `<div style="${styles}width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,.3);">${letter}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export interface RegionZone {
  id: number;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  geometry?: { type: "Polygon" | "MultiPolygon"; coordinates: any } | null;
  color?: string;
  highlighted?: boolean;
  stat?: string;
}

export interface RoutePath {
  id: number;
  label: string;
  geometry: { type: string; coordinates: [number, number][] } | null;
  selected?: boolean;
  color?: string;
}

interface Props {
  height?: number | string;
  markers?: MarkerPoint[];
  routeGeometry?: { type: string; coordinates: [number, number][] } | null;
  routes?: RoutePath[];
  onRouteClick?: (id: number) => void;
  zones?: RegionZone[];
  onMapClick?: (lat: number, lng: number) => void;
  onZoneClick?: (zone: RegionZone) => void;
  className?: string;
  fitToContent?: boolean;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  dark?: boolean;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitToContent({
  markers,
  geometry,
  enabled,
}: {
  markers: MarkerPoint[];
  geometry: any;
  enabled: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    const bounds = L.latLngBounds([]);
    let any = false;
    for (const m of markers) {
      bounds.extend([m.lat, m.lng]);
      any = true;
    }
    if (geometry?.coordinates) {
      for (const [lng, lat] of geometry.coordinates) {
        bounds.extend([lat, lng]);
        any = true;
      }
    }
    if (any && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [markers, geometry, enabled, map]);
  return null;
}

export default function LeafletMap({
  height = 400,
  markers = [],
  routeGeometry = null,
  routes = [],
  onRouteClick,
  zones = [],
  onMapClick,
  onZoneClick,
  className = "",
  fitToContent = true,
  defaultCenter = TASHKENT,
  defaultZoom = 12,
  dark = false,
}: Props) {
  const polylinePositions: [number, number][] = routeGeometry?.coordinates
    ? routeGeometry.coordinates.map(([lng, lat]) => [lat, lng])
    : [];

  return (
    // relative z-0 — Leaflet panellari (z-index 400-700) o'z ichida qoladi,
    // qidiruv dropdowni xarita tagiga kirib ketmaydi
    <div className={`relative z-0 rounded-2xl overflow-hidden border border-ink-line ${className}`} style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains={["a", "b", "c"]}
          maxZoom={19}
          className={dark ? "tn-dark-tiles" : ""}
        />

        {onMapClick && <ClickHandler onClick={onMapClick} />}

        {zones.map((z) => {
          const stroke = z.color || (z.highlighted ? "#FFCC00" : dark ? "#8b949e" : "#5C6772");
          const fill = z.color || (z.highlighted ? "#FFCC00" : dark ? "#1f2530" : "#FFFFFF");
          const opts = {
            color: stroke,
            weight: z.highlighted ? 3.5 : 1.5,
            opacity: z.highlighted ? 1 : 0.7,
            fillColor: fill,
            fillOpacity: z.highlighted ? 0.45 : (dark ? 0.25 : 0.6),
          };
          const handlers = onZoneClick ? { click: () => onZoneClick(z) } : {};
          const popup = (
            <Popup>
              <div className="font-bold">{z.name}</div>
              {z.stat && <div className="text-xs text-gray-600">{z.stat}</div>}
            </Popup>
          );

          if (z.geometry?.type === "Polygon" && z.geometry.coordinates?.[0]) {
            const positions = (z.geometry.coordinates[0] as [number, number][]).map(
              ([lng, lat]) => [lat, lng] as [number, number]
            );
            return (
              <Polygon key={z.id} positions={positions} pathOptions={opts} eventHandlers={handlers}>
                {popup}
              </Polygon>
            );
          }
          if (z.geometry?.type === "MultiPolygon") {
            const positions = (z.geometry.coordinates as [number, number][][][]).map((poly) =>
              poly[0].map(([lng, lat]) => [lat, lng] as [number, number])
            );
            return (
              <Polygon key={z.id} positions={positions} pathOptions={opts} eventHandlers={handlers}>
                {popup}
              </Polygon>
            );
          }
          return (
            <Circle
              key={z.id}
              center={[z.center_lat, z.center_lng]}
              radius={z.radius_km * 1000}
              pathOptions={opts}
              eventHandlers={handlers}
            >
              {popup}
            </Circle>
          );
        })}

        {markers.map((m, i) => {
          const icon =
            m.type === "driver" ? driverIcon
            : m.type === "stop" ? letterIcon(m.stopLabel || "•", "stop")
            : m.type === "end" ? (m.stopLabel ? letterIcon(m.stopLabel, "end") : endIcon)
            : m.type === "start" ? (m.stopLabel ? letterIcon(m.stopLabel, "start") : startIcon)
            : startIcon;
          return (
            <Marker key={i} position={[m.lat, m.lng]} icon={icon}>
              {m.label && <Popup>{m.label}</Popup>}
            </Marker>
          );
        })}

        {/* Bir nechta alternativ yo'l */}
        {routes.length > 0 && routes.map((rt) => {
          if (!rt.geometry?.coordinates) return null;
          const positions: [number, number][] = (rt.geometry.coordinates as any[]).map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );
          if (positions.length < 2) return null;
          const isSelected = rt.selected;
          const color = rt.color || (isSelected ? "#FFCC00" : "#7A8BA0");
          const handlers = onRouteClick ? { click: () => onRouteClick(rt.id) } : {};
          return (
            <Polyline
              key={`route-${rt.id}`}
              positions={positions}
              eventHandlers={handlers}
              pathOptions={{
                color,
                weight: isSelected ? 6 : 4,
                opacity: isSelected ? 1 : 0.55,
                dashArray: isSelected ? undefined : "8 6",
              }}
            >
              <Popup>
                <div className="font-bold">{rt.label}</div>
                <div className="text-xs">{isSelected ? "Tanlangan" : "Bosib tanlash"}</div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Asosiy yo'l (eski API) - faqat routes bo'sh bo'lganda */}
        {routes.length === 0 && polylinePositions.length > 1 && (
          <>
            <Polyline positions={polylinePositions} pathOptions={{ color: "#0F1216", weight: 6, opacity: 0.25 }} />
            <Polyline positions={polylinePositions} pathOptions={{ color: "#FFCC00", weight: 4, opacity: 1 }} />
          </>
        )}

        <FitToContent markers={markers} geometry={routeGeometry} enabled={fitToContent} />
      </MapContainer>
    </div>
  );
}
