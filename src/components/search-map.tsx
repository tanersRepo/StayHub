"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/components/map-view";
import { Skeleton } from "@/components/ui/skeleton";

// Leaflet touches `window` at import time, so it can only render on the client.
const MapView = dynamic(() => import("@/components/map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function SearchMap({ pins }: { pins: MapPin[] }) {
  return (
    <div className="sticky top-24 h-[calc(100vh-8rem)] overflow-hidden rounded-xl border">
      <MapView pins={pins} />
    </div>
  );
}
