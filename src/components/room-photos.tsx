"use client";

import Image from "next/image";
import { useState } from "react";
import { PhotoLightbox, type LightboxPhoto } from "@/components/photo-lightbox";

/** Cover photo of a room type plus a strip of up to 3 more; click any to open the lightbox. */
export function RoomPhotos({ photos, name }: { photos: LightboxPhoto[]; name: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [cover, ...rest] = photos;

  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        onClick={() => setIndex(0)}
        aria-label={`View photos of ${name}`}
        className="relative size-24 overflow-hidden rounded-lg bg-muted sm:size-28"
      >
        <Image src={cover.url} alt={name} fill sizes="112px" className="object-cover" />
      </button>
      {rest.length > 0 && (
        <div className="hidden w-14 flex-col gap-1 sm:flex">
          {rest.slice(0, 3).map((ph, i) => (
            <button
              key={ph.id}
              type="button"
              onClick={() => setIndex(i + 1)}
              aria-label={`View photos of ${name}`}
              className="relative flex-1 overflow-hidden rounded bg-muted"
            >
              <Image src={ph.url} alt="" fill sizes="56px" className="object-cover" />
              {i === 2 && rest.length > 3 && (
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-medium text-white">
                  +{rest.length - 3}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <PhotoLightbox photos={photos} index={index} onIndexChange={setIndex} title={name} />
    </div>
  );
}
