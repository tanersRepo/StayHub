"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin as MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapPin } from "@/components/map-view";

// Leaflet touches `window` at import time, so it can only render on the client.
const MapView = dynamic(() => import("@/components/map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

interface Props {
  pin: MapPin;
  /** Full street address, shown in the dialog header. */
  address: string;
  className?: string;
}

/**
 * Mini map beside the gallery. The map itself is decorative — the whole card is a button that
 * opens the interactive map, so a click anywhere on it does what "Show on map" does.
 */
export function PropertyLocation({ pin, address, className }: Props) {
  const [open, setOpen] = useState(false);
  const pins = [pin];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Show ${pin.title} on the map`}
        className={`group relative block w-full overflow-hidden rounded-2xl border bg-muted ${className ?? ""}`}
      >
        {/* pointer-events-none so every click lands on this button, not on Leaflet. */}
        <div className="pointer-events-none size-full">
          <MapView pins={pins} zoom={14} interactive={false} />
        </div>
        <span className="absolute inset-0 grid place-items-center bg-black/5 transition-colors group-hover:bg-black/10">
          <span className="pointer-events-none inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
            <MapPinIcon className="size-4" />
            Show on map
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{pin.title}</DialogTitle>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon className="size-4 shrink-0" />
              {address}
            </p>
          </DialogHeader>
          <div className="h-[60vh] overflow-hidden rounded-xl border">
            {open && <MapView pins={pins} zoom={15} />}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://www.openstreetmap.org/?mlat=${pin.lat}&mlon=${pin.lng}#map=16/${pin.lat}/${pin.lng}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                Open in OpenStreetMap
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
