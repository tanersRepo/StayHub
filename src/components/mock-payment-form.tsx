"use client";

import { useTransition } from "react";
import { CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { payBooking } from "@/actions/bookings";

/** Placeholder checkout. Fields are decorative — nothing is charged. Stripe replaces this. */
export function MockPaymentForm({ bookingId, totalLabel }: { bookingId: string; totalLabel: string }) {
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await payBooking(bookingId);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
        Test mode — no real payment is taken. Any card details work.
      </div>
      <div>
        <Label className="mb-2 block">Card number</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" inputMode="numeric" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-2 block">Expiry</Label>
          <Input placeholder="MM / YY" defaultValue="12 / 30" />
        </div>
        <div>
          <Label className="mb-2 block">CVC</Label>
          <Input placeholder="123" defaultValue="123" inputMode="numeric" />
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <Lock className="size-4" /> {pending ? "Processing…" : `Pay ${totalLabel}`}
      </Button>
    </form>
  );
}
