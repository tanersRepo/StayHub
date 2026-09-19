"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculatePrice, formatMoney, nightsBetween, type DiscountRule } from "@/lib/pricing";
import { createBooking } from "@/actions/bookings";

export interface WidgetRoomType {
  id: string;
  name: string;
  pricePerNight: number;
  maxGuests: number;
  quantity: number;
}

interface Props {
  roomTypes: WidgetRoomType[];
  /** roomTypeId → sold-out nights as yyyy-mm-dd */
  unavailable: Record<string, string[]>;
  rules: DiscountRule[];
  minNights: number;
  currency: string;
  loggedIn: boolean;
  propertyId: string;
  initial: { checkIn?: string; checkOut?: string; guests?: number };
}

const key = (d: Date) => format(d, "yyyy-MM-dd");
const parse = (s?: string) => (s ? new Date(`${s}T00:00:00`) : undefined);

export function BookingWidget({ roomTypes, unavailable, rules, minNights, currency, loggedIn, propertyId, initial }: Props) {
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? "");
  const [guests, setGuests] = useState(initial.guests ?? 2);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = parse(initial.checkIn);
    const to = parse(initial.checkOut);
    return from && to ? { from, to } : undefined;
  });
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const room = roomTypes.find((r) => r.id === roomTypeId);
  const soldOut = useMemo(() => new Set(unavailable[roomTypeId] ?? []), [unavailable, roomTypeId]);
  const today = startOfDay(new Date());

  /** A stay is valid if none of its nights (check-in .. night before check-out) is sold out. */
  function nightsClear(from: Date, to: Date) {
    for (let d = from; isBefore(d, to); d = addDays(d, 1)) if (soldOut.has(key(d))) return false;
    return true;
  }

  function onSelect(next: DateRange | undefined, clicked: Date) {
    if (!next?.from) return setRange(undefined);
    // Check-in on a sold-out night is impossible; check-out on one is fine (back-to-back stays).
    if (soldOut.has(key(next.from))) {
      toast.error("That night is already booked");
      return setRange(undefined);
    }
    if (next.from && next.to && next.from.getTime() !== next.to.getTime()) {
      // Completed range: reject if it spans a sold-out night; restart from the clicked day.
      if (!nightsClear(next.from, next.to)) {
        toast.error("Those dates include a night that's already booked");
        return setRange({ from: clicked, to: undefined });
      }
      setOpen(false);
    }
    setRange(next);
  }

  const complete = !!(range?.from && range?.to && range.from.getTime() !== range.to.getTime());
  const nights = complete ? nightsBetween(range!.from!, range!.to!) : 0;
  const price = complete && room ? calculatePrice(room.pricePerNight, range!.from!, range!.to!, rules) : null;
  const tooShort = complete && nights < minNights;
  const tooMany = room ? guests > room.maxGuests : false;
  const canReserve = complete && !tooShort && !tooMany && !!room;

  const reserveHref = `/login?callbackUrl=${encodeURIComponent(
    `/properties/${propertyId}?${new URLSearchParams({
      ...(range?.from ? { checkIn: key(range.from) } : {}),
      ...(range?.to ? { checkOut: key(range.to) } : {}),
      guests: String(guests),
    }).toString()}`,
  )}`;

  function reserve() {
    if (!canReserve || !range?.from || !range.to) return;
    start(async () => {
      const res = await createBooking({ roomTypeId, checkIn: key(range.from!), checkOut: key(range.to!), guests });
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>
          {room && (
            <>
              <span className="text-2xl">{formatMoney(room.pricePerNight, currency)}</span>
              <span className="text-sm font-normal text-muted-foreground"> / night</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {roomTypes.length > 1 && (
          <div>
            <Label className="mb-2 block text-xs">Room</Label>
            <Select value={roomTypeId} onValueChange={(v) => { setRoomTypeId(v); setRange(undefined); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {roomTypes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} — {formatMoney(r.pricePerNight, currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="grid w-full grid-cols-2 gap-2 text-left text-sm">
              <div className="rounded-lg border p-2 hover:bg-muted">
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p>{range?.from ? format(range.from, "MMM d, yyyy") : "Add date"}</p>
              </div>
              <div className="rounded-lg border p-2 hover:bg-muted">
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p>{complete ? format(range!.to!, "MMM d, yyyy") : "Add date"}</p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={range}
              onSelect={onSelect}
              disabled={{ before: today }}
              modifiers={{ soldOut: (d) => soldOut.has(key(d)) }}
              modifiersClassNames={{ soldOut: "line-through opacity-40" }}
            />
            <p className="flex items-center gap-1 border-t px-3 py-2 text-xs text-muted-foreground">
              <CalendarIcon className="size-3" /> Crossed-out nights are fully booked
              {minNights > 1 && ` · minimum ${minNights} nights`}
            </p>
          </PopoverContent>
        </Popover>

        <div>
          <Label className="mb-2 block text-xs">Guests</Label>
          <Input
            type="number"
            min={1}
            max={room?.maxGuests ?? 30}
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
          />
          {tooMany && <p className="mt-1 text-xs text-destructive">This room sleeps up to {room?.maxGuests} guests.</p>}
        </div>

        {loggedIn ? (
          <Button className="w-full" size="lg" disabled={!canReserve || pending} onClick={reserve}>
            {pending ? "Reserving…" : complete ? "Reserve" : "Select dates"}
          </Button>
        ) : (
          <Button className="w-full" size="lg" asChild>
            <Link href={reserveHref}>Log in to reserve</Link>
          </Button>
        )}
        {tooShort && <p className="text-center text-xs text-destructive">Minimum stay is {minNights} nights.</p>}

        {price && !tooShort ? (
          <dl className="space-y-1.5 border-t pt-3 text-sm">
            <Row label={`${formatMoney(price.pricePerNight, currency)} × ${price.nights} nights`} value={formatMoney(price.subtotal, currency)} />
            {price.discount > 0 && (
              <Row label={`Long-stay discount (${price.discountPercent}%)`} value={`− ${formatMoney(price.discount, currency)}`} className="text-green-700 dark:text-green-400" />
            )}
            <Row label="Service fee" value={formatMoney(price.serviceFee, currency)} />
            <Row label="Total" value={formatMoney(price.total, currency)} className="border-t pt-2 font-semibold" />
          </dl>
        ) : (
          <p className="text-center text-xs text-muted-foreground">You won&apos;t be charged yet</p>
        )}
      </CardContent>
    </Card>
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
