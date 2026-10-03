"use client";

import Image from "next/image";
import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { useReportLightboxOpen } from "@/components/lightbox-state";

export interface LightboxPhoto {
  id: string;
  url: string;
}

interface Props {
  photos: LightboxPhoto[];
  /** Index of the open photo, or null when closed. Controlled by the caller. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** Accessible title for the dialog; not shown on screen. */
  title?: string;
}

/**
 * Full-screen photo viewer: arrow buttons, a thumbnail strip, and left/right/Escape keys.
 * Controlled from outside so callers with several photo groups (e.g. one lightbox per room) can
 * each keep their own open index.
 */
export function PhotoLightbox({ photos, index, onIndexChange, title }: Props) {
  const open = index !== null;
  const current = index !== null ? photos[index] : null;
  useReportLightboxOpen(open);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (index === null || photos.length === 0) return;
      onIndexChange((index + dir + photos.length) % photos.length);
    },
    [index, photos.length, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">{title ?? "Photos"}</DialogPrimitive.Title>
          {current && (
            <>
              <div className="flex items-center justify-between gap-4 p-4 text-white">
                <span className="text-sm tabular-nums text-white/80">
                  {index! + 1} / {photos.length}
                </span>
                <DialogPrimitive.Close className="rounded-full p-2 hover:bg-white/10" aria-label="Close">
                  <X className="size-5" />
                </DialogPrimitive.Close>
              </div>

              <div className="relative min-h-0 flex-1">
                <Image src={current.url} alt="" fill sizes="100vw" className="object-contain" priority />

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      aria-label="Previous photo"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:left-4 sm:p-3"
                    >
                      <ChevronLeft className="size-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      aria-label="Next photo"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:right-4 sm:p-3"
                    >
                      <ChevronRight className="size-6" />
                    </button>
                  </>
                )}
              </div>

              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {photos.map((ph, i) => (
                    <button
                      key={ph.id}
                      type="button"
                      onClick={() => onIndexChange(i)}
                      aria-label={`Go to photo ${i + 1}`}
                      aria-current={i === index}
                      className={cn(
                        "relative size-14 shrink-0 overflow-hidden rounded-md ring-2 transition-opacity sm:size-16",
                        i === index ? "opacity-100 ring-white" : "opacity-50 ring-transparent hover:opacity-80",
                      )}
                    >
                      <Image src={ph.url} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
