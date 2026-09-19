import { describe, expect, it } from "vitest";
import { calculatePrice, formatMoney } from "../pricing";

const d = (day: number) => new Date(Date.UTC(2026, 0, day));

describe("calculatePrice", () => {
  it("multiplies nights and adds a 10% service fee", () => {
    const p = calculatePrice(10000, d(1), d(4));
    expect(p).toEqual({ nights: 3, pricePerNight: 10000, subtotal: 30000, serviceFee: 3000, total: 33000 });
  });
  it("rejects zero-night stays", () => {
    expect(() => calculatePrice(10000, d(1), d(1))).toThrow();
  });
});

describe("formatMoney", () => {
  it("formats minor units as currency", () => {
    expect(formatMoney(12345)).toBe("$123.45");
  });
});
