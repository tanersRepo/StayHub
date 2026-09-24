import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { mp4DurationSeconds } from "@/lib/video-duration";
import { saveFile } from "@/lib/storage";
import {
  IMAGE_MIME_EXT,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_PROPERTY,
  MAX_IMAGES_PER_ROOM_TYPE,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  MAX_VIDEOS_PER_PROPERTY,
  VIDEO_MIME_EXT,
} from "@/lib/media-limits";

/**
 * POST multipart/form-data: file, propertyId, roomTypeId (optional — photos of one room type),
 * durationSec (videos, client-measured).
 * Server Actions cap request bodies at 1 MB, so uploads use a route handler.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const propertyId = String(form.get("propertyId") ?? "");
  const roomTypeId = String(form.get("roomTypeId") ?? "") || null;
  const clientDuration = Number(form.get("durationSec") ?? NaN);
  if (!(file instanceof File) || !propertyId) {
    return NextResponse.json({ error: "Missing file or propertyId" }, { status: 400 });
  }

  const property = await db.property.findFirst({
    where: { id: propertyId, hostId: user.id },
    select: { id: true },
  });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  if (roomTypeId) {
    const rt = await db.roomType.findFirst({ where: { id: roomTypeId, propertyId }, select: { id: true } });
    if (!rt) return NextResponse.json({ error: "Room type not found" }, { status: 404 });
  }

  const isImage = file.type in IMAGE_MIME_EXT;
  const isVideo = file.type in VIDEO_MIME_EXT;
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Unsupported file type. Use JPG, PNG, WebP, MP4, WebM or MOV." }, { status: 415 });
  }
  if (roomTypeId && !isImage) {
    return NextResponse.json({ error: "Only photos can be attached to a room type" }, { status: 415 });
  }
  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `File is too large (max ${Math.round(maxBytes / 1048576)} MB)` }, { status: 413 });
  }

  const kind = isImage ? "IMAGE" : "VIDEO";
  const existing = await db.propertyMedia.count({ where: { propertyId, roomTypeId, kind } });
  const limit = roomTypeId ? MAX_IMAGES_PER_ROOM_TYPE : isImage ? MAX_IMAGES_PER_PROPERTY : MAX_VIDEOS_PER_PROPERTY;
  if (existing >= limit) {
    const scope = roomTypeId ? "photos per room type" : isImage ? "photos" : "videos";
    return NextResponse.json({ error: `You can upload at most ${limit} ${scope}` }, { status: 409 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let durationSec: number | null = null;
  if (isVideo) {
    // Trust the container's own metadata when we can read it; otherwise the client's measurement.
    durationSec = mp4DurationSeconds(buffer) ?? (Number.isFinite(clientDuration) ? clientDuration : null);
    if (durationSec === null) {
      return NextResponse.json({ error: "Could not determine video length" }, { status: 400 });
    }
    if (durationSec > MAX_VIDEO_SECONDS) {
      return NextResponse.json(
        { error: `Video is ${Math.round(durationSec)}s — the maximum is ${MAX_VIDEO_SECONDS}s` },
        { status: 422 },
      );
    }
  }

  // Property-wide order so general and room photos never collide (count would reuse slots after deletes).
  const { _max } = await db.propertyMedia.aggregate({ where: { propertyId }, _max: { order: true } });
  const nextOrder = (_max.order ?? -1) + 1;

  const ext = isImage ? IMAGE_MIME_EXT[file.type] : VIDEO_MIME_EXT[file.type];
  const url = await saveFile(buffer, { propertyId, ext });
  const media = await db.propertyMedia.create({
    data: {
      propertyId,
      roomTypeId,
      kind,
      url,
      mimeType: file.type,
      sizeBytes: file.size,
      durationSec,
      order: nextOrder,
    },
  });

  revalidatePath(`/host/properties/${propertyId}/edit`);
  revalidatePath(`/properties/${propertyId}`);
  return NextResponse.json(media);
}
