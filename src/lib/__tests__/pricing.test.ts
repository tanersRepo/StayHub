import { describe, expect, it } from "vitest";
import { applicableRule, calculatePrice, formatMoney } from "../pricing";

const d = (day: number) => new Date(Date.UTC(2026, 0, day));
const RULES = [
  { minNights: 7, discountPercent: 10 },
  { minNights: 28, discountPercent: 25 },
];

describe("calculatePrice", () => {
  it("multiplies nights and adds a 10% service fee", () => {
    const p = calculatePrice(10000, d(1), d(4));
    expect(p).toEqual({
      nights: 3,
      pricePerNight: 10000,
      subtotal: 30000,
      discountPercent: null,
      discount: 0,
      serviceFee: 3000,
      total: 33000,
    });
  });
  it("rejects zero-night stays", () => {
    expect(() => calculatePrice(10000, d(1), d(1))).toThrow();
  });
  it("applies no discount below the first tier", () => {
    expect(calculatePrice(10000, d(1), d(7), RULES).discount).toBe(0);
  });
  it("applies the tier exactly at its threshold", () => {
    const p = calculatePrice(10000, d(1), d(8), RULES); // 7 nights
    expect(p.discountPercent).toBe(10);
    expect(p.discount).toBe(7000);
    expect(p.serviceFee).toBe(6300); // 10% of 63000
    expect(p.total).toBe(69300);
  });
  it("picks the highest tier reached, regardless of rule order", () => {
    const p = calculatePrice(10000, d(1), d(31), [...RULES].reverse()); // 30 nights
    expect(p.discountPercent).toBe(25);
    expect(p.discount).toBe(75000);
  });
});

describe("applicableRule", () => {
  it("returns null with no rules", () => {
    expect(applicableRule(30, [])).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats minor units as currency", () => {
    expect(formatMoney(12345)).toBe("$123.45");
  });
});
