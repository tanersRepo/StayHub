import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { getExchangeRates } from "../currency-server";
import { FALLBACK_RATES } from "../currency";

const reply = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

describe("getExchangeRates", () => {
  beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("returns live ECB rates relative to USD", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      reply({ amount: 1, base: "USD", date: "2026-09-25", rates: { EUR: 0.87696 } }),
    );
    expect(await getExchangeRates()).toEqual({ perUsd: { USD: 1, EUR: 0.87696 }, date: "2026-09-25", source: "live" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { next?: { revalidate?: number } }];
    expect(url).toContain("base=USD");
    expect(url).toContain("symbols=EUR");
    expect(init.next?.revalidate).toBe(86400); // cached for one day
  });

  it("falls back on an HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => reply({ message: "down" }, 503));
    expect(await getExchangeRates()).toEqual(FALLBACK_RATES);
  });

  it("falls back on a malformed or incomplete response", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => reply({ date: "2026-09-25", rates: {} }));
    expect(await getExchangeRates()).toEqual(FALLBACK_RATES);
  });

  it("falls back when the network fails or times out", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    expect(await getExchangeRates()).toEqual(FALLBACK_RATES);
  });
});
