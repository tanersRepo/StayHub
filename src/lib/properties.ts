import { db } from "@/lib/db";

/** Card-level data for listing grids: cover image, min price, rating summary. */
export async function listPublishedProperties(opts: { city?: string; take?: number } = {}) {
  const props = await db.property.findMany({
    where: {
      status: "PUBLISHED",
      ...(opts.city ? { city: { contains: opts.city } } : {}),
    },
    include: {
      media: { where: { kind: "IMAGE" }, orderBy: { order: "asc" }, take: 1 },
      roomTypes: { orderBy: { pricePerNight: "asc" }, take: 1, select: { pricePerNight: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.take,
  });
  return props.map(toCard);
}

export type PropertyCardData = ReturnType<typeof toCard>;

function toCard(p: {
  id: string;
  title: string;
  type: string;
  city: string;
  country: string;
  currency: string;
  media: { url: string }[];
  roomTypes: { pricePerNight: number }[];
  reviews: { rating: number }[];
}) {
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
    fromPrice: p.roomTypes[0]?.pricePerNight ?? null,
    rating,
    ratingCount,
  };
}
