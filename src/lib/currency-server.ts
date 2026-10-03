import { cookies } from "next/headers";
import { z } from "zod";
import {
  CURRENCIES,
  CURRENCY_COOKIE,
  DEFAULT_CURRENCY,
  FALLBACK_RATES,
  isCurrency,
  type Currency,
  type DisplayMoney,
  type ExchangeRates,
} from "@/lib/currency";

/**
 * European Central Bank reference rates via Frankfurter (free, no API key). The ECB publishes
 * once per working day, so we cache the response for a day.
 */
const RATES_URL = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${CURRENCIES.filter((c) => c !== "USD").join(",")}`;
const ONE_DAY = 60 * 60 * 24;

const ratesResponse = z.object({
  date: z.string(),
  rates: z.record(z.string(), z.number().positive()),
});

/**
 * Today's exchange rates, fetched at most once per day. Next's data cache holds the response for
 * a day and only caches HTTP 200s, so a failed call is retried on the next request rather than
 * pinned. If the service is unreachable and nothing is cached yet, falls back to FALLBACK_RATES
 * so pages still render.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const res = await fetch(RATES_URL, {
      next: { revalidate: ONE_DAY, tags: ["exchange-rates"] },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = ratesResponse.parse(await res.json());
    const perUsd = { USD: 1 } as Record<Currency, number>;
    for (const c of CURRENCIES) {
      if (c === "USD") continue;
      const rate = body.rates[c];
      if (!rate) throw new Error(`No rate for ${c}`);
      perUsd[c] = rate;
    }
    return { perUsd, date: body.date, source: "live" };
  } catch (err) {
    console.warn(`[currency] rates service unavailable, using fallback rates: ${(err as Error).message}`);
    return FALLBACK_RATES;
  }
}

/** The guest's chosen display currency (from the cookie), or the default. */
export async function getDisplayCurrency(): Promise<Currency> {
  const value = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
}

/** Display currency plus the rates to convert with — what price-rendering code needs. */
export async function getDisplayMoney(): Promise<DisplayMoney> {
  const [currency, rates] = await Promise.all([getDisplayCurrency(), getExchangeRates()]);
  return { currency, rates };
}
