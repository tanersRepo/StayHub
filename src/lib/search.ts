import { db } from "@/lib/db";
import { COVER_IMAGE } from "@/lib/media-query";
import { availableRoomTypeIds, toUtcDay } from "@/lib/availability";
import { calculatePrice, nightsBetween, roundToWhole, unpricedNights } from "@/lib/pricing";
import { loadOverrides, startingPrices } from "@/lib/rates";
import { AMENITIES } from "@/lib/validators/property";
import { CURRENCIES, DEFAULT_CURRENCY, FALLBACK_RATES, convertMinor, type DisplayMoney } from "@/lib/currency";

export interface SearchParams {
  city?: string;
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  type?: string;
  minPrice?: number; // minor units, per night, in `currency`
  maxPrice?: number; // minor units, per night, in `currency`
  /** Display currency (and rates) the price bounds are expressed in. Defaults to USD. */
  display?: DisplayMoney;
  amenities?: string[]; // property must have all of them
}

/** Used when a caller doesn't pass display settings (bounds are then plain USD). */
const DEFAULT_DISPLAY: DisplayMoney = { currency: DEFAULT_CURRENCY, rates: FALLBACK_RATES };

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
 * `fromPrice` reflects only those room types. With dates, `fromPrice` is the cheapest room's
 * average nightly price for that stay (per-night prices vary); without, the cheapest base price.
 */
