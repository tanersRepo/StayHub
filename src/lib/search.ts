import { db } from "@/lib/db";
import { availableRoomTypeIds, toUtcDay } from "@/lib/availability";
import { nightsBetween } from "@/lib/pricing";

export interface SearchParams {
  city?: string;
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  type?: string;
  maxPrice?: number; // minor units, per night
}

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  city: string;
  country: string;
  currency: string;
  lat: number | null;
  lng: number | null;
  coverUrl: string | null;
  fromPrice: number | null;
  rating: number | null;
  ratingCount: number;
}

/** Parse yyyy-mm-dd query values into a UTC-midnight stay range, or null when incomplete/invalid. */
export function parseStayRange(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return null;
  const a = new Date(`${checkIn}T00:00:00Z`);
  const b = new Date(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || nightsBetween(a, b) <= 0) return null;
  return { checkIn: toUtcDay(a), checkOut: toUtcDay(b) };
}

/**
 * Published properties matching the filters. When dates are given, only properties with at
 * least one room type that fits the guests AND is free for every night are returned, and
 * `fromPrice` reflects only those room types.
 */
export async function searchProperties(params: SearchParams): Promise<SearchResult[]> {
  const guests = params.guests ?? 1;
  const props = await db.property.findMany({
    where: {
      status: "PUBLISHED",
      ...(params.city ? { OR: [{ city: { contains: params.city } }, { country: { contains: params.city } }] } : {}),
      ...(params.type ? { type: params.type } : {}),
      roomTypes: { some: { maxGuests: { gte: guests }, ...(params.maxPrice ? { pricePerNight: { lte: params.maxPrice } } : {}) } },
    },
    include: {
      media: { where: { kind: "IMAGE" }, orderBy: { order: "asc" }, take: 1 },
      roomTypes: {
        where: { maxGuests: { gte: guests }, ...(params.maxPrice ? { pricePerNight: { lte: params.maxPrice } } : {}) },
        select: { id: true, pricePerNight: true },
      },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const range = params.checkIn && params.checkOut ? { checkIn: params.checkIn, checkOut: params.checkOut } : null;
  const nights = range ? nightsBetween(range.checkIn, range.checkOut) : 0;
  const available = range
    ? await availableRoomTypeIds(props.flatMap((p) => p.roomTypes.map((r) => r.id)), range)
    : null;

  const results: SearchResult[] = [];
  for (const p of props) {
    if (range && nights < p.minNights) continue;
    const rooms = available ? p.roomTypes.filter((r) => available.has(r.id)) : p.roomTypes;
    if (rooms.length === 0) continue;
    const ratingCount = p.reviews.length;
    results.push({
      id: p.id,
      title: p.title,
      type: p.type,
      city: p.city,
      country: p.country,
      currency: p.currency,
      lat: p.lat,
      lng: p.lng,
      coverUrl: p.media[0]?.url ?? null,
      fromPrice: Math.min(...rooms.map((r) => r.pricePerNight)),
      rating: ratingCount ? p.reviews.reduce((s, r) => s + r.rating, 0) / ratingCount : null,
      ratingCount,
    });
  }
  return results;
}
