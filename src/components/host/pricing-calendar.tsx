"use client";

import { useState, useTransition } from "react";
import { addDays, addMonths, format, getDaysInMonth, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/pricing";
import { setBlockedNights, setDefaultPrice, setNightlyPrice } from "@/actions/rates";

export interface CalendarNight {
  /** Units booked this night. */
  booked: number;
  /** Blocked by the host. */
  blocked: boolean;
  /** Host-set price for this night (minor units); absent = the default price, if any. */
  price?: number;
}

interface Props {
  roomTypeId: string;
  /** Default nightly price (minor units) for dates without their own price; null = no default. */
  basePrice: number | null;
  currency: string;
  quantity: number;
  /** Nights with bookings, blocks or custom prices, keyed yyyy-mm-dd. */
  nights: Record<string, CalendarNight>;
}

type Status = "free" | "booked" | "blocked" | "unpriced";

/**
 * Cell colours, as in a booking calendar: green free, red booked, grey blocked by the host, white
 * for a date with no price yet (not bookable).
 */
const COLOR: Record<Status, string> = { free: "#dcfce7", booked: "#fecdd3", blocked: "#e5e7eb", unpriced: "#ffffff" };
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMMM"));

const keyOf = (d: Date) => format(d, "yyyy-MM-dd");
const dateOf = (key: string) => new Date(`${key}T00:00:00`);

/**
 * Host pricing calendar: prices are set here, date by date. Every night shows its price, coloured by
 * availability; split cells mark check-in/check-out days (top-left is the previous night,
 * bottom-right this night). Click a night, then another, to select a range; then price or block it.
 * An optional default price covers every date not priced individually.
 */
export function PricingCalendar({ roomTypeId, basePrice, currency, quantity, nights }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [sel, setSel] = useState<{ start: string; end: string } | null>(null);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [pending, start] = useTransition();
  const [defaultInput, setDefaultInput] = useState(basePrice === null ? "" : String(basePrice / 100));

  const todayKey = keyOf(new Date());
  const priceOf = (key: string): number | null => nights[key]?.price ?? basePrice;
  const thisYear = new Date().getFullYear();

  const status = (key: string): Status => {
    const n = nights[key];
    if (n?.blocked) return "blocked";
    if ((n?.booked ?? 0) >= quantity) return "booked";
    return priceOf(key) === null ? "unpriced" : "free";
  };
  const inSel = (key: string) => !!sel && key >= sel.start && key <= sel.end;

  function pick(key: string, extend: boolean) {
    // A click starts a selection; the next click (or any shift-click) ends it, giving a range.
    const from = anchor ?? (extend && sel ? sel.start : null);
    if (from) {
      const [a, b] = key < from ? [key, from] : [from, key];
      setSel({ start: a, end: b });
      setAnchor(null);
    } else {
      setSel({ start: key, end: key });
      setAnchor(key);
    }
    const current = priceOf(key);
    setPriceInput(current === null ? "" : String(current / 100));
  }

  // Nights in the current selection, and what they currently look like.
  const selKeys: string[] = [];
  if (sel) for (let d = dateOf(sel.start); keyOf(d) <= sel.end; d = addDays(d, 1)) selKeys.push(keyOf(d));
  const selPrices = selKeys.map(priceOf).filter((p): p is number => p !== null);
  const unpricedInSel = selKeys.length - selPrices.length;
  const minSel = Math.min(...selPrices);
  const maxSel = Math.max(...selPrices);
  const bookedInSel = selKeys.filter((k) => (nights[k]?.booked ?? 0) > 0).length;
  const blockedInSel = selKeys.filter((k) => nights[k]?.blocked).length;

  function run(action: () => Promise<{ error?: string }>, done: string) {
    start(async () => {
      const res = await action();
      if (res.error) toast.error(res.error);
      else toast.success(done);
    });
  }

  function saveDefault() {
    const price = defaultInput.trim() === "" ? null : Number(defaultInput);
    if (price !== null && (!Number.isInteger(price) || price <= 0)) {
      toast.error("Enter a whole amount, like 120");
      return;
    }
    run(
      () => setDefaultPrice({ roomTypeId, price }),
      price === null ? "Default price removed. Only priced dates can be booked." : `Default price set to ${formatMoney(price * 100, currency)}`,
    );
  }

  function savePrice() {
    const price = Number(priceInput);
    if (!sel || !Number.isInteger(price) || price <= 0) {
      toast.error("Enter a whole amount, like 120");
      return;
    }
    run(() => setNightlyPrice({ roomTypeId, from: sel.start, to: sel.end, price }), `Price set to ${formatMoney(price * 100, currency)}`);
  }

  const days = getDaysInMonth(month);
  const firstWeekday = (month.getDay() + 6) % 7; // Monday-first

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className={cn("overflow-hidden rounded-xl border", pending && "opacity-60")}>
        {/* Month navigation */}
        <div className="flex items-center justify-between bg-foreground px-2 py-1.5 text-background">
          <Button variant="ghost" size="icon" className="hover:bg-background/10 hover:text-background" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
            <ChevronLeft className="size-5" />
          </Button>
          <Button variant="ghost" className="hover:bg-background/10 hover:text-background" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-background/10 hover:text-background" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight className="size-5" />
          </Button>
        </div>
        <div className="flex justify-center gap-2 bg-muted/50 py-2">
          <Select value={String(month.getMonth())} onValueChange={(v) => setMonth(new Date(month.getFullYear(), Number(v), 1))}>
            <SelectTrigger className="w-36 border-0 bg-transparent shadow-none" aria-label="Month"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(month.getFullYear())} onValueChange={(v) => setMonth(new Date(Number(v), month.getMonth(), 1))}>
            <SelectTrigger className="w-24 border-0 bg-transparent shadow-none" aria-label="Year"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 border-t text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border">
          {Array.from({ length: firstWeekday }).map((_, i) => <div key={`pad-${i}`} className="bg-background" />)}
          {Array.from({ length: days }).map((_, i) => {
            const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
            const key = keyOf(date);
            const past = key < todayKey;
            const now = status(key);
            const before = status(keyOf(addDays(date, -1)));
            const n = nights[key];
            const custom = n?.price !== undefined;
            // Split only on check-in/check-out days: where a booking starts or ends.
            const turnover = before !== now && (before === "booked" || now === "booked");
            const background = past
              ? undefined
              : turnover
                ? `linear-gradient(to bottom right, ${COLOR[before]} 50%, ${COLOR[now]} 50%)`
                : COLOR[now];
            return (
              <button
                key={key}
                type="button"
                disabled={past || pending}
                onClick={(e) => pick(key, e.shiftKey)}
                style={{ background }}
                aria-pressed={inSel(key)}
                aria-label={`${format(date, "EEEE, MMMM d")}: ${now === "free" ? formatMoney(priceOf(key)!, currency) : now === "unpriced" ? "no price" : now}`}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 bg-background text-sm transition-shadow",
                  past ? "cursor-default text-muted-foreground/50" : "hover:ring-2 hover:ring-inset hover:ring-foreground/30",
                  inSel(key) && "ring-2 ring-inset ring-primary",
                )}
              >
                <span>{i + 1}</span>
                {!past && now === "free" && (
                  <span className={cn("text-xs", custom ? "font-semibold" : "text-muted-foreground")}>
                    {formatMoney(priceOf(key)!, currency)}
                  </span>
                )}
                {!past && now === "unpriced" && <span className="text-xs text-muted-foreground/60">—</span>}
                {!past && quantity > 1 && now === "free" && (n?.booked ?? 0) > 0 && (
                  <span className="text-[10px] text-muted-foreground">{n!.booked}/{quantity} booked</span>
                )}
              </button>
            );
          })}
          {/* Fill out the last week so the grid lines don't show through as grey cells. */}
          {Array.from({ length: (7 - ((firstWeekday + days) % 7)) % 7 }).map((_, i) => (
            <div key={`end-${i}`} className="bg-background" />
          ))}
        </div>
        <div className="flex flex-wrap gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
          <Legend color={COLOR.free} label="Available" />
          <Legend color={COLOR.booked} label={quantity > 1 ? "Sold out" : "Booked"} />
          <Legend color={COLOR.blocked} label="Blocked by you" />
          <Legend color={COLOR.unpriced} label="No price (not bookable)" />
          <span><span className="font-semibold text-foreground">Bold</span> = custom price</span>
        </div>
      </div>

      {/* Selection panel */}
      <div className="space-y-4 rounded-xl border p-4">
        {!sel ? (
          <>
            <p className="text-sm text-muted-foreground">
              Click a date to set its price. To price several dates at once, click the first and then the last.
            </p>
            <div className="border-t pt-4">
              <Label htmlFor="default-price" className="mb-1 block">Default price ({currency})</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Used for every date you haven&apos;t priced. Leave it empty to open only the dates you price.
              </p>
              <div className="flex gap-2">
                <Input
                  id="default-price"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="No default"
                  value={defaultInput}
                  onChange={(e) => setDefaultInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveDefault()}
                />
                <Button variant="outline" onClick={saveDefault} disabled={pending}>Save</Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="font-medium">
                {format(dateOf(sel.start), "EEE, MMM d")}
                {sel.end !== sel.start && ` – ${format(dateOf(sel.end), "EEE, MMM d")}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {selKeys.length} night{selKeys.length === 1 ? "" : "s"} ·{" "}
                {selPrices.length === 0
                  ? "no price yet"
                  : `${minSel === maxSel ? formatMoney(minSel, currency) : `${formatMoney(minSel, currency)}–${formatMoney(maxSel, currency)}`} now${unpricedInSel ? `, ${unpricedInSel} unpriced` : ""}`}
              </p>
              {anchor && <p className="mt-1 text-xs text-muted-foreground">Click another night to select a range.</p>}
            </div>

            <div>
              <Label htmlFor="night-price" className="mb-2 block">Price per night ({currency})</Label>
              <div className="flex gap-2">
                <Input
                  id="night-price"
                  type="number"
                  min={1}
                  step={1}
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && savePrice()}
                />
                <Button onClick={savePrice} disabled={pending}>Set price</Button>
              </div>
              <Button
                variant="link"
                className="h-auto px-0 text-xs"
                disabled={pending}
                onClick={() =>
                  run(
                    () => setNightlyPrice({ roomTypeId, from: sel.start, to: sel.end, price: null }),
                    basePrice === null ? "Price removed" : "Reset to the default price",
                  )
                }
              >
                {basePrice === null ? "Remove price" : `Reset to default (${formatMoney(basePrice, currency)})`}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(() => setBlockedNights({ roomTypeId, from: sel.start, to: sel.end, blocked: true }), "Nights blocked")}
              >
                Block {selKeys.length === 1 ? "night" : "nights"}
              </Button>
              {blockedInSel > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => setBlockedNights({ roomTypeId, from: sel.start, to: sel.end, blocked: false }), "Nights unblocked")}
                >
                  Unblock
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setSel(null); setAnchor(null); }}>
                Clear selection
              </Button>
            </div>

            {bookedInSel > 0 && (
              <p className="text-xs text-muted-foreground">
                {bookedInSel} of these night{bookedInSel === 1 ? " has" : "s have"} bookings. Price changes only apply to new
                bookings; existing guests keep the price they booked at.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-3 rounded-sm border" style={{ background: color }} />
      {label}
    </span>
  );
}
