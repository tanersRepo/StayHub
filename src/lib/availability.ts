import { db } from "@/lib/db";

export const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED"];

export interface StayRange {
  checkIn: Date;
  checkOut: Date;
}

/** Two half-open ranges [a.checkIn, a.checkOut) and [b.checkIn, b.checkOut) overlap. */
export function rangesOverlap(a: StayRange, b: StayRange): boolean {
  return a.checkIn < b.checkOut && a.checkOut > b.checkIn;
}

/** Normalise any date to UTC midnight so comparisons are day-granular. */
export function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Nights covered by a stay: every day from checkIn up to (not including) checkOut. */
export function nightsOf(range: StayRange): Date[] {
  const nights: Date[] = [];
  const end = toUtcDay(range.checkOut).getTime();
  for (let t = toUtcDay(range.checkIn).getTime(); t < end; t += 86_400_000) nights.push(new Date(t));
  return nights;
}

/**
 * Per-night count of units already taken for a room type.
 * `blocked` nights take every unit; each booking takes one unit per night it covers.
 */
export function occupancyByNight(bookings: StayRange[], blocked: Date[], quantity: number): Map<number, number> {
  const taken = new Map<number, number>();
  for (const b of bookings) {
    for (const n of nightsOf(b)) taken.set(n.getTime(), (taken.get(n.getTime()) ?? 0) + 1);
  }
  for (const d of blocked) taken.set(toUtcDay(d).getTime(), quantity);
  return taken;
}

/**
 * Pure check used by both the DB helper and unit tests.
 * A range is available when every night has at least one free unit.
 */
export function isRangeAvailable(
  requested: StayRange,
  bookings: StayRange[],
  blocked: Date[],
  quantity = 1,
): boolean {
  const taken = occupancyByNight(bookings, blocked, quantity);
  return nightsOf(requested).every((n) => (taken.get(n.getTime()) ?? 0) < quantity);
}

type Tx = Pick<typeof db, "booking" | "blockedDate" | "roomType">;

/** DB-backed availability check. Pass a transaction client to make it atomic with a write. */
export async function checkAvailability(
  roomTypeId: string,
  requested: StayRange,
  client: Tx = db,
): Promise<boolean> {
  const [roomType, bookings, blocked] = await Promise.all([
    client.roomType.findUnique({ where: { id: roomTypeId }, select: { quantity: true } }),
    client.booking.findMany({
      where: {
        roomTypeId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkIn: { lt: requested.checkOut },
        checkOut: { gt: requested.checkIn },
      },
      select: { checkIn: true, checkOut: true },
    }),
    client.blockedDate.findMany({
      where: { roomTypeId, date: { gte: requested.checkIn, lt: requested.checkOut } },
      select: { date: true },
    }),
  ]);
  if (!roomType) return false;
  return isRangeAvailable(requested, bookings, blocked.map((b) => b.date), roomType.quantity);
}

/** Fully-booked nights for a room type from today onward (for disabling calendar days). */
export async function unavailableNights(roomTypeId: string): Promise<Date[]> {
  const today = toUtcDay(new Date());
  const [roomType, bookings, blocked] = await Promise.all([
    db.roomType.findUnique({ where: { id: roomTypeId }, select: { quantity: true } }),
    db.booking.findMany({
      where: { roomTypeId, status: { in: ACTIVE_BOOKING_STATUSES }, checkOut: { gt: today } },
      select: { checkIn: true, checkOut: true },
    }),
    db.blockedDate.findMany({ where: { roomTypeId, date: { gte: today } }, select: { date: true } }),
  ]);
  const quantity = roomType?.quantity ?? 1;
  const taken = occupancyByNight(bookings, blocked.map((b) => b.date), quantity);
  return [...taken.entries()]
    .filter(([, count]) => count >= quantity)
    .map(([t]) => new Date(t))
    .sort((a, b) => a.getTime() - b.getTime());
}

/** IDs of room types (among the given) that can host the requested stay. */
export async function availableRoomTypeIds(roomTypeIds: string[], requested: StayRange): Promise<Set<string>> {
  const results = await Promise.all(
    roomTypeIds.map(async (id) => [id, await checkAvailability(id, requested)] as const),
  );
  return new Set(results.filter(([, ok]) => ok).map(([id]) => id));
}
