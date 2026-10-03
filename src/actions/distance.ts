"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { searchPlace, suggestPlaces, type PlaceSuggestion } from "@/lib/geocode";
import { route, type Route } from "@/lib/routes";
import { straightLineMeters } from "@/lib/distance";
import { distanceQuerySchema, placeSuggestSchema, type DistanceQueryInput, type PlaceSuggestInput } from "@/lib/validators/distance";

export interface DistanceResult {
  error?: string;
  place?: { label: string; lat: number; lng: number };
  /** The property's own position, for building directions links. */
  from?: { lat: number; lng: number };
  straightMeters?: number;
  driving?: Route | null;
  /** Null when there's no walking route, or it would take more than 4 hours. */
  walking?: Route | null;
}

/**
 * Per-IP limit: the free lookup and routing services ask for light use (Nominatim: about one
 * request a second). In memory, so per server and reset on restart.
 */
const WINDOW_MS = 10 * 60 * 1000;
function limiter(limit: number) {
  const hits = new Map<string, number[]>();
  return (ip: string) => {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    hits.set(ip, recent.length >= limit ? recent : [...recent, now]);
    return recent.length >= limit;
  };
}
/** Distance lookups (geocode + two routes each). */
const rateLimited = limiter(20);
/** Suggestions fire as the guest types (debounced), so they get a bigger allowance. */
const suggestLimited = limiter(150);

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Listing position, for published listings with a location. */
async function listingPosition(propertyId: string) {
  const p = await db.property.findFirst({ where: { id: propertyId, status: "PUBLISHED" }, select: { lat: true, lng: true } });
  return p && p.lat !== null && p.lng !== null ? { lat: p.lat, lng: p.lng } : null;
}

/** Repeated lookups (same listing, same place) are answered from memory for a day. */
const cache = new Map<string, { at: number; result: DistanceResult }>();
const CACHE_MS = 24 * 60 * 60 * 1000;

/** "See distance from…": where a typed place is, and how far it is by car and on foot. */
export async function distanceFrom(input: DistanceQueryInput): Promise<DistanceResult> {
  const parsed = distanceQuerySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { propertyId, query, place: picked } = parsed.data;

  const key = picked ? `${propertyId}|@${picked.lat.toFixed(5)},${picked.lng.toFixed(5)}` : `${propertyId}|${query.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.result;

  if (rateLimited(await clientIp())) return { error: "That's a lot of searches. Please wait a few minutes and try again." };

  const from = await listingPosition(propertyId);
  if (!from) return { error: "This listing's location isn't available." };

  const place = picked ?? (await searchPlace(query, from));
  if (!place) return { error: `We couldn't find "${query}". Try adding the city, or a nearby landmark.` };

  const [driving, walking] = await Promise.all([route("car", from, place), route("foot", from, place)]);
  const result: DistanceResult = {
    place,
    from,
    straightMeters: straightLineMeters(from, place),
    driving,
    walking: walking && walking.seconds <= 4 * 3600 ? walking : null,
  };
  cache.set(key, { at: Date.now(), result });
  return result;
}

const suggestCache = new Map<string, { at: number; list: PlaceSuggestion[] }>();

/** Places matching what the guest has typed so far, nearest the listing first. */
export async function suggestDistancePlaces(input: PlaceSuggestInput): Promise<PlaceSuggestion[]> {
  const parsed = placeSuggestSchema.safeParse(input);
  if (!parsed.success) return [];
  const { propertyId, query } = parsed.data;
  const key = `${propertyId}|${query.toLowerCase()}`;
  const cached = suggestCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.list;
  if (suggestLimited(await clientIp())) return [];
  const from = await listingPosition(propertyId);
  if (!from) return [];
  const list = await suggestPlaces(query, from);
  suggestCache.set(key, { at: Date.now(), list });
  return list;
}
