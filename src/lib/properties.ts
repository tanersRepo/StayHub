import { db } from "@/lib/db";

/** Card-level data for listing grids: cover image, min price, rating summary. */
export async function listPublishedProperties(opts: { city?: string; take?: number } = {}) {
  const props = await db.property.findMany({
    where: {
      status: "PUBLISHED",
      ...(opts.city ? { city: { contains: opts.city } } : {}),
    },
    include: {
      images: { orderBy: { order: "asc" }, take: 1 },
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
  images: { url: string }[];
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
    coverUrl: p.images[0]?.url ?? null,
    fromPrice: p.roomTypes[0]?.pricePerNight ?? null,
    rating,
    ratingCount,
  };
}

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  HOTEL: "Hotel",
  APARTMENT: "Apartment",
  HOUSE: "House",
  ROOM: "Private room",
};

export const AMENITY_LABEL: Record<string, string> = {
  wifi: "Wi-Fi",
  kitchen: "Kitchen",
  air_conditioning: "Air conditioning",
  washer: "Washer",
  parking: "Free parking",
  pool: "Pool",
  gym: "Gym",
  breakfast: "Breakfast included",
  pets_allowed: "Pets allowed",
  workspace: "Dedicated workspace",
};
