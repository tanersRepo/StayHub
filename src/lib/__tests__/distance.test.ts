import { describe, expect, it } from "vitest";
import { formatDistance, formatDuration, googleDirectionsUrl, straightLineMeters } from "../distance";

describe("straightLineMeters", () => {
  it("is zero for the same point", () => {
    expect(straightLineMeters({ lat: 38.7, lng: -9.1 }, { lat: 38.7, lng: -9.1 })).toBe(0);
  });
  it("matches a known distance (Paris → London ≈ 344 km)", () => {
    const m = straightLineMeters({ lat: 48.8566, lng: 2.3522 }, { lat: 51.5074, lng: -0.1278 });
    expect(m / 1000).toBeGreaterThan(340);
    expect(m / 1000).toBeLessThan(348);
  });
});

describe("formatDistance", () => {
  it("uses metres under 1 km", () => {
    expect(formatDistance(847)).toBe("850 m");
  });
  it("uses one decimal under 10 km and whole km above", () => {
    expect(formatDistance(5432)).toBe("5.4 km");
    expect(formatDistance(123_456)).toBe("123 km");
  });
  it("adds miles when asked", () => {
    expect(formatDistance(5432, true)).toBe("5.4 km (3.4 mi)");
    expect(formatDistance(123_456, true)).toBe("123 km (77 mi)");
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(20)).toBe("under 1 min");
    expect(formatDuration(12 * 60)).toBe("12 min");
    expect(formatDuration(65 * 60)).toBe("1 h 5 min");
    expect(formatDuration(180 * 60)).toBe("3 h");
  });
});

describe("googleDirectionsUrl", () => {
  it("builds a Google Maps directions link for the travel mode", () => {
    const url = new URL(googleDirectionsUrl({ lat: 38.71, lng: -9.13 }, { lat: 38.69, lng: -9.21 }, "transit"));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("origin")).toBe("38.71,-9.13");
    expect(url.searchParams.get("destination")).toBe("38.69,-9.21");
    expect(url.searchParams.get("travelmode")).toBe("transit");
  });
});

describe("placeLabel", () => {
  it("uses name, city and country", async () => {
    const { placeLabel } = await import("../geocode");
    expect(
      placeLabel({
        name: "Eiffel Tower",
        display_name: "Eiffel Tower, 5, Avenue Anatole France, Quartier du Gros-Caillou, Paris, France",
        address: { house_number: "5", road: "Avenue Anatole France", city: "Paris", country: "France" },
      }),
    ).toBe("Eiffel Tower, Paris, France");
  });
  it("falls back to the street address for unnamed places", async () => {
    const { placeLabel } = await import("../geocode");
    expect(placeLabel({ name: "", display_name: "10, Main St, Springfield", address: { house_number: "10", road: "Main St", town: "Springfield", country: "United States" } })).toBe(
      "10 Main St, Springfield, United States",
    );
  });
  it("doesn't repeat a part (city-states)", async () => {
    const { placeLabel } = await import("../geocode");
    expect(placeLabel({ name: "Marina Bay Sands", display_name: "Marina Bay Sands, Singapore", address: { city: "Singapore", country: "Singapore" } })).toBe(
      "Marina Bay Sands, Singapore",
    );
  });
});

describe("photonSuggestion", () => {
  it("uses the name and the city/country", async () => {
    const { photonSuggestion } = await import("../geocode");
    expect(
      photonSuggestion({ geometry: { coordinates: [2.2945, 48.8584] }, properties: { name: "Eiffel Tower", city: "Paris", country: "France" } }),
    ).toEqual({ name: "Eiffel Tower", area: "Paris, France", lat: 48.8584, lng: 2.2945 });
  });
  it("uses the street address when a place has no name", async () => {
    const { photonSuggestion } = await import("../geocode");
    const s = photonSuggestion({ geometry: { coordinates: [2.33, 48.86] }, properties: { housenumber: "12", street: "Rue de Rivoli", city: "Paris", country: "France" } });
    expect(s?.name).toBe("12 Rue de Rivoli");
  });
  it("skips results with nothing to show", async () => {
    const { photonSuggestion } = await import("../geocode");
    expect(photonSuggestion({ geometry: { coordinates: [0, 0] }, properties: { country: "France" } })).toBeNull();
  });
});
