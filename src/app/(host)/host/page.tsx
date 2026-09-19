import Link from "next/link";
import { format } from "date-fns";
import { requireHost } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { toUtcDay } from "@/lib/availability";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Host dashboard" };

export default async function HostDashboard() {
  const user = await requireHost();
  const today = toUtcDay(new Date());
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [propertyCount, publishedCount, upcoming, monthRevenue, arrivals] = await Promise.all([
    db.property.count({ where: { hostId: user.id } }),
    db.property.count({ where: { hostId: user.id, status: "PUBLISHED" } }),
    db.booking.count({
      where: { property: { hostId: user.id }, status: { in: ["PENDING", "CONFIRMED"] }, checkOut: { gt: today } },
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: { status: "PAID", booking: { property: { hostId: user.id }, checkIn: { gte: monthStart } } },
    }),
    db.booking.findMany({
      where: { property: { hostId: user.id }, status: { in: ["PENDING", "CONFIRMED"] }, checkIn: { gte: today } },
      include: { property: { select: { title: true, currency: true } }, roomType: { select: { name: true } }, guest: { select: { name: true } } },
      orderBy: { checkIn: "asc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Welcome back, {user.name?.split(" ")[0]}</h1>
        <Button asChild>
          <Link href="/host/properties/new">Add property</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Properties" value={String(propertyCount)} hint={`${publishedCount} published`} />
        <Stat label="Upcoming bookings" value={String(upcoming)} hint="pending + confirmed" />
        <Stat label="Revenue this month" value={formatMoney(monthRevenue._sum.amount ?? 0)} hint="by check-in date" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next arrivals</CardTitle>
          <CardDescription>Your next five check-ins</CardDescription>
        </CardHeader>
        <CardContent>
          {arrivals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming arrivals.</p>
          ) : (
            <ul className="divide-y">
              {arrivals.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{b.guest.name}</p>
                    <p className="text-muted-foreground">
                      {b.property.title} · {b.roomType.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>
                      {format(b.checkIn, "MMM d")} – {format(b.checkOut, "MMM d")}
                    </p>
                    <Badge variant={b.status === "CONFIRMED" ? "default" : "secondary"}>{b.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}
