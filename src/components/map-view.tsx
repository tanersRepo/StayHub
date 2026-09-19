"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { formatMoney } from "@/lib/pricing";

export interface MapPin {
  id: string;
  title: string;
  lat: number;
  lng: number;
  fromPrice: number | null;
  currency: string;
}

// Leaflet's default icon paths break under bundlers; use an inline SVG pin instead.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="36" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#171717"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -32],
});

/** Re-fits the viewport whenever the set of pins changes. */
function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 13);
    else map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 14 });
  }, [map, pins]);
  return null;
}

/** Map of search results. Must be loaded with `next/dynamic` and `ssr: false`. */
export function MapView({ pins, className }: { pins: MapPin[]; className?: string }) {
  const center: [number, number] = pins.length
    ? [pins.reduce((s, p) => s + p.lat, 0) / pins.length, pins.reduce((s, p) => s + p.lng, 0) / pins.length]
    : [48.8, 8.5];

  return (
    <MapContainer
      center={center}
      zoom={5}
      scrollWheelZoom={false}
      className={className ?? "h-full w-full"}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins} />
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon}>
          <Popup>
            <Link href={`/properties/${p.id}`} className="font-medium underline">
              {p.title}
            </Link>
            {p.fromPrice !== null && <div className="text-sm">from {formatMoney(p.fromPrice, p.currency)} / night</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