export async function searchProperties(params: SearchParams): Promise<SearchResult[]> {
  const guests = params.guests ?? 1;
  // Amenities are a JSON array in a String column (SQLite has no array type); the quotes around
  // the value keep `"pool"` from matching a hypothetical `"pool_table"`. All selected must be present.
  const amenityFilter = (params.amenities ?? []).map((a) => ({ amenities: { contains: `"${a}"` } }));
  const display = params.display ?? DEFAULT_DISPLAY;
  const range = params.checkIn && params.checkOut ? { checkIn: params.checkIn, checkOut: params.checkOut } : null;
  const props = await db.property.findMany({
    where: {
      status: "PUBLISHED",
      ...(params.city ? { OR: [{ city: { contains: params.city } }, { country: { contains: params.city } }] } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(amenityFilter.length ? { AND: amenityFilter } : {}),
      roomTypes: { some: { maxGuests: { gte: guests } } },
    },
    include: {
      media: COVER_IMAGE,
      roomTypes: {
        where: { maxGuests: { gte: guests } },
        select: { id: true, pricePerNight: true },
      },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const nights = range ? nightsBetween(range.checkIn, range.checkOut) : 0;
  const roomIds = props.flatMap((p) => p.roomTypes.map((r) => r.id));
  const allRooms = props.flatMap((p) => p.roomTypes);
  const [available, overrides, starting] = range
    ? await Promise.all([availableRoomTypeIds(roomIds, range), loadOverrides(roomIds, range.checkIn, range.checkOut), null])
    : [null, null, await startingPrices(allRooms)];

  /**
   * A room's price for this search: with dates, the stay's average nightly price (null if any night
   * has no price, so it can't be booked); without, its "from" price (null if it has no price yet).
   */
  const nightlyPrice = (r: { id: string; pricePerNight: number | null }): number | null => {
    if (!range || !overrides) return starting!.get(r.id) ?? null;
    const card = { base: r.pricePerNight, overrides: overrides.get(r.id) };
    if (unpricedNights(card, range.checkIn, range.checkOut).length > 0) return null;
    return roundToWhole(calculatePrice(card, range.checkIn, range.checkOut).subtotal / nights);
  };
  /** The room's price, shown in the guest's currency, is within the price filter. */
  const inPriceRange = (price: number, listed: string) => {
    const shown = convertMinor(price, listed, display.currency, display.rates.perUsd) ?? price;
    return (params.minPrice === undefined || shown >= params.minPrice) && (params.maxPrice === undefined || shown <= params.maxPrice);
  };

  const results: SearchResult[] = [];
  for (const p of props) {
    if (range && nights < p.minNights) continue;
    const prices = (available ? p.roomTypes.filter((r) => available.has(r.id)) : p.roomTypes)
      .map(nightlyPrice)
      .filter((price): price is number => price !== null && inPriceRange(price, p.currency));
    if (prices.length === 0) continue;
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
      fromPrice: Math.min(...prices),
      rating: ratingCount ? p.reviews.reduce((s, r) => s + r.rating, 0) / ratingCount : null,
      ratingCount,
    });
  }
  return results;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Whole-number price in minor units, or undefined when absent/invalid. */
function parsePrice(v: string | undefined) {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n) * 100 : undefined;
}

export interface SearchFilters extends SearchParams {
  /** Query string that reproduces these filters (no leading "?"). */
  query: string;
}

/**
 * Read filters off a `searchParams` object. Prices arrive as major units (dollars) and are
 * stored as minor units; amenities arrive as repeated `amenity=` values.
 */
export function parseFilters(sp: Record<string, string | string[] | undefined>): SearchFilters {
  const city = first(sp.city)?.trim() || undefined;
  const guests = Math.max(1, Number(first(sp.guests) ?? 1) || 1);
  const range = parseStayRange(first(sp.checkIn), first(sp.checkOut));
  const type = first(sp.type) || undefined;
  const minPrice = parsePrice(first(sp.minPrice));
  const maxPrice = parsePrice(first(sp.maxPrice));
  const raw = sp.amenity;
  const amenities = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((a): a is (typeof AMENITIES)[number] =>
    (AMENITIES as readonly string[]).includes(a),
  );

  const q = new URLSearchParams();
  if (city) q.set("city", city);
  if (range) {
    q.set("checkIn", first(sp.checkIn)!);
    q.set("checkOut", first(sp.checkOut)!);
  }
  q.set("guests", String(guests));
  if (type) q.set("type", type);
  if (minPrice !== undefined) q.set("minPrice", String(minPrice / 100));
  if (maxPrice !== undefined) q.set("maxPrice", String(maxPrice / 100));
  for (const a of amenities) q.append("amenity", a);

  return {
    city,
    guests,
    type,
    minPrice,
    maxPrice,
    amenities,
    ...(range ?? {}),
    query: q.toString(),
  };
}

/**
 * Cheapest and priciest room-type rate across published listings, in minor units of the
 * `display` currency — the bounds
 * of the price slider. Falls back to a sane range when there is nothing published yet.
 */
export async function priceBounds(display: DisplayMoney = DEFAULT_DISPLAY): Promise<{ min: number; max: number }> {
  // Per listing currency: the range of default prices and of per-date prices from today on, each
  // converted into the display currency.
  const today = toUtcDay(new Date());
  const aggs = await Promise.all(
    CURRENCIES.map(async (c) => {
      const [defaults, dated] = await Promise.all([
        db.roomType.aggregate({
          where: { property: { status: "PUBLISHED", currency: c } },
          _min: { pricePerNight: true },
          _max: { pricePerNight: true },
        }),
        db.nightlyRate.aggregate({
          where: { date: { gte: today }, roomType: { property: { status: "PUBLISHED", currency: c } } },
          _min: { price: true },
          _max: { price: true },
        }),
      ]);
      const values = [defaults._min.pricePerNight, defaults._max.pricePerNight, dated._min.price, dated._max.price].filter(
        (v): v is number => v !== null,
      );
      if (!values.length) return null;
      const conv = (v: number) => convertMinor(v, c, display.currency, display.rates.perUsd)!;
      return [conv(Math.min(...values)), conv(Math.max(...values))];
    }),
  );
  const found = aggs.filter((a): a is number[] => a !== null);
  const min = found.length ? Math.min(...found.map((a) => a[0])) : 0;
  const max = found.length ? Math.max(...found.map((a) => a[1])) : 100000;
  // Round outwards to whole currency units so the slider ends on tidy numbers.
  return { min: Math.floor(min / 100) * 100, max: Math.max(Math.ceil(max / 100) * 100, min + 100) };
}
