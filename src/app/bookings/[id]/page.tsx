import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatStay } from "@/lib/dates";
import { CheckCircle2, MapPin, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { calculatePrice, formatMoney } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MockPaymentForm } from "@/components/mock-payment-form";

export const metadata = { title: "Your booking" };

export default async function BookingPage({ params, searchParams }: PageProps<"/bookings/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { paid } = await searchParams;
  const b = await db.booking.findFirst({
    where: { id, guestId: user.id },
    include: {
      property: { include: { media: { where: { kind: "IMAGE" }, orderBy: { order: "asc" }, take: 1 }, pricingRules: true } },
      roomType: true,
      payment: true,
    },
  });
  if (!b) notFound();

  const price = calculatePrice(b.roomType.pricePerNight, b.checkIn, b.checkOut, b.property.pricingRules);
  const cur = b.property.currency;
  const justPaid = paid === "1" && b.status === "CONFIRMED";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {justPaid && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          <CheckCircle2 className="size-6 shrink-0" />
          <div>
            <p className="font-medium">You&apos;re booked!</p>
            <p className="text-sm">Confirmation sent to {user.email}. Check-in from {b.property.checkInTime} on {formatStay(b.checkIn, "EEEE, MMM d")}.</p>
          </div>
        </div>
      )}

      <h1 className="mb-6 text-2xl font-semibold">
        {b.status === "PENDING" ? "Confirm and pay" : "Your booking"}
      </h1>

      <div className="grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          {b.status === "PENDING" ? (
            <Card>
              <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
              <CardContent>
                <MockPaymentForm bookingId={b.id} totalLabel={formatMoney(b.totalAmount, cur)} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Status</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><Badge variant={b.status === "CANCELLED" ? "destructive" : "default"}>{b.status}</Badge></p>
                {b.payment && (
                  <p className="text-muted-foreground">
                    Paid {formatMoney(b.payment.amount, cur)} on {formatStay(b.payment.createdAt, "MMM d, yyyy")}
                    {b.payment.status === "REFUNDED" && " · refunded"}
                  </p>
                )}
                <p className="text-muted-foreground">Booking reference: {b.id}</p>
                <Button variant="outline" asChild><Link href="/trips">Go to my trips</Link></Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-[16/9] bg-muted">
              {b.property.media[0] && <Image src={b.property.media[0].url} alt="" fill sizes="40vw" className="object-cover" />}
            </div>
            <CardContent className="space-y-3 p-4 text-sm">
              <div>
                <Link href={`/properties/${b.property.id}`} className="font-medium hover:underline">{b.property.title}</Link>
                <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="size-3.5" />{b.property.city}, {b.property.country}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">{b.roomType.name}</p>
                <p className="text-muted-foreground">{formatStay(b.checkIn, "EEE, MMM d")} → {formatStay(b.checkOut, "EEE, MMM d, yyyy")} · {b.nights} nights</p>
                <p className="flex items-center gap-1 text-muted-foreground"><Users className="size-3.5" />{b.guests} guests</p>
              </div>
              <dl className="space-y-1 border-t pt-3">
                <Row label={`${formatMoney(price.pricePerNight, cur)} × ${price.nights} nights`} value={formatMoney(price.subtotal, cur)} />
                {price.discount > 0 && <Row label={`Long-stay discount (${price.discountPercent}%)`} value={`− ${formatMoney(price.discount, cur)}`} />}
                <Row label="Service fee" value={formatMoney(price.serviceFee, cur)} />
                <Row label="Total" value={formatMoney(b.totalAmount, cur)} className="border-t pt-2 text-base font-semibold" />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between gap-4 ${className ?? ""}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
