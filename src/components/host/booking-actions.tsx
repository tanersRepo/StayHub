"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelBookingAsHost, confirmBooking } from "@/actions/host-bookings";

export function BookingActions({ bookingId, status }: { bookingId: string; status: string }) {
  const [pending, start] = useTransition();
  if (!["PENDING", "CONFIRMED"].includes(status)) return null;

  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else toast.success(ok);
    });

  return (
    <div className="flex justify-end gap-2">
      {status === "PENDING" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => confirmBooking(bookingId), "Booking confirmed")}>
          Confirm
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => cancelBookingAsHost(bookingId), "Booking cancelled")}
      >
        Cancel
      </Button>
    </div>
  );
}
