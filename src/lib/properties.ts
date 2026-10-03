import { db } from "@/lib/db";
import { startingPrices } from "@/lib/rates";
import { COVER_IMAGE } from "@/lib/media-query";

/** Card-level data for listing grids: cover image, min price, rating summary. */
export async function listPublishedProperties(opts: { city?: string; take?: number } = {}) {
  const props = await db.property.findMany({
    where: {
      status: "PUBLISHED",
      ...(opts.city ? { city: { contains: opts.city } } : {}),
    },
    include: {
      media: COVER_IMAGE,
      roomTypes: { select: { id: true, pricePerNight: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.take,
  });
  // "From" price across a listing's rooms: default prices and any per-date prices from today on.
  const from = await startingPrices(props.flatMap((p) => p.roomTypes));
  return props.map((p) => {
    const prices = p.roomTypes.map((r) => from.get(r.id)).filter((x): x is number => x != null);
    return toCard({ ...p, fromPrice: prices.length ? Math.min(...prices) : null });
  });
}

export interface PropertyCardData {
  id: string;
  title: string;
  type: string;
  city: string;
  country: string;
  currency: string;
  coverUrl: string | null;
  fromPrice: number | null;
  rating: number | null;
  ratingCount: number;
}

function toCard(p: {
  id: string;
  title: string;
  type: string;
  city: string;
  country: string;
  currency: string;
  media: { url: string }[];
  fromPrice: number | null;
  reviews: { rating: number }[];
}): PropertyCardData {
  const ratingCount = p.reviews.length;
  const rating = ratingCount ? p.reviews.reduce((s, r) => s + r.rating, 0) / ratingCount : null;
  return {
    id: p.id,
    title: p.title,
    type: p.type,
    city: p.city,
    country: p.country,
    currency: p.currency,
    coverUrl: p.media[0]?.url ?? null,
    fromPrice: p.fromPrice,
    rating,
    ratingCount,
  };
}
