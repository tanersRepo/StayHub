import Image from "next/image";
import Link from "next/link";
import { formatStay } from "@/lib/dates";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { COVER_IMAGE } from "@/lib/media-query";
import { toUtcDay } from "@/lib/availability";
import { formatMoney } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelTripButton, ReviewDialog } from "@/components/trip-actions";

export const metadata = { title: "My trips" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

export default async function TripsPage() {
  const user = await requireUser("/trips");
  const today = toUtcDay(new Date());
  const bookings = await db.booking.findMany({
    where: { guestId: user.id },
    include: {
      property: { select: { id: true, title: true, city: true, country: true, currency: true, media: COVER_IMAGE } },
      roomType: { select: { name: true } },
      review: { select: { id: true } },
    },
    orderBy: { checkIn: "desc" },
  });
  const upcoming = bookings.filter((b) => b.checkOut > today && b.status !== "CANCELLED");
  const past = bookings.filter((b) => b.checkOut <= today || b.status === "CANCELLED");

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <h1 className="text-2xl font-semibold">My trips</h1>

      <Section title="Upcoming" empty="No upcoming trips — time to plan one!">
        {upcoming.map((b) => (
          <TripRow key={b.id} b={b}>
            {b.status === "PENDING" && (
              <Button size="sm" asChild><Link href={`/bookings/${b.id}`}>Complete payment</Link></Button>
            )}
            {b.checkIn > today && <CancelTripButton bookingId={b.id} />}
          </TripRow>
        ))}
      </Section>

      <Section title="Past" empty="No past trips yet.">
        {past.map((b) => (
          <TripRow key={b.id} b={b}>
            {b.status !== "CANCELLED" && !b.review && <ReviewDialog bookingId={b.id} propertyTitle={b.property.title} />}
            {b.review && <span className="text-xs text-muted-foreground">Reviewed</span>}
          </TripRow>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">{title}</h2>
      {children.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y rounded-xl border">{children}</ul>
      )}
    </section>
  );
}

function TripRow({
  b,
  children,
}: {
  b: {
    id: string; checkIn: Date; checkOut: Date; nights: number; guests: number; status: string; totalAmount: number;
    property: { id: string; title: string; city: string; country: string; currency: string; media: { url: string }[] };
    roomType: { name: string };
  };
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 p-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {b.property.media[0] && <Image src={b.property.media[0].url} alt="" fill sizes="80px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/properties/${b.property.id}`} className="font-medium hover:underline">{b.property.title}</Link>
        <p className="text-sm text-muted-foreground">{b.roomType.name} · {b.property.city}, {b.property.country}</p>
        <p className="text-sm">
          {formatStay(b.checkIn, "MMM d")} – {formatStay(b.checkOut, "MMM d, yyyy")} · {b.nights} nights · {b.guests} guests
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-medium">{formatMoney(b.totalAmount, b.property.currency)}</p>
          <Badge variant={STATUS_VARIANT[b.status] ?? "outline"}>{b.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" asChild><Link href={`/bookings/${b.id}`}>Details</Link></Button>
          {children}
        </div>
      </div>
    </li>
  );
}
