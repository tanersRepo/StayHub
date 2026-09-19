"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelBooking, createReview } from "@/actions/bookings";
import { cn } from "@/lib/utils";

export function CancelTripButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this booking?")) return;
        start(async () => {
          const res = await cancelBooking(bookingId);
          if (res.error) toast.error(res.error);
          else toast.success("Booking cancelled");
        });
      }}
    >
      Cancel
    </Button>
  );
}

export function ReviewDialog({ bookingId, propertyTitle }: { bookingId: string; propertyTitle: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createReview({ bookingId, rating, comment });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Thanks for your review!");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Leave a review</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>How was {propertyTitle}?</DialogTitle>
            <DialogDescription>Your review helps other guests and is shown on the listing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} stars`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                  className="p-0.5"
                >
                  <Star className={cn("size-7", n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="What did you like? What could be better?"
              required
              minLength={10}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Posting…" : "Post review"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
