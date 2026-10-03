import { differenceInCalendarDays } from "date-fns";

/** Round an amount in minor units to a whole currency unit (e.g. 59850 → 59900, i.e. $598.50 → $599). */
export function roundToWhole(minor: number): number {
  return Math.round(minor / 100) * 100;
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return differenceInCalendarDays(checkOut, checkIn);
}

/** Length-of-stay discount tier set by the host. */
export interface DiscountRule {
  minNights: number;
  discountPercent: number;
}

/**
 * A room type's prices: the host's price for specific nights (keyed yyyy-mm-dd, UTC), and an
 * optional default for every other night. With no default (`base: null`), a night the host
 * didn't price has no price and can't be booked.
 */
export interface RateCard {
  base: number | null;
  overrides?: Record<string, number>;
}

/** Price of one night, or null when the host hasn't priced it. */
export function nightPrice(card: RateCard, key: string): number | null {
  return card.overrides?.[key] ?? card.base;
}

/** Nights of a stay (yyyy-mm-dd) that have no price, so the stay can't be booked. */
export function unpricedNights(card: RateCard, checkIn: Date, checkOut: Date): string[] {
  return nightKeys(checkIn, checkOut).filter((k) => nightPrice(card, k) === null);
}

export interface PriceBreakdown {
  nights: number;
  /** Price of each night, in order. */
  nightly: number[];
  /** The nightly price when every night costs the same, else null (prices vary by date). */
  pricePerNight: number | null;
  subtotal: number;
  /** The tier that applied, or null. */
  discountPercent: number | null;
  discount: number;
  /** What the guest pays: nightly subtotal less any long-stay discount. There is no service fee. */
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

/**
 * yyyy-mm-dd of each night of a stay: checkIn up to (not including) checkOut. Expects
 * UTC-midnight dates, the stay-date convention; client code converts picker dates first.
 */
export function nightKeys(checkIn: Date, checkOut: Date): string[] {
  const keys: string[] = [];
  for (let t = checkIn.getTime(); t < checkOut.getTime(); t += 86_400_000) keys.push(new Date(t).toISOString().slice(0, 10));
  return keys;
}

/**
 * Price a stay. `rates` is a plain nightly price, or a RateCard when prices vary by night.
 * Dates are UTC midnight. Throws if a night has no price: check `unpricedNights` first. All amounts are minor units and whole currency units: nightly prices
 * are whole, and the discount is rounded to a whole unit, so the total never has cents.
 */
export function calculatePrice(
  rates: number | RateCard,
  checkIn: Date,
  checkOut: Date,
  rules: DiscountRule[] = [],
): PriceBreakdown {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) throw new Error("Check-out must be after check-in");
  const card = typeof rates === "number" ? { base: rates } : rates;
  const nightly = nightKeys(checkIn, checkOut).map((k) => {
    const price = nightPrice(card, k);
    if (price === null) throw new Error(`No price set for ${k}`);
    return price;
  });
  const subtotal = nightly.reduce((sum, n) => sum + n, 0);
  const rule = applicableRule(nights, rules);
  const discount = rule ? roundToWhole((subtotal * rule.discountPercent) / 100) : 0;
  return {
    nights,
    nightly,
    pricePerNight: nightly.every((n) => n === nightly[0]) ? nightly[0] : null,
    subtotal,
    discountPercent: rule?.discountPercent ?? null,
    discount,
    total: subtotal - discount,
  };
}

export function formatMoney(minor: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
