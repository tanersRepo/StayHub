import Link from "next/link";
import { format } from "date-fns";
import { requireHost } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE_BOOKING_STATUSES, nightsOf, toUtcDay } from "@/lib/availability";
import { AvailabilityCalendar, type CalendarNight } from "@/components/host/availability-calendar";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Calendar" };

export default async function HostCalendarPage({ searchParams }: PageProps<"/host/calendar">) {
  const user = await requireHost();
  const { roomType: selectedParam } = await searchParams;

  const properties = await db.property.findMany({
    where: { hostId: user.id },
    include: { roomTypes: { orderBy: { order: "asc" }, select: { id: true, name: true, quantity: true } } },
    orderBy: { title: "asc" },
  });
  const all = properties.flatMap((p) => p.roomTypes.map((rt) => ({ ...rt, propertyTitle: p.title })));
  const selected = all.find((rt) => rt.id === selectedParam) ?? all[0];

  if (!selected) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Add a property with at least one room type to manage availability.
        </p>
      </div>
    );
  }

  // Build per-night occupancy from today for the selected room type.
  const today = toUtcDay(new Date());
  const [bookings, blocked] = await Promise.all([
    db.booking.findMany({
      where: { roomTypeId: selected.id, status: { in: ACTIVE_BOOKING_STATUSES }, checkOut: { gt: today } },
      select: { checkIn: true, checkOut: true },
    }),
    db.blockedDate.findMany({ where: { roomTypeId: selected.id, date: { gte: today } }, select: { date: true } }),
  ]);
  const map = new Map<string, CalendarNight>();
  const key = (d: Date) => format(d, "yyyy-MM-dd");
  for (const b of bookings) {
    for (const n of nightsOf(b)) {
      const k = key(new Date(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
      const cur = map.get(k) ?? { date: k, booked: 0, blocked: false };
      cur.booked += 1;
      map.set(k, cur);
    }
  }
  for (const b of blocked) {
    const d = toUtcDay(b.date);
    const k = key(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const cur = map.get(k) ?? { date: k, booked: 0, blocked: false };
    cur.blocked = true;
    map.set(k, cur);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <div className="max-w-md">
        <Label className="mb-2 block">Room type</Label>
        <nav className="flex flex-col gap-1 rounded-lg border p-1">
          {all.map((rt) => (
            <Link
              key={rt.id}
              href={`/host/calendar?roomType=${rt.id}`}
              className={`rounded-md px-3 py-1.5 text-sm hover:bg-muted ${rt.id === selected.id ? "bg-muted font-medium" : ""}`}
            >
              {rt.propertyTitle} · {rt.name}
              <span className="text-muted-foreground"> ({rt.quantity} unit{rt.quantity === 1 ? "" : "s"})</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="max-w-md">
        <AvailabilityCalendar
          key={selected.id}
          roomTypeId={selected.id}
          quantity={selected.quantity}
          nights={[...map.values()]}
        />
        <p className="mt-2 text-xs text-muted-foreground">Click a night to block or unblock it for all units of this room type.</p>
      </div>
    </div>
  );
}
