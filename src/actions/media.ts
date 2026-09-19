"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertOwnsProperty } from "@/lib/host";
import { deleteFile } from "@/lib/storage";
import type { ActionResult } from "@/actions/properties";

/** Persist a new order; `ids` is the full list of media ids in display order. */
export async function reorderMedia(propertyId: string, ids: string[]): Promise<ActionResult> {
  await assertOwnsProperty(propertyId);
  await db.$transaction(
    ids.map((id, order) => db.propertyMedia.update({ where: { id, propertyId }, data: { order } })),
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
