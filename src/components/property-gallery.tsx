"use client";

import Image from "next/image";
import { useState } from "react";
import { Images } from "lucide-react";
import { PhotoLightbox, type LightboxPhoto } from "@/components/photo-lightbox";

interface Props {
  photos: LightboxPhoto[];
  title: string;
  className?: string;
}

/** Hero photo grid (up to 5 tiles); clicking any tile opens the full-screen, scrollable lightbox. */
export function PropertyGallery({ photos, title, className }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  const visible = photos.slice(0, 5);
  const remaining = photos.length - visible.length;

  if (visible.length === 0) {
    return <div className={`aspect-[16/9] rounded-2xl bg-muted ${className ?? ""}`} />;
  }

  return (
    <>
      <div className={`grid gap-2 overflow-hidden rounded-2xl md:grid-cols-4 md:grid-rows-2 ${className ?? ""}`}>
        {visible.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`View photo ${i + 1} of ${photos.length}`}
            className={`group relative bg-muted ${i === 0 ? "aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto" : "aspect-[4/3]"}`}
          >
            <Image
              src={img.url}
              alt=""
              fill
              sizes="50vw"
              className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              priority={i === 0}
            />
            {i === visible.length - 1 && remaining > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-black/50 text-white transition-colors group-hover:bg-black/60">
                <span className="flex items-center gap-2 font-medium">
                  <Images className="size-5" /> +{remaining} photos
                </span>
              </span>
            )}
          </button>
        ))}
      </div>
      <PhotoLightbox photos={photos} index={index} onIndexChange={setIndex} title={title} />
    </>
  );
}
