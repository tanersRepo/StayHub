/** Distance and travel-time helpers for "See distance from…". Client-safe (no Node imports). */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Straight-line ("as the crow flies") distance in metres. */
export function straightLineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "850 m", "5.4 km (3.4 mi)", "120 km (75 mi)". Miles are added for US listings. */
export function formatDistance(meters: number, withMiles = false): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  const kmText = km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  if (!withMiles) return kmText;
  const mi = meters / 1609.344;
  return `${kmText} (${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi)`;
}

/** "under 1 min", "12 min", "1 h 5 min", "3 h". */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "under 1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Google Maps directions link (no API key needed). Used for public transport, which no free
 * service routes worldwide, and as a "see the route" link for the other modes.
 */
export function googleDirectionsUrl(from: LatLng, to: LatLng, mode: "driving" | "walking" | "transit"): string {
  const q = new URLSearchParams({
    api: "1",
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}
