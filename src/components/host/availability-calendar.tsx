"use client";

import { useState, useTransition } from "react";
import { addMonths, format, getDaysInMonth, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleBlockedDate } from "@/actions/host-bookings";

export interface CalendarNight {
  /** yyyy-mm-dd */
  date: string;
  booked: number;
  blocked: boolean;
}

interface Props {
  roomTypeId: string;
  quantity: number;
  nights: CalendarNight[];
}

/** Month grid where each cell shows units booked / blocked; clicking toggles a host block. */
export function AvailabilityCalendar({ roomTypeId, quantity, nights }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [pending, start] = useTransition();
  const byDate = new Map(nights.map((n) => [n.date, n]));

  const days = getDaysInMonth(month);
  const firstWeekday = (month.getDay() + 6) % 7; // Monday-first
  const todayKey = format(new Date(), "yyyy-MM-dd");

  function toggle(dateKey: string) {
    start(async () => {
      const res = await toggleBlockedDate(roomTypeId, dateKey);
      if (res.error) toast.error(res.error);
    });
  }

  return (
    <div className={cn("rounded-xl border p-4", pending && "opacity-60")}>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-medium">{format(month, "MMMM yyyy")}</p>
        <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
          const key = format(date, "yyyy-MM-dd");
          const n = byDate.get(key);
          const past = key < todayKey;
          const soldOut = n?.blocked || (n?.booked ?? 0) >= quantity;
          return (
            <button
              key={key}
              type="button"
              disabled={past || pending}
              onClick={() => toggle(key)}
              title={n?.blocked ? "Blocked by you — click to unblock" : `${n?.booked ?? 0}/${quantity} booked — click to block`}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors",
                past && "opacity-40",
                !past && "hover:border-primary",
                n?.blocked && "bg-muted line-through",
                !n?.blocked && soldOut && "bg-destructive/10 text-destructive",
                !n?.blocked && !soldOut && (n?.booked ?? 0) > 0 && "bg-primary/10",
              )}
            >
              <span>{i + 1}</span>
              {quantity > 1 && !n?.blocked && (n?.booked ?? 0) > 0 && (
                <span className="text-[10px] text-muted-foreground">{n?.booked}/{quantity}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend className="bg-primary/10" label="Partially booked" />
        <Legend className="bg-destructive/10" label="Sold out" />
        <Legend className="bg-muted" label="Blocked by you" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm border", className)} />
      {label}
    </span>
  );
}
