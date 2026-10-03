import { describe, expect, it } from "vitest";
import { rankDestinations, type Destination } from "../destinations";

const ALL: Destination[] = [
  { city: "Lisbon", country: "Portugal", count: 4 },
  { city: "Barcelona", country: "Spain", count: 4 },
  { city: "Amsterdam", country: "Netherlands", count: 4 },
  { city: "New York", country: "United States", count: 2 },
  { city: "São Paulo", country: "Brazil", count: 1 },
  { city: "Porto", country: "Portugal", count: 1 },
];
const cities = (q: string) => rankDestinations(ALL, q).map((d) => d.city);

describe("rankDestinations", () => {
  it("matches the start of a city, ignoring case", () => {
    expect(cities("LIS")).toEqual(["Lisbon"]);
    expect(cities("lis")).toEqual(["Lisbon"]);
  });

  it("returns nothing for an empty or whitespace query", () => {
    expect(cities("")).toEqual([]);
    expect(cities("   ")).toEqual([]);
  });

  it("matches a later word of the city", () => {
    expect(cities("york")).toEqual(["New York"]);
  });

  it("ignores accents", () => {
    expect(cities("sao")).toEqual(["São Paulo"]);
  });

  it("matches by country, after city-name matches", () => {
    // "Port" starts Porto (city) and Portugal (country for Lisbon + Porto).
    expect(cities("port")).toEqual(["Porto", "Lisbon"]);
  });

  it("falls back to substring matches", () => {
    expect(cities("celo")).toEqual(["Barcelona"]);
  });

  it("breaks ties by number of stays", () => {
    const tied = rankDestinations(
      [
        { city: "Bath", country: "UK", count: 1 },
        { city: "Barcelona", country: "Spain", count: 9 },
      ],
      "ba",
    );
    expect(tied.map((d) => d.city)).toEqual(["Barcelona", "Bath"]);
  });

  it("respects the limit", () => {
    expect(rankDestinations(ALL, "a", 2)).toHaveLength(2);
  });
});
