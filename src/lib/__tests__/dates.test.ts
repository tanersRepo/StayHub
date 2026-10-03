import { describe, expect, it } from "vitest";
import { defaultWeekendStay } from "../dates";

// Local-time constructors: the helper works on the local calendar day.
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0);

describe("defaultWeekendStay", () => {
  it("picks the first Friday at least three weeks out, through Sunday", () => {
    // Sat 26 Sep 2026 + 21 days = Sat 17 Oct → next Friday is 23 Oct.
    expect(defaultWeekendStay(local(2026, 9, 26))).toEqual({ checkIn: "2026-10-23", checkOut: "2026-10-25" });
  });

  it("uses that exact day when three weeks out is already a Friday", () => {
    // Fri 2 Oct 2026 + 21 days = Fri 23 Oct.
    expect(defaultWeekendStay(local(2026, 10, 2))).toEqual({ checkIn: "2026-10-23", checkOut: "2026-10-25" });
  });

  it("rolls over month and year boundaries", () => {
    // Sat 12 Dec 2026 + 21 days = Sat 2 Jan 2027 → Fri 8 Jan.
    expect(defaultWeekendStay(local(2026, 12, 12))).toEqual({ checkIn: "2027-01-08", checkOut: "2027-01-10" });
  });

  it("is always a two-night Friday-to-Sunday stay", () => {
    for (let i = 0; i < 14; i++) {
      const { checkIn, checkOut } = defaultWeekendStay(local(2026, 9, 1 + i));
      const a = new Date(`${checkIn}T00:00:00`);
      const b = new Date(`${checkOut}T00:00:00`);
      expect(a.getDay()).toBe(5);
      expect(b.getDay()).toBe(0);
    }
  });
});
