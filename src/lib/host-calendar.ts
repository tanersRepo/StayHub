import { db } from "@/lib/db";
import { ACTIVE_BOOKING_STATUSES, nightsOf, toUtcDay } from "@/lib/availability";
import { stayKey } from "@/lib/dates";
import type { CalendarNight } from "@/components/host/pricing-calendar";

/**
 * Per-night bookings, blocks and prices for a room type's pricing calendar, keyed yyyy-mm-dd.
 * Starts yesterday so today's cell can show whether last night was booked (a check-out).
 */
export async function loadCalendarNights(roomTypeId: string): Promise<Record<string, CalendarNight>> {
  const since = new Date(toUtcDay(new Date()).getTime() - 86_400_000);
  const [bookings, blocked, rates] = await Promise.all([
    db.booking.findMany({
      where: { roomTypeId, status: { in: ACTIVE_BOOKING_STATUSES }, checkOut: { gt: since } },
      select: { checkIn: true, checkOut: true },
    }),
    db.blockedDate.findMany({ where: { roomTypeId, date: { gte: since } }, select: { date: true } }),
    db.nightlyRate.findMany({ where: { roomTypeId, date: { gte: since } }, select: { date: true, price: true } }),
  ]);
  const nights: Record<string, CalendarNight> = {};
  const night = (d: Date) => (nights[stayKey(d)] ??= { booked: 0, blocked: false });
  for (const b of bookings) for (const n of nightsOf(b)) night(n).booked += 1;
  for (const b of blocked) night(b.date).blocked = true;
  for (const r of rates) night(r.date).price = r.price;
  return nights;
}
