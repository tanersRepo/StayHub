"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertOwnsProperty } from "@/lib/host";
import { nightsOf, toUtcDay } from "@/lib/availability";
import {
  MAX_RANGE_NIGHTS,
  setBlockedNightsSchema,
  setDefaultPriceSchema,
  setNightlyPriceSchema,
  type SetBlockedNightsInput,
  type SetDefaultPriceInput,
  type SetNightlyPriceInput,
} from "@/lib/validators/rates";
import type { ActionResult } from "@/actions/properties";

/**
 * Validates a night range for a room type the current host owns. Returns the room type and the
 * range as UTC-midnight dates: `start` is the first night, `end` the day after the last.
 */
async function ownedNights(roomTypeId: string, from: string, to: string) {
  const roomType = await db.roomType.findUnique({ where: { id: roomTypeId }, select: { propertyId: true, pricePerNight: true } });
  if (!roomType) return { error: "Room type not found" } as const;
  await assertOwnsProperty(roomType.propertyId);
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(new Date(`${to}T00:00:00Z`).getTime() + 86_400_000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: "Invalid date" } as const;
  if (start < toUtcDay(new Date())) return { error: "You can't change nights in the past" } as const;
  const nights = nightsOf({ checkIn: start, checkOut: end });
  if (nights.length > MAX_RANGE_NIGHTS) return { error: `Pick at most ${MAX_RANGE_NIGHTS} nights at a time` } as const;
  return { roomType, start, end, nights } as const;
}

function revalidate(propertyId: string) {
  revalidatePath("/host/calendar");
  revalidatePath(`/host/properties/${propertyId}/edit`);
  revalidatePath(`/properties/${propertyId}`);
}

/**
 * Set the price of every night from `from` through `to` (inclusive). `price` is whole units in
 * the listing currency; null — or the default price itself — clears the nights back to the
 * default (or, for a room with no default, leaves them unpriced and so not bookable).
 */
export async function setNightlyPrice(input: SetNightlyPriceInput): Promise<ActionResult> {
  const parsed = setNightlyPriceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { roomTypeId, from, to, price } = parsed.data;
  const r = await ownedNights(roomTypeId, from, to);
  if ("error" in r) return { error: r.error };

  const minor = price === null ? null : price * 100;
  await db.$transaction(async (tx) => {
    await tx.nightlyRate.deleteMany({ where: { roomTypeId, date: { gte: r.start, lt: r.end } } });
    // Only store real overrides: a night at the default price is just the default.
    if (minor !== null && minor !== r.roomType.pricePerNight) {
      await tx.nightlyRate.createMany({ data: r.nights.map((date) => ({ roomTypeId, date, price: minor })) });
    }
  });
  revalidate(r.roomType.propertyId);
  return { success: true };
}

/** Block (or unblock) every night from `from` through `to` (inclusive), for all units. */
export async function setBlockedNights(input: SetBlockedNightsInput): Promise<ActionResult> {
  const parsed = setBlockedNightsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { roomTypeId, from, to, blocked } = parsed.data;
  const r = await ownedNights(roomTypeId, from, to);
  if ("error" in r) return { error: r.error };

  await db.$transaction(async (tx) => {
    await tx.blockedDate.deleteMany({ where: { roomTypeId, date: { gte: r.start, lt: r.end } } });
    if (blocked) await tx.blockedDate.createMany({ data: r.nights.map((date) => ({ roomTypeId, date })) });
  });
  revalidate(r.roomType.propertyId);
  return { success: true };
}

/**
 * Set a room type's default nightly price: what every date the host hasn't priced costs. Null
 * removes it, so only dates priced in the calendar can be booked.
 */
export async function setDefaultPrice(input: SetDefaultPriceInput): Promise<ActionResult> {
  const parsed = setDefaultPriceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { roomTypeId, price } = parsed.data;
  const roomType = await db.roomType.findUnique({ where: { id: roomTypeId }, select: { propertyId: true } });
  if (!roomType) return { error: "Room type not found" };
  await assertOwnsProperty(roomType.propertyId);
  const minor = price === null ? null : price * 100;
  await db.$transaction(async (tx) => {
    await tx.roomType.update({ where: { id: roomTypeId }, data: { pricePerNight: minor } });
    // Dates priced the same as the new default are no longer overrides.
    if (minor !== null) await tx.nightlyRate.deleteMany({ where: { roomTypeId, price: minor } });
  });
  revalidate(roomType.propertyId);
  return { success: true };
}
