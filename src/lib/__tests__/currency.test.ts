import { describe, expect, it } from "vitest";
import { convertMinor, formatPrice, isCurrency, toDisplay, type DisplayMoney, type Rates } from "../currency";

const RATES: Rates = { USD: 1, EUR: 0.9 };
const inEur: DisplayMoney = { currency: "EUR", rates: { perUsd: RATES, date: "2026-09-25", source: "live" } };

describe("convertMinor", () => {
  it("leaves same-currency amounts untouched", () => {
    expect(convertMinor(9500, "USD", "USD", RATES)).toBe(9500);
    expect(convertMinor(9500, "EUR", "EUR", RATES)).toBe(9500);
  });

  it("converts with the rates it is given, both ways", () => {
    expect(convertMinor(10000, "USD", "EUR", RATES)).toBe(9000);
    expect(convertMinor(9000, "EUR", "USD", RATES)).toBe(10000);
    expect(convertMinor(10000, "USD", "EUR", { USD: 1, EUR: 0.87696 })).toBe(8770);
  });

  it("rounds to whole minor units, outward when asked", () => {
    expect(convertMinor(101, "USD", "EUR", RATES, Math.floor)).toBe(90);
    expect(convertMinor(101, "USD", "EUR", RATES, Math.ceil)).toBe(91);
  });

  it("returns null for unsupported currencies", () => {
    expect(convertMinor(100, "GBP", "USD", RATES)).toBeNull();
    expect(convertMinor(100, "USD", "GBP", RATES)).toBeNull();
  });
});

describe("toDisplay / formatPrice", () => {
  it("shows a USD listing in euros", () => {
    // $95 × 0.9 = €85.50 → shown as a whole €86.
    expect(toDisplay(9500, "USD", inEur)).toEqual({ amount: 8600, currency: "EUR" });
    expect(formatPrice(9500, "USD", inEur)).toBe("€86");
  });

  it("keeps an unsupported listing currency as listed", () => {
    expect(toDisplay(5000, "GBP", inEur)).toEqual({ amount: 5000, currency: "GBP" });
  });
});

describe("isCurrency", () => {
  it("accepts only supported codes", () => {
    expect(isCurrency("USD")).toBe(true);
    expect(isCurrency("EUR")).toBe(true);
    expect(isCurrency("usd")).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });
});
