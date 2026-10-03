import { formatMoney, roundToWhole } from "@/lib/pricing";

/**
 * Currencies guests can view prices in, and hosts can list in. Client-safe (no Node imports).
 *
 * Conversion is for *display only*: a booking is always charged in its listing's own currency.
 */
export const CURRENCIES = ["USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "USD";
/** Cookie holding the guest's display currency. */
export const CURRENCY_COOKIE = "currency";

export const CURRENCY_LABEL: Record<Currency, { name: string; symbol: string }> = {
  USD: { name: "US Dollar", symbol: "$" },
  EUR: { name: "Euro", symbol: "€" },
};

/** Units of each currency per 1 USD. */
export type Rates = Record<Currency, number>;

export interface ExchangeRates {
  perUsd: Rates;
  /** Date the rates were published (yyyy-mm-dd). */
  date: string;
  /** "live" = from the rates service; "fallback" = service unreachable, built-in approximation. */
  source: "live" | "fallback";
}

/**
 * Used only if the rates service has never answered. Deliberately rough: pages still render, and
 * the next successful fetch replaces it.
 */
export const FALLBACK_RATES: ExchangeRates = { perUsd: { USD: 1, EUR: 0.88 }, date: "2026-09-25", source: "fallback" };

/** What a guest sees prices in, plus the rates to convert with. Serializable (passed to client components). */
export interface DisplayMoney {
  currency: Currency;
  rates: ExchangeRates;
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/**
 * Convert an amount in minor units between supported currencies, rounding to the nearest minor
 * unit. Returns null when either side is not a supported currency (e.g. a legacy listing).
 */
export function convertMinor(
  minor: number,
  from: string,
  to: string,
  perUsd: Rates,
  round: (n: number) => number = Math.round,
): number | null {
  if (from === to) return minor;
  if (!isCurrency(from) || !isCurrency(to)) return null;
  return round((minor * perUsd[to]) / perUsd[from]);
}

/**
 * The amount and currency to show a guest: converted when possible (rounded to a whole unit, as
 * all prices are shown), else left as listed.
 */
export function toDisplay(minor: number, listed: string, display: DisplayMoney): { amount: number; currency: string } {
  const converted = convertMinor(minor, listed, display.currency, display.rates.perUsd);
  return converted === null ? { amount: minor, currency: listed } : { amount: roundToWhole(converted), currency: display.currency };
}

/** Format a listing price in the guest's display currency. */
export function formatPrice(minor: number, listed: string, display: DisplayMoney): string {
  const { amount, currency } = toDisplay(minor, listed, display);
  return formatMoney(amount, currency);
}
