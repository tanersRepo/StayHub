"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertOwnsProperty } from "@/lib/host";
import { roomTypeSchema, type RoomTypeInput } from "@/lib/validators/property";
import type { ActionResult } from "@/actions/properties";

function toData(input: RoomTypeInput) {
  const { price, ...rest } = input;
  return { ...rest, pricePerNight: Math.round(price * 100) };
}

export async function createRoomType(propertyId: string, input: RoomTypeInput): Promise<ActionResult> {
  await assertOwnsProperty(propertyId);
  const parsed = roomTypeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const count = await db.roomType.count({ where: { propertyId } });
  await db.roomType.create({ data: { ...toData(parsed.data), propertyId, order: count } });
  revalidatePath(`/host/properties/${propertyId}/edit`);
  return { success: true };
}

export async function updateRoomType(roomTypeId: string, input: RoomTypeInput): Promise<ActionResult> {
  const rt = await db.roomType.findUnique({ where: { id: roomTypeId }, select: { propertyId: true } });
  if (!rt) return { error: "Room type not found" };
  await assertOwnsProperty(rt.propertyId);
  const parsed = roomTypeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.roomType.update({ where: { id: roomTypeId }, data: toData(parsed.data) });
  revalidatePath(`/host/properties/${rt.propertyId}/edit`);
  return { success: true };
}

export async function deleteRoomType(roomTypeId: string): Promise<ActionResult> {
  const rt = await db.roomType.findUnique({
    where: { id: roomTypeId },
    select: { propertyId: true, _count: { select: { bookings: { where: { status: { in: ["PENDING", "CONFIRMED"] } } } } } },
  });
  if (!rt) return { error: "Room type not found" };
  await assertOwnsProperty(rt.propertyId);
  if (rt._count.bookings > 0) return { error: "This room type has upcoming bookings and cannot be deleted" };
  await db.roomType.delete({ where: { id: roomTypeId } });
  revalidatePath(`/host/properties/${rt.propertyId}/edit`);
  return { success: true };
}
