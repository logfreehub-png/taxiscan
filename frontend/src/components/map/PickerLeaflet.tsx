"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function CenterWatcher({ onMove, onMoveStart }: { onMove: (lat: number, lng: number) => void; onMoveStart?: () => void }) {
  const map = useMapEvents({
    movestart() {
      onMoveStart?.();
    },
    moveend() {
      const c = map.getCenter();
      onMove(c.lat, c.lng);
    },
  });
  useEffect(() => {
    const c = map.getCenter();
    onMove(c.lat, c.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Recenter({ target }: { target: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.nonce]);
  return null;
}

export default function PickerLeaflet({
  center,
  dark,
  onMove,
  onMoveStart,
  recenterTo,
}: {
  center: { lat: number; lng: number };
  dark?: boolean;
  onMove: (lat: number, lng: number) => void;
  onMoveStart?: () => void;
  recenterTo: { lat: number; lng: number; nonce: number } | null;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        subdomains={["a", "b", "c"]}
        maxZoom={19}
        className={dark ? "tn-dark-tiles" : ""}
      />
      <CenterWatcher onMove={onMove} onMoveStart={onMoveStart} />
      <Recenter target={recenterTo} />
    </MapContainer>
  );
}
