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
import { calculatePrice, formatMoney, nightKeys, nightsBetween, roundToWhole, unpricedNights, type DiscountRule, type RateCard } from "@/lib/pricing";
import { formatPrice, toDisplay, type DisplayMoney } from "@/lib/currency";
import { formatStay } from "@/lib/dates";
import { createBooking } from "@/actions/bookings";

export interface WidgetRoomType {
  id: string;
  name: string;
  /** Default nightly price (null = none: only nights in `overrides` have a price). */
  pricePerNight: number | null;
  /** Host-set prices for specific future nights, keyed yyyy-mm-dd. */
  overrides: Record<string, number>;
  /** Lowest price of any night from today, for display before dates are picked. Null = no prices. */
  fromPrice: number | null;
  maxGuests: number;
  quantity: number;
}

interface Props {
  roomTypes: WidgetRoomType[];
  /** roomTypeId → sold-out nights as yyyy-mm-dd */
  unavailable: Record<string, string[]>;
  rules: DiscountRule[];
  minNights: number;
  /** Listing currency: what the guest is actually charged in. */
  currency: string;
  /** Currency the guest views prices in, with the day's exchange rates. */
  display: DisplayMoney;
  loggedIn: boolean;
  propertyId: string;
  initial: { checkIn?: string; checkOut?: string; guests?: number };
}

const key = (d: Date) => format(d, "yyyy-MM-dd");
const parse = (s?: string) => (s ? new Date(`${s}T00:00:00`) : undefined);
/** Picker dates are local midnight; pricing keys nights by UTC calendar day. */
const utcDay = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
const variesFor = (r: WidgetRoomType) => r.pricePerNight === null || Object.keys(r.overrides).length > 0;

export function BookingWidget({ roomTypes, unavailable, rules, minNights, currency, display, loggedIn, propertyId, initial }: Props) {
  const fmt = (minor: number) => formatPrice(minor, currency, display);
  // True when prices are shown converted, i.e. not in the currency the guest will be charged in.
  const converted = toDisplay(0, currency, display).currency !== currency;
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
    // Check-in on an unavailable night (sold out, blocked or unpriced) is impossible; check-out on
    // one is fine (back-to-back stays).
    if (soldOut.has(key(next.from))) {
      toast.error("That night isn't available");
      return setRange(undefined);
    }
    if (next.from && next.to && next.from.getTime() !== next.to.getTime()) {
      // Completed range: reject if it spans a sold-out night; restart from the clicked day.
      if (!nightsClear(next.from, next.to)) {
        toast.error("Those dates include a night that isn't available");
        return setRange({ from: clicked, to: undefined });
      }
      setOpen(false);
    }
    setRange(next);
  }

  const complete = !!(range?.from && range?.to && range.from.getTime() !== range.to.getTime());
  const nights = complete ? nightsBetween(range!.from!, range!.to!) : 0;
  const card: RateCard | null = room ? { base: room.pricePerNight, overrides: room.overrides } : null;
  // Unpriced nights are unavailable in the date picker, so a picked stay is normally fully priced.
  const priced = complete && !!card && unpricedNights(card, utcDay(range!.from!), utcDay(range!.to!)).length === 0;
  const price = priced ? calculatePrice(card!, utcDay(range!.from!), utcDay(range!.to!), rules) : null;
  // `price` is what the guest is charged (listing currency). When showing another currency, rebuild the
  // breakdown from whole-unit converted nightly prices, so its lines add up on their own.
  const shownCard: RateCard | null =
    card && converted
      ? {
          base: card.base === null ? null : toDisplay(card.base, currency, display).amount,
          overrides: Object.fromEntries(Object.entries(card.overrides ?? {}).map(([k, v]) => [k, toDisplay(v, currency, display).amount])),
        }
      : card;
  const shown = price && shownCard ? calculatePrice(shownCard, utcDay(range!.from!), utcDay(range!.to!), rules) : null;
  const variesByDate = !!room && (room.pricePerNight === null || Object.keys(room.overrides).length > 0);
  const shownIn = converted ? display.currency : currency;
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
              {shown && !tooShort ? (
                <>
                  <span className="text-2xl">{formatMoney(shown.pricePerNight ?? roundToWhole(shown.subtotal / shown.nights), shownIn)}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {shown.pricePerNight === null ? " / night, average" : " / night"}
                  </span>
                </>
              ) : (
                <>
                  {room.fromPrice === null ? (
                    <span className="text-base font-normal text-muted-foreground">No dates available yet</span>
                  ) : (
                    <>
                      {variesByDate && <span className="text-sm font-normal text-muted-foreground">from </span>}
                      <span className="text-2xl">{fmt(room.fromPrice)}</span>
                      <span className="text-sm font-normal text-muted-foreground"> / night</span>
                      {variesByDate && <span className="block text-xs font-normal text-muted-foreground">Price varies by date</span>}
                    </>
                  )}
                </>
              )}
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
                    {r.name}{r.fromPrice !== null && ` — ${variesFor(r) ? "from " : ""}${fmt(r.fromPrice)}`}
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
          <>
            <dl className="space-y-1.5 border-t pt-3 text-sm">
              <Row
                label={shown!.pricePerNight !== null ? `${formatMoney(shown!.pricePerNight, shownIn)} × ${shown!.nights} nights` : `${shown!.nights} nights`}
                value={formatMoney(shown!.subtotal, shownIn)}
              />
              {shown!.pricePerNight === null && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none">Nightly prices</summary>
                  <ul className="mt-1 space-y-0.5">
                    {nightKeys(utcDay(range!.from!), utcDay(range!.to!)).map((k, i) => (
                      <li key={k} className="flex justify-between">
                        <span>{formatStay(new Date(`${k}T00:00:00Z`), "EEE, MMM d")}</span>
                        <span>{formatMoney(shown!.nightly[i], shownIn)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {shown!.discount > 0 && (
                <Row label={`Long-stay discount (${shown!.discountPercent}%)`} value={`− ${formatMoney(shown!.discount, shownIn)}`} className="text-green-700 dark:text-green-400" />
              )}
              <Row label="Total" value={formatMoney(shown!.total, shownIn)} className="border-t pt-2 font-semibold" />
            </dl>
            {converted && (
              <p className="text-xs text-muted-foreground">
                {display.rates.source === "live"
                  ? `Prices in ${display.currency} use the European Central Bank rate of ${formatStay(new Date(`${display.rates.date}T00:00:00Z`), "MMM d")}.`
                  : `Prices in ${display.currency} are approximate.`}{" "}
                You&apos;ll be charged{" "}
                <span className="font-medium text-foreground">{formatMoney(price.total, currency)}</span> ({currency}).
              </p>
            )}
          </>
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
