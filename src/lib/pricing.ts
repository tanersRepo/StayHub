import { differenceInCalendarDays } from "date-fns";

/** Service fee charged to guests, as a fraction of the (discounted) nightly subtotal. */
export const SERVICE_FEE_RATE = 0.1;

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return differenceInCalendarDays(checkOut, checkIn);
}

/** Length-of-stay discount tier set by the host. */
export interface DiscountRule {
  minNights: number;
  discountPercent: number;
}

export interface PriceBreakdown {
  nights: number;
  pricePerNight: number;
  subtotal: number;
  /** The tier that applied, or null. */
  discountPercent: number | null;
  discount: number;
  serviceFee: number;
  total: number;
}

/** The single best tier whose minNights the stay reaches, or null. */
export function applicableRule(nights: number, rules: DiscountRule[]): DiscountRule | null {
  let best: DiscountRule | null = null;
  for (const r of rules) {
    if (nights >= r.minNights && (!best || r.minNights > best.minNights)) best = r;
  }
  return best;
}

/** All amounts in minor units (cents). */
export function calculatePrice(
  pricePerNight: number,
  checkIn: Date,
  checkOut: Date,
  rules: DiscountRule[] = [],
): PriceBreakdown {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) throw new Error("Check-out must be after check-in");
  const subtotal = pricePerNight * nights;
  const rule = applicableRule(nights, rules);
  const discount = rule ? Math.round((subtotal * rule.discountPercent) / 100) : 0;
  const serviceFee = Math.round((subtotal - discount) * SERVICE_FEE_RATE);
  return {
    nights,
    pricePerNight,
    subtotal,
    discountPercent: rule?.discountPercent ?? null,
    discount,
    serviceFee,
    total: subtotal - discount + serviceFee,
  };
}

export function formatMoney(minor: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}
