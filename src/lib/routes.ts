import type { LatLng } from "@/lib/distance";

export interface Route {
  meters: number;
  seconds: number;
}

/**
 * Road distance and travel time between two points, from the FOSSGIS OSRM servers that power
 * openstreetmap.org's directions (free, no key; fair use, identify the app). Null on failure or
 * when no route exists (e.g. across the sea).
 */
export async function route(profile: "car" | "foot", from: LatLng, to: LatLng): Promise<Route | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  try {
    const res = await fetch(`https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${coords}?overview=false`, {
      headers: { "User-Agent": "StayHub/0.1 (dev)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { code: string; routes?: { distance: number; duration: number }[] };
    const r = data.code === "Ok" ? data.routes?.[0] : undefined;
    return r ? { meters: r.distance, seconds: r.duration } : null;
  } catch {
    return null;
  }
}
