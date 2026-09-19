import { formatStay } from "@/lib/dates";
import { requireHost } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookingActions } from "@/components/host/booking-actions";

export const metadata = { title: "Bookings" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

export default async function HostBookingsPage() {
  const user = await requireHost();
  const bookings = await db.booking.findMany({
    where: { property: { hostId: user.id } },
    include: {
      property: { select: { title: true, currency: true } },
      roomType: { select: { name: true } },
      guest: { select: { name: true, email: true } },
    },
    orderBy: { checkIn: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Bookings</h1>
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <p className="font-medium">{b.guest.name}</p>
                  <p className="text-xs text-muted-foreground">{b.guest.email}</p>
                </TableCell>
                <TableCell>
                  <p>{b.property.title}</p>
                  <p className="text-xs text-muted-foreground">{b.roomType.name}</p>
                </TableCell>
                <TableCell>
                  {formatStay(b.checkIn, "MMM d, yyyy")} → {formatStay(b.checkOut, "MMM d, yyyy")}
                  <p className="text-xs text-muted-foreground">{b.nights} nights</p>
                </TableCell>
                <TableCell>{b.guests}</TableCell>
                <TableCell>{formatMoney(b.totalAmount, b.property.currency)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[b.status] ?? "outline"}>{b.status}</Badge>
                </TableCell>
                <TableCell>
                  <BookingActions bookingId={b.id} status={b.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
