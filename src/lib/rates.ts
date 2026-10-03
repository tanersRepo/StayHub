import { db } from "@/lib/db";
import { toUtcDay } from "@/lib/availability";
import type { RateCard } from "@/lib/pricing";

/**
 * Host-set per-night prices for the given room types, for nights in [from, to), keyed by room
 * type then night (yyyy-mm-dd). Pass `to` = null for every future override. Nights without an
 * entry use the room type's base price.
 */
export async function loadOverrides(
  roomTypeIds: string[],
  from: Date,
  to: Date | null,
): Promise<Map<string, Record<string, number>>> {
  const rows = roomTypeIds.length
    ? await db.nightlyRate.findMany({
        where: { roomTypeId: { in: roomTypeIds }, date: { gte: toUtcDay(from), ...(to ? { lt: toUtcDay(to) } : {}) } },
        select: { roomTypeId: true, date: true, price: true },
      })
    : [];
  const out = new Map<string, Record<string, number>>();
  for (const id of roomTypeIds) out.set(id, {});
  for (const r of rows) out.get(r.roomTypeId)![r.date.toISOString().slice(0, 10)] = r.price;
  return out;
}

/** A room type's rate card for a stay (its base price plus the overrides inside the stay). */
export async function rateCardFor(
  roomType: { id: string; pricePerNight: number | null },
  checkIn: Date,
  checkOut: Date,
): Promise<RateCard> {
  const overrides = (await loadOverrides([roomType.id], checkIn, checkOut)).get(roomType.id);
  return { base: roomType.pricePerNight, overrides };
}

/**
 * "From" price of each room type: the lowest of its default price and any price set for a night
 * from today on. Null when the room has no price at all yet (not bookable).
 */
export async function startingPrices(roomTypes: { id: string; pricePerNight: number | null }[]): Promise<Map<string, number | null>> {
  const ids = roomTypes.map((r) => r.id);
  const mins = ids.length
    ? await db.nightlyRate.groupBy({
        by: ["roomTypeId"],
        where: { roomTypeId: { in: ids }, date: { gte: toUtcDay(new Date()) } },
        _min: { price: true },
      })
    : [];
  const minById = new Map(mins.map((m) => [m.roomTypeId, m._min.price]));
  return new Map(
    roomTypes.map((r) => {
      const candidates = [r.pricePerNight, minById.get(r.id) ?? null].filter((p): p is number => p !== null);
      return [r.id, candidates.length ? Math.min(...candidates) : null];
    }),
  );
}

/** How far ahead guests can pick dates on a room with no default price (nights must be priced). */
export const BOOKING_HORIZON_DAYS = 548;

/**
 * Nights (yyyy-mm-dd) from today within the booking horizon that have no price, for a room with
 * no default price. Empty when the room has a default (every night is priced).
 */
export function unpricedAhead(card: RateCard): string[] {
  if (card.base !== null) return [];
  const today = toUtcDay(new Date()).getTime();
  const out: string[] = [];
  for (let i = 0; i < BOOKING_HORIZON_DAYS; i++) {
    const key = new Date(today + i * 86_400_000).toISOString().slice(0, 10);
    if (card.overrides?.[key] === undefined) out.push(key);
  }
  return out;
}
