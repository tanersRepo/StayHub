/**
 * Best-effort geocoding via OpenStreetMap Nominatim (no API key).
 * Usage policy: identify the app, ≤1 request/second. Returns null on any failure.
 */
export async function geocodeAddress(parts: {
  address: string;
  city: string;
  country: string;
}): Promise<{ lat: number; lng: number } | null> {
  const q = [parts.address, parts.city, parts.country].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "StayHub/0.1 (dev)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data[0]) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Look up a place a guest typed (landmark, address, area) via Nominatim, preferring matches near
 * `near` (about ±1° around it, not a hard limit). Returns null when nothing matches or on failure.
 */
export async function searchPlace(
  query: string,
  near: { lat: number; lng: number },
): Promise<{ lat: number; lng: number; label: string } | null> {
  const viewbox = [near.lng - 1, near.lat + 1, near.lng + 1, near.lat - 1].join(",");
  const params = new URLSearchParams({ format: "jsonv2", addressdetails: "1", limit: "1", q: query, viewbox, bounded: "0" });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "StayHub/0.1 (dev)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      lat: string;
      lon: string;
      name?: string;
      display_name: string;
      address?: Record<string, string>;
    }[];
    const hit = data[0];
    if (!hit) return null;
    return { lat: Number(hit.lat), lng: Number(hit.lon), label: placeLabel(hit) };
  } catch {
    return null;
  }
}

/**
 * Short, readable name for a Nominatim result: "Eiffel Tower, Paris, France" rather than its full
 * display_name ("Eiffel Tower, 5, Avenue Anatole France, Quartier du Gros-Caillou, …").
 */
export function placeLabel(hit: { name?: string; display_name: string; address?: Record<string, string> }): string {
  const a = hit.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const what = hit.name || street || hit.display_name.split(", ")[0];
  const where = a.city || a.town || a.village || a.municipality || a.county || a.state;
  const parts = [what, where, a.country].filter((p): p is string => !!p);
  return parts.filter((p, i) => parts.indexOf(p) === i).join(", ");
}

export interface PlaceSuggestion {
  /** Main line: the place's name, or its street address. */
  name: string;
  /** Second line: where it is ("Paris, France"). */
  area: string;
  lat: number;
  lng: number;
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

/** Name and area lines for a Photon result, e.g. { name: "Eiffel Tower", area: "Paris, France" }. */
export function photonSuggestion(f: PhotonFeature): PlaceSuggestion | null {
  const p = f.properties;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const name = p.name || street;
  if (!name) return null;
  const where = [p.city || p.county || p.state, p.country].filter((x): x is string => !!x && x !== name);
  const [lng, lat] = f.geometry.coordinates;
  return { name, area: where.join(", "), lat, lng };
}

/**
 * Search-as-you-type suggestions via Photon (photon.komoot.io): OpenStreetMap data, made for
 * autocomplete, free, no key; fair use. Nominatim's policy forbids autocomplete, so it isn't used
 * here. Results near `near` rank first. Returns [] on failure.
 */
export async function suggestPlaces(query: string, near: { lat: number; lng: number }, limit = 6): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: query, lat: String(near.lat), lon: String(near.lng), limit: String(limit + 4), lang: "en" });
  try {
    const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
      headers: { "User-Agent": "StayHub/0.1 (dev)" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    const out: PlaceSuggestion[] = [];
    for (const f of data.features ?? []) {
      const s = photonSuggestion(f);
      const key = s && `${s.name}|${s.area}`.toLowerCase();
      if (!s || seen.has(key!)) continue; // several stops/entrances often share one name
      seen.add(key!);
      out.push(s);
      if (out.length === limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
