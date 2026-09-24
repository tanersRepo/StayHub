"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Bath, BedDouble, Camera, Layers, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/pricing";
import { MediaUploader, type MediaRow } from "@/components/host/media-uploader";
import { createRoomType, deleteRoomType, updateRoomType } from "@/actions/room-types";
import type { RoomTypeInput } from "@/lib/validators/property";

export interface RoomTypeRow {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  quantity: number;
  /** Photos attached to this room type, in display order. */
  media: MediaRow[];
}

interface Props {
  propertyId: string;
  propertyType: string;
  currency: string;
  roomTypes: RoomTypeRow[];
}

export function RoomTypeEditor({ propertyId, propertyType, currency, roomTypes }: Props) {
  const [editing, setEditing] = useState<RoomTypeRow | "new" | null>(null);
  const [photosFor, setPhotosFor] = useState<RoomTypeRow | null>(null);
  const [pending, start] = useTransition();
  const isHotel = propertyType === "HOTEL";

  function remove(rt: RoomTypeRow) {
    start(async () => {
      const res = await deleteRoomType(rt.id);
      if (res.error) toast.error(res.error);
      else toast.success(`Removed ${rt.name}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {isHotel
            ? "Add each room category and how many identical rooms you have of it."
            : "Most listings have a single room type covering the whole place. Set quantity above 1 only if you have several identical units."}{" "}
          Add photos to each room so guests can see what they are booking.
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Add room type
        </Button>
      </div>

      {roomTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No room types yet. Guests can&apos;t book until you add one.
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {roomTypes.map((rt) => (
            <li key={rt.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-4">
                <RoomThumb media={rt.media} onClick={() => setPhotosFor(rt)} />
                <div>
                <p className="font-medium">{rt.name}</p>
                <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3.5" />{rt.maxGuests} guests</span>
                  <span className="flex items-center gap-1"><BedDouble className="size-3.5" />{rt.beds} beds · {rt.bedrooms} bedrooms</span>
                  <span className="flex items-center gap-1"><Bath className="size-3.5" />{rt.bathrooms} bath</span>
                  <span className="flex items-center gap-1"><Layers className="size-3.5" />{rt.quantity} unit{rt.quantity === 1 ? "" : "s"}</span>
                </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">{formatMoney(rt.pricePerNight, currency)}<span className="text-xs font-normal text-muted-foreground"> / night</span></p>
                <Button variant="outline" size="sm" onClick={() => setPhotosFor(rt)}>
                  <Camera className="size-4" /> Photos ({rt.media.length})
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditing(rt)} aria-label="Edit">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(rt)} disabled={pending} aria-label="Delete">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RoomTypeDialog
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        propertyId={propertyId}
        currency={currency}
        roomType={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />

      <Dialog open={photosFor !== null} onOpenChange={(o) => !o && setPhotosFor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Photos · {photosFor?.name}</DialogTitle>
            <DialogDescription>
              Show guests this room. The first photo is used on the room card; general property photos live in the Media tab.
            </DialogDescription>
          </DialogHeader>
          {photosFor && (
            <MediaUploader
              propertyId={propertyId}
              roomTypeId={photosFor.id}
              // Read from the latest props so the gallery refreshes after each upload.
              media={roomTypes.find((r) => r.id === photosFor.id)?.media ?? []}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Cover thumbnail of a room type; a placeholder that opens the photo dialog when empty. */
function RoomThumb({ media, onClick }: { media: MediaRow[]; onClick: () => void }) {
  const cover = media[0];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={cover ? "Manage photos" : "Add photos"}
      className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-80"
    >
      {cover ? (
        <Image src={cover.url} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <Camera className="absolute inset-0 m-auto size-5 text-muted-foreground" />
      )}
      {media.length > 1 && (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[10px] text-white">+{media.length - 1}</span>
      )}
    </button>
  );
}

function RoomTypeDialog({
  propertyId,
  currency,
  roomType,
  open,
  onClose,
}: {
  propertyId: string;
  currency: string;
  roomType: RoomTypeRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = Object.fromEntries(fd) as unknown as RoomTypeInput;
    start(async () => {
      const res = roomType ? await updateRoomType(roomType.id, input) : await createRoomType(propertyId, input);
      if (res.error) toast.error(res.error);
      else {
        toast.success(roomType ? "Room type updated" : "Room type added");
        onClose();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{roomType ? "Edit room type" : "Add room type"}</DialogTitle>
            <DialogDescription>Price is per night in {currency}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Name</Label>
              <Input name="name" defaultValue={roomType?.name ?? ""} required placeholder="Entire apartment / Double room" />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Description (optional)</Label>
              <Textarea name="description" defaultValue={roomType?.description ?? ""} rows={2} />
            </div>
            <Num label={`Price per night (${currency})`} name="price" step="0.01" defaultValue={roomType ? roomType.pricePerNight / 100 : ""} />
            <Num label="Identical units" name="quantity" defaultValue={roomType?.quantity ?? 1} />
            <Num label="Max guests" name="maxGuests" defaultValue={roomType?.maxGuests ?? 2} />
            <Num label="Bedrooms" name="bedrooms" defaultValue={roomType?.bedrooms ?? 1} min={0} />
            <Num label="Beds" name="beds" defaultValue={roomType?.beds ?? 1} />
            <Num label="Bathrooms" name="bathrooms" defaultValue={roomType?.bathrooms ?? 1} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Num({ label, name, defaultValue, min = 1, step = "1" }: { label: string; name: string; defaultValue: number | string; min?: number; step?: string }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Input name={name} type="number" min={min} step={step} defaultValue={defaultValue} required />
    </div>
  );
}
