"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertOwnsProperty } from "@/lib/host";
import { deleteFile } from "@/lib/storage";
import type { ActionResult } from "@/actions/properties";

/**
 * Persist a new order; `ids` is the full list of media ids of one scope (general gallery or a
 * single room type) in display order. The scope's existing order slots are reassigned in the
 * new sequence, so orders stay unique across the property.
 */
export async function reorderMedia(propertyId: string, ids: string[]): Promise<ActionResult> {
  await assertOwnsProperty(propertyId);
  const rows = await db.propertyMedia.findMany({
    where: { id: { in: ids }, propertyId },
    select: { id: true, order: true },
  });
  if (rows.length !== ids.length) return { error: "Some files no longer exist — refresh and try again" };
  const slots = rows.map((r) => r.order).sort((a, b) => a - b);
  await db.$transaction(
    ids.map((id, i) => db.propertyMedia.update({ where: { id, propertyId }, data: { order: slots[i] } })),
  );
  revalidatePath(`/host/properties/${propertyId}/edit`);
  revalidatePath(`/properties/${propertyId}`);
  return { success: true };
}

export async function deleteMedia(mediaId: string): Promise<ActionResult> {
  const m = await db.propertyMedia.findUnique({ where: { id: mediaId } });
  if (!m) return { error: "File not found" };
  await assertOwnsProperty(m.propertyId);
  await db.propertyMedia.delete({ where: { id: mediaId } });
  await deleteFile(m.url);
  revalidatePath(`/host/properties/${m.propertyId}/edit`);
  revalidatePath(`/properties/${m.propertyId}`);
  return { success: true };
}
