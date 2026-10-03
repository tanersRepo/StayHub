import { describe, expect, it } from "vitest";
import { applicableRule, calculatePrice, formatMoney, nightKeys, roundToWhole, unpricedNights } from "../pricing";

const d = (day: number) => new Date(Date.UTC(2026, 0, day));
const RULES = [
  { minNights: 7, discountPercent: 10 },
  { minNights: 28, discountPercent: 25 },
];

describe("calculatePrice", () => {
  it("multiplies nights with no service fee", () => {
    const p = calculatePrice(10000, d(1), d(4));
    expect(p).toEqual({
      nights: 3,
      nightly: [10000, 10000, 10000],
      pricePerNight: 10000,
      subtotal: 30000,
      discountPercent: null,
      discount: 0,
      total: 30000,
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
    expect(p.total).toBe(63000);
  });
  it("rounds the discount to a whole unit, so the total has no cents", () => {
    const p = calculatePrice(9500, d(1), d(8), RULES); // 7 nights × $95 = $665, 10% = $66.50
    expect(p.discount).toBe(6700);
    expect(p.total).toBe(59800);
    expect(p.total % 100).toBe(0);
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
  it("formats as a whole amount, rounded to the nearest unit", () => {
    expect(formatMoney(12345)).toBe("$123");
    expect(formatMoney(12350)).toBe("$124");
    expect(formatMoney(9500)).toBe("$95");
    expect(formatMoney(8740, "EUR")).toBe("€87");
  });
  it("keeps thousands separators", () => {
    expect(formatMoney(123456700)).toBe("$1,234,567");
  });
});

describe("roundToWhole", () => {
  it("rounds minor units to the nearest whole unit", () => {
    expect(roundToWhole(59850)).toBe(59900);
    expect(roundToWhole(59849)).toBe(59800);
    expect(roundToWhole(59800)).toBe(59800);
  });
});

describe("per-night prices (rate card)", () => {
  // d(1) is 2026-01-01. Nights of a 1st → 4th stay: 01, 02, 03.
  const card = { base: 10000, overrides: { "2026-01-02": 15000, "2026-01-03": 12000 } };

  it("charges each night its own price, falling back to the base", () => {
    const p = calculatePrice(card, d(1), d(4));
    expect(p.nightly).toEqual([10000, 15000, 12000]);
    expect(p.subtotal).toBe(37000);
    expect(p.total).toBe(37000);
  });

  it("reports no single nightly price when they differ", () => {
    expect(calculatePrice(card, d(1), d(4)).pricePerNight).toBeNull();
  });

  it("reports the nightly price when overrides are outside the stay", () => {
    const p = calculatePrice(card, d(10), d(12));
    expect(p.nightly).toEqual([10000, 10000]);
    expect(p.pricePerNight).toBe(10000);
  });

  it("does not charge the check-out day", () => {
    // Stay 1st → 2nd is only the night of the 1st; the 2nd's override isn't charged.
    expect(calculatePrice(card, d(1), d(2)).subtotal).toBe(10000);
  });

  it("applies the long-stay discount to the summed nights", () => {
    const p = calculatePrice(card, d(1), d(8), RULES); // 7 nights: 10000 + 15000 + 12000 + 4×10000
    expect(p.subtotal).toBe(77000);
    expect(p.discount).toBe(7700);
    expect(p.total).toBe(69300);
  });
});

describe("nightKeys", () => {
  it("lists each night of a stay as yyyy-mm-dd, excluding check-out", () => {
    expect(nightKeys(d(30), d(33))).toEqual(["2026-01-30", "2026-01-31", "2026-02-01"]);
  });
});

describe("rooms without a default price", () => {
  const card = { base: null, overrides: { "2026-01-01": 12000, "2026-01-02": 13000 } };

  it("prices a stay made only of priced nights", () => {
    expect(calculatePrice(card, d(1), d(3)).subtotal).toBe(25000);
  });

  it("lists nights with no price", () => {
    expect(unpricedNights(card, d(1), d(5))).toEqual(["2026-01-03", "2026-01-04"]);
    expect(unpricedNights(card, d(1), d(3))).toEqual([]);
  });

  it("refuses to price a stay with an unpriced night", () => {
    expect(() => calculatePrice(card, d(1), d(4))).toThrow(/No price set for 2026-01-03/);
  });
});
