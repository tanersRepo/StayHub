"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireHost } from "@/lib/auth";
import { assertOwnsProperty } from "@/lib/host";
import { toUtcDay } from "@/lib/availability";
import type { ActionResult } from "@/actions/properties";

async function ownedBooking(bookingId: string) {
  const user = await requireHost();
  const booking = await db.booking.findFirst({
    where: { id: bookingId, property: { hostId: user.id } },
  });
  if (!booking) throw new Error("Booking not found");
  return booking;
}

export async function confirmBooking(bookingId: string): Promise<ActionResult> {
  const b = await ownedBooking(bookingId);
  if (b.status !== "PENDING") return { error: "Only pending bookings can be confirmed" };
  await db.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED" } });
  revalidatePath("/host/bookings");
  revalidatePath("/host");
  return { success: true };
}

export async function cancelBookingAsHost(bookingId: string): Promise<ActionResult> {
  const b = await ownedBooking(bookingId);
  if (!["PENDING", "CONFIRMED"].includes(b.status)) return { error: "This booking cannot be cancelled" };
  await db.$transaction([
    db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } }),
    db.payment.updateMany({ where: { bookingId, status: "PAID" }, data: { status: "REFUNDED" } }),
  ]);
  revalidatePath("/host/bookings");
  revalidatePath("/host");
  return { success: true };
}

/** Toggle a blocked night for a room type. `dateISO` is yyyy-mm-dd. */
export async function toggleBlockedDate(roomTypeId: string, dateISO: string): Promise<ActionResult> {
  const rt = await db.roomType.findUnique({ where: { id: roomTypeId }, select: { propertyId: true } });
  if (!rt) return { error: "Room type not found" };
  await assertOwnsProperty(rt.propertyId);
  const date = toUtcDay(new Date(`${dateISO}T00:00:00Z`));
  if (Number.isNaN(date.getTime())) return { error: "Invalid date" };

  const existing = await db.blockedDate.findUnique({ where: { roomTypeId_date: { roomTypeId, date } } });
  if (existing) await db.blockedDate.delete({ where: { id: existing.id } });
  else await db.blockedDate.create({ data: { roomTypeId, date } });
  revalidatePath("/host/calendar");
  return { success: true };
}
