import { describe, expect, it } from "vitest";
import { parseFilters } from "@/lib/search";

describe("parseFilters", () => {
  it("converts prices from major to minor units", () => {
    const f = parseFilters({ minPrice: "50", maxPrice: "300" });
    expect(f.minPrice).toBe(5000);
    expect(f.maxPrice).toBe(30000);
  });

  it("ignores blank and invalid prices", () => {
    const f = parseFilters({ minPrice: "", maxPrice: "abc" });
    expect(f.minPrice).toBeUndefined();
    expect(f.maxPrice).toBeUndefined();
  });

  it("keeps only known amenities and accepts repeated values", () => {
    const f = parseFilters({ amenity: ["wifi", "not_an_amenity", "pool"] });
    expect(f.amenities).toEqual(["wifi", "pool"]);
  });

  it("accepts a single amenity given as a string", () => {
    expect(parseFilters({ amenity: "gym" }).amenities).toEqual(["gym"]);
  });

  it("defaults guests to at least 1", () => {
    expect(parseFilters({ guests: "0" }).guests).toBe(1);
    expect(parseFilters({}).guests).toBe(1);
  });

  it("round-trips filters through the query string", () => {
    const f = parseFilters({ city: "Lisbon", guests: "3", maxPrice: "250", amenity: ["wifi", "pool"], type: "HOTEL" });
    const again = parseFilters(Object.fromEntries(new URLSearchParams(f.query).entries()));
    expect(again.city).toBe("Lisbon");
    expect(again.maxPrice).toBe(25000);
    expect(again.type).toBe("HOTEL");
    expect(f.query).toContain("amenity=wifi");
    expect(f.query).toContain("amenity=pool");
  });

  it("drops an incomplete or reversed date range", () => {
    expect(parseFilters({ checkIn: "2026-10-01" }).checkIn).toBeUndefined();
    expect(parseFilters({ checkIn: "2026-10-05", checkOut: "2026-10-01" }).checkIn).toBeUndefined();
  });
});
