"use client";

import Image from "next/image";
import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Film, ImagePlus, Star, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deleteMedia, reorderMedia } from "@/actions/media";
import {
  IMAGE_MIME_EXT,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  VIDEO_MIME_EXT,
} from "@/lib/media-limits";

export interface MediaRow {
  id: string;
  kind: string;
  url: string;
  durationSec: number | null;
  order: number;
}

interface Upload {
  id: string;
  name: string;
  progress: number; // 0..100
  error?: string;
}

/** Reads a video's duration in the browser via metadata — instant feedback before upload. */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video"));
    };
    v.src = url;
  });
}

function uploadWithProgress(form: FormData, onProgress: (pct: number) => void): Promise<MediaRow> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const body = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error ?? `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(form);
  });
}

export function MediaUploader({ propertyId, media }: { propertyId: string; media: MediaRow[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();

  const patch = (id: string, u: Partial<Upload>) =>
    setUploads((prev) => prev.map((x) => (x.id === id ? { ...x, ...u } : x)));

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        setUploads((prev) => [...prev, { id, name: file.name, progress: 0 }]);
        try {
          const isImage = file.type in IMAGE_MIME_EXT;
          const isVideo = file.type in VIDEO_MIME_EXT;
          if (!isImage && !isVideo) throw new Error("Unsupported type — use JPG, PNG, WebP, MP4, WebM or MOV");
          const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
          if (file.size > maxBytes) throw new Error(`Too large (max ${Math.round(maxBytes / 1048576)} MB)`);
          const form = new FormData();
          form.set("file", file);
          form.set("propertyId", propertyId);
          if (isVideo) {
            const duration = await readVideoDuration(file);
            if (duration > MAX_VIDEO_SECONDS) {
              throw new Error(`Video is ${Math.round(duration)}s — max is ${MAX_VIDEO_SECONDS}s`);
            }
            form.set("durationSec", String(duration));
          }
          await uploadWithProgress(form, (p) => patch(id, { progress: p }));
          setUploads((prev) => prev.filter((x) => x.id !== id));
          router.refresh();
        } catch (err) {
          patch(id, { error: (err as Error).message, progress: 0 });
        }
      }
    },
    [propertyId, router],
  );

  function move(index: number, dir: -1 | 1) {
    const next = [...media];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    start(async () => {
      const res = await reorderMedia(propertyId, next.map((m) => m.id));
      if (res.error) toast.error(res.error);
    });
  }

  function setCover(index: number) {
    const next = [media[index], ...media.filter((_, i) => i !== index)];
    start(async () => {
      const res = await reorderMedia(propertyId, next.map((m) => m.id));
      if (res.error) toast.error(res.error);
      else toast.success("Cover photo updated");
    });
  }

  function remove(m: MediaRow) {
    start(async () => {
      const res = await deleteMedia(m.id);
      if (res.error) toast.error(res.error);
    });
  }

  const images = media.filter((m) => m.kind === "IMAGE").length;
  const videos = media.filter((m) => m.kind === "VIDEO").length;

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "hover:bg-muted/50",
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" />
        <p className="font-medium">Drag photos or videos here, or click to browse</p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP up to 10 MB · MP4, WebM, MOV up to {MAX_VIDEO_SECONDS} seconds · {images} photos, {videos} videos so far
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={[...Object.keys(IMAGE_MIME_EXT), ...Object.keys(VIDEO_MIME_EXT)].join(",")}
          className="hidden"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* In-flight uploads */}
      {uploads.length > 0 && (
        <ul className="space-y-2">
          {uploads.map((u) => (
            <li key={u.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{u.name}</span>
                {u.error ? (
                  <span className="flex items-center gap-2">
                    <span className="text-destructive">{u.error}</span>
                    <Button size="sm" variant="ghost" onClick={() => setUploads((p) => p.filter((x) => x.id !== u.id))}>Dismiss</Button>
                  </span>
                ) : (
                  <span className="text-muted-foreground">{u.progress}%</span>
                )}
              </div>
              {!u.error && (
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${u.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Gallery */}
      {media.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          <ImagePlus className="mx-auto mb-1 size-5" />
          No media yet. The first photo becomes the cover.
        </p>
      ) : (
        <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", pending && "opacity-60")}>
          {media.map((m, i) => (
            <li key={m.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
              {m.kind === "IMAGE" ? (
                <Image src={m.url} alt="" fill sizes="25vw" className="object-cover" />
              ) : (
                <video src={m.url} muted playsInline controls className="size-full object-cover" />
              )}
              {i === 0 && (
                <Badge className="absolute left-2 top-2"><Star className="size-3" /> Cover</Badge>
              )}
              {m.kind === "VIDEO" && (
                <Badge variant="secondary" className="absolute right-2 top-2">
                  <Film className="size-3" /> {m.durationSec ? `${Math.round(m.durationSec)}s` : "video"}
                </Badge>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-1">
                  <IconBtn onClick={() => move(i, -1)} disabled={i === 0} label="Move left"><ChevronLeft /></IconBtn>
                  <IconBtn onClick={() => move(i, 1)} disabled={i === media.length - 1} label="Move right"><ChevronRight /></IconBtn>
                  {i !== 0 && m.kind === "IMAGE" && (
                    <IconBtn onClick={() => setCover(i)} label="Set as cover"><Star /></IconBtn>
                  )}
                </div>
                <IconBtn onClick={() => remove(m)} label="Delete"><Trash2 className="text-red-300" /></IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconBtn({ children, label, ...props }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="rounded bg-black/50 p-1 text-white hover:bg-black/70 disabled:opacity-30 [&_svg]:size-4"
      {...props}
    >
      {children}
    </button>
  );
}
