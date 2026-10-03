import Link from "next/link";
import { requireHost } from "@/lib/auth";
import { db } from "@/lib/db";
import { PricingCalendar } from "@/components/host/pricing-calendar";
import { loadCalendarNights } from "@/lib/host-calendar";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Calendar" };

export default async function HostCalendarPage({ searchParams }: PageProps<"/host/calendar">) {
  const user = await requireHost();
  const { roomType: selectedParam } = await searchParams;

  const properties = await db.property.findMany({
    where: { hostId: user.id },
    include: { roomTypes: { orderBy: { order: "asc" }, select: { id: true, name: true, quantity: true, pricePerNight: true } } },
    orderBy: { title: "asc" },
  });
  const all = properties.flatMap((p) => p.roomTypes.map((rt) => ({ ...rt, propertyTitle: p.title, currency: p.currency })));
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

  const nights = await loadCalendarNights(selected.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Calendar &amp; prices</h1>
        <p className="text-sm text-muted-foreground">
          Set a different price for any night, or block nights you can&apos;t host. Nights you don&apos;t change use the
          room&apos;s base price.
        </p>
      </div>
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
      <PricingCalendar
        key={selected.id}
        roomTypeId={selected.id}
        basePrice={selected.pricePerNight}
        currency={selected.currency}
        quantity={selected.quantity}
        nights={nights}
      />
    </div>
  );
}
