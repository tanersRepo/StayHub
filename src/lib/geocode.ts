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
