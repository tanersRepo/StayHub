import { describe, expect, it } from "vitest";
import { isRangeAvailable, nightsOf, rangesOverlap } from "../availability";

const d = (day: number) => new Date(Date.UTC(2026, 0, day));

describe("rangesOverlap", () => {
  it("treats check-out day as free (half-open ranges)", () => {
    expect(rangesOverlap({ checkIn: d(1), checkOut: d(3) }, { checkIn: d(3), checkOut: d(5) })).toBe(false);
  });
  it("detects partial overlap", () => {
    expect(rangesOverlap({ checkIn: d(1), checkOut: d(4) }, { checkIn: d(3), checkOut: d(5) })).toBe(true);
  });
});

describe("nightsOf", () => {
  it("lists each night, excluding check-out", () => {
    expect(nightsOf({ checkIn: d(1), checkOut: d(4) }).map((x) => x.getUTCDate())).toEqual([1, 2, 3]);
  });
});

describe("isRangeAvailable", () => {
  const req = { checkIn: d(10), checkOut: d(13) };

  it("is available with no bookings or blocks", () => {
    expect(isRangeAvailable(req, [], [], 1)).toBe(true);
  });
  it("is blocked by an overlapping booking for a single unit", () => {
    expect(isRangeAvailable(req, [{ checkIn: d(12), checkOut: d(15) }], [], 1)).toBe(false);
  });
  it("allows back-to-back stays", () => {
    expect(isRangeAvailable(req, [{ checkIn: d(13), checkOut: d(15) }, { checkIn: d(8), checkOut: d(10) }], [], 1)).toBe(true);
  });
  it("is blocked by a host-blocked night inside the range", () => {
    expect(isRangeAvailable(req, [], [d(11)], 1)).toBe(false);
  });
  it("hotel with 2 units: one overlapping booking still leaves a unit", () => {
    expect(isRangeAvailable(req, [{ checkIn: d(11), checkOut: d(12) }], [], 2)).toBe(true);
  });
  it("hotel with 2 units: two overlapping bookings on the same night sell out", () => {
    const bookings = [
      { checkIn: d(11), checkOut: d(12) },
      { checkIn: d(9), checkOut: d(12) },
    ];
    expect(isRangeAvailable(req, bookings, [], 2)).toBe(false);
  });
  it("blocked night takes every unit regardless of quantity", () => {
    expect(isRangeAvailable(req, [], [d(12)], 10)).toBe(false);
  });
});
