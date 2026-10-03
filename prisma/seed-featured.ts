import type { PrismaClient } from "../src/generated/prisma/client";

/**
 * Showcase listings with real photos from Unsplash (free to use: https://unsplash.com/license).
 * `photos` are general shots of the place (exterior, living areas, kitchen, bathroom); each room's
 * `photos` are of its actual bedroom. Prices are whole units in the listing's `currency`.
 */

export type FeaturedRoom = {
  name: string;
  description: string;
  /** Default nightly price, minor units. */
  price: number;
  maxGuests: number;
  quantity: number;
  beds: number;
  bedrooms: number;
  bathrooms: number;
  photos: string[];
};

export type Featured = {
  title: string;
  type: "HOTEL" | "APARTMENT" | "HOUSE" | "ROOM";
  city: string;
  country: string;
  address: string;
  lat: number;
  lng: number;
  currency: "USD" | "EUR";
  description: string;
  amenities: string[];
  minNights: number;
  photos: string[];
  rooms: FeaturedRoom[];
  /** Fridays and Saturdays cost this much more over the coming months (shows per-date pricing). */
  weekendMarkupPercent?: number;
};

/** Full-size Unsplash image URL for a photo id. */
export function unsplash(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;
}

export const FEATURED: Featured[] = [
  {
    title: "Left Bank Studio with Herringbone Floors",
    type: "APARTMENT",
    city: "Paris",
    country: "France",
    address: "12 Rue de Seine",
    lat: 48.8553,
    lng: 2.3369,
    currency: "EUR",
    minNights: 2,
    description:
      "A bright, quiet studio on a classic Saint-Germain street, with tall windows, oak herringbone floors and a proper workspace. Cafés, galleries and the Seine are a two-minute walk.",
    amenities: ["wifi", "kitchen", "washer", "workspace"],
    photos: [
      "1493809842364-78817add7ffb", // living room, herringbone floor
      "1522708323590-d24dbb6b0267", // dining corner
      "1552321554-5fefe8c9ef14", // bathroom
    ],
    rooms: [
      {
        name: "Entire studio",
        description: "Queen bed with linen bedding and a reading lamp.",
        price: 13500,
        maxGuests: 2,
        quantity: 1,
        beds: 1,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1522771739844-6a9f6d5f14af"],
      },
    ],
  },
  {
    title: "Trastevere Family Apartment",
    type: "APARTMENT",
    city: "Rome",
    country: "Italy",
    address: "Via della Lungaretta 41",
    lat: 41.8893,
    lng: 12.4703,
    currency: "EUR",
    minNights: 2,
    description:
      "Two bedrooms over a cobbled lane in Trastevere, with a sunny dining room, plants everywhere and a full kitchen. Ideal for families who want to live like locals.",
    amenities: ["wifi", "kitchen", "air_conditioning", "washer"],
    photos: [
      "1560185007-cde436f6a4d0", // dining room
      "1502672260266-1c1ef2d93688", // living room with plants
      "1484154218962-a197022b5858", // kitchen
    ],
    rooms: [
      {
        name: "Entire apartment",
        description: "A double bedroom and a second bedroom, both bright and freshly made up.",
        price: 11000,
        maxGuests: 4,
        quantity: 1,
        beds: 3,
        bedrooms: 2,
        bathrooms: 1,
        photos: ["1615874959474-d609969a20ed", "1617325247661-675ab4b64ae2"],
      },
    ],
  },
  {
    title: "Kreuzberg Loft by the Canal",
    type: "APARTMENT",
    city: "Berlin",
    country: "Germany",
    address: "Paul-Lincke-Ufer 8",
    lat: 52.4964,
    lng: 13.4253,
    currency: "EUR",
    minNights: 1,
    description:
      "An airy loft with brick walls, a record shelf and a long dining table, a short walk from the Landwehr Canal and Kreuzberg's best bars.",
    amenities: ["wifi", "kitchen", "washer", "workspace", "pets_allowed"],
    photos: [
      "1536376072261-38c75010e6c9", // loft living and dining
      "1600607687939-ce8a6c25118c", // lounge
      "1584622650111-993a426fbf0a", // bathroom
    ],
    rooms: [
      {
        name: "Entire loft",
        description: "King bed by a wall of windows.",
        price: 9800,
        maxGuests: 2,
        quantity: 1,
        beds: 1,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1617104678098-de229db51175"],
      },
    ],
  },
  {
    title: "Old Town Boutique Hotel",
    type: "HOTEL",
    city: "Prague",
    country: "Czechia",
    address: "Celetná 17",
    lat: 50.0872,
    lng: 14.4233,
    currency: "EUR",
    minNights: 1,
    description:
      "A restored townhouse hotel steps from Old Town Square, with a calm lounge, breakfast every morning and rooms in warm, muted tones.",
    amenities: ["wifi", "air_conditioning", "breakfast", "gym"],
    photos: [
      "1600210492486-724fe5c67fb0", // lounge
      "1564078516393-cf04bd966897", // double-height sitting room
      "1583847268964-b28dc8f51f92", // reading corner
    ],
    rooms: [
      {
        name: "Classic Double",
        description: "Queen bed, rain shower and a city view.",
        price: 9000,
        maxGuests: 2,
        quantity: 10,
        beds: 1,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1618773928121-c32242e63f39"],
      },
      {
        name: "Deluxe King",
        description: "King bed, armchair and blackout curtains.",
        price: 12500,
        maxGuests: 2,
        quantity: 6,
        beds: 1,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1629140727571-9b5c6f6267b4"],
      },
      {
        name: "Junior Suite",
        description: "King bed and a sitting area with a sofa.",
        price: 18000,
        maxGuests: 3,
        quantity: 2,
        beds: 2,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1590490360182-c33d57733427"],
      },
    ],
  },
  {
    title: "Nyhavn Design Apartment",
    type: "APARTMENT",
    city: "Copenhagen",
    country: "Denmark",
    address: "Nyhavn 31",
    lat: 55.6797,
    lng: 12.5901,
    currency: "EUR",
    minNights: 2,
    description:
      "Scandinavian design on the colourful Nyhavn harbour: oak floors, soft textiles and a big bathtub after a day on the bikes.",
    amenities: ["wifi", "kitchen", "washer", "workspace"],
    photos: [
      "1586023492125-27b2c045efd7", // living room
      "1554995207-c18c203602cb", // open-plan living and kitchen
      "1620626011761-996317b8d101", // bathroom with tub
    ],
    rooms: [
      {
        name: "Entire apartment",
        description: "Upholstered king bed and linen curtains.",
        price: 17000,
        maxGuests: 2,
        quantity: 1,
        beds: 1,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1616594039964-ae9021a400a0", "1631049307264-da0ec9d70304"],
      },
    ],
  },
  {
    title: "Hillside Villa with Infinity Pool",
    type: "HOUSE",
    city: "Marbella",
    country: "Spain",
    address: "Calle Sierra Blanca 7",
    lat: 36.5226,
    lng: -4.901,
    currency: "EUR",
    minNights: 3,
    weekendMarkupPercent: 25,
    description:
      "A modern four-bedroom villa above Marbella with an infinity pool, sea views from the terrace and a bright open-plan living space.",
    amenities: ["wifi", "kitchen", "air_conditioning", "washer", "parking", "pool"],
    photos: [
      "1580587771525-78b9dba3b914", // villa and pool
      "1613490493576-7fde63acd811", // pool terrace
      "1598928506311-c55ded91a20c", // living room
      "1505691938895-1758d7feb511", // sofa and terrace doors
    ],
    rooms: [
      {
        name: "Entire villa",
        description: "Main bedroom with a king bed, plus three more bedrooms.",
        price: 42000,
        maxGuests: 8,
        quantity: 1,
        beds: 5,
        bedrooms: 4,
        bathrooms: 3,
        photos: ["1505693416388-ac5ce068fe85", "1540518614846-7eded433c457"],
      },
    ],
  },
  {
    title: "Cliffside Suites",
    type: "HOTEL",
    city: "Santorini",
    country: "Greece",
    address: "Oia 847 02",
    lat: 36.4618,
    lng: 25.3753,
    currency: "EUR",
    minNights: 2,
    weekendMarkupPercent: 20,
    description:
      "Whitewashed suites above the caldera at Oia, with a shared infinity pool and some of the best sunsets in the Aegean.",
    amenities: ["wifi", "air_conditioning", "breakfast", "pool"],
    photos: [
      "1551882547-ff40c63fe5fa", // hotel and pool at dusk
      "1584132967334-10e028bd69f7", // infinity pool and deck
      "1445019980597-93fa8acb246c", // sun loungers with a view
    ],
    rooms: [
      {
        name: "Sea View Double",
        description: "Double bed with sunlight streaming in.",
        price: 21000,
        maxGuests: 2,
        quantity: 6,
        beds: 1,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1582719478250-c89cae4dc85b"],
      },
      {
        name: "Honeymoon Suite with Terrace",
        description: "King bed on a private terrace over the water.",
        price: 32000,
        maxGuests: 2,
        quantity: 2,
        beds: 1,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1596394516093-501ba68a0ba6"],
      },
    ],
  },
  {
    title: "Ubud Jungle Resort",
    type: "HOTEL",
    city: "Ubud",
    country: "Indonesia",
    address: "Jalan Raya Sayan 99",
    lat: -8.5069,
    lng: 115.2625,
    currency: "USD",
    minNights: 2,
    description:
      "Thatched bungalows and pool villas tucked into the rainforest above the Ayung river, with a lagoon pool, spa and daily breakfast.",
    amenities: ["wifi", "air_conditioning", "breakfast", "pool", "gym"],
    photos: [
      "1520250497591-112f2f40a3f4", // lagoon pool in the jungle
      "1566073771259-6a8506099945", // pool deck and lodge
      "1542314831-068cd1dbfeeb", // pool at night
    ],
    rooms: [
      {
        name: "Garden Bungalow",
        description: "Teak bungalow with a king bed and a garden view.",
        price: 14000,
        maxGuests: 2,
        quantity: 8,
        beds: 1,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1611892440504-42a792e24d32"],
      },
      {
        name: "Private Pool Villa",
        description: "Separate bedroom, open-air living area and a plunge pool.",
        price: 29000,
        maxGuests: 3,
        quantity: 3,
        beds: 2,
        bedrooms: 1,
        bathrooms: 1,
        photos: ["1578683010236-d716f9a3f461"],
      },
    ],
  },
  {
    title: "Black Forest Cabin Retreat",
    type: "HOUSE",
    city: "Freiburg",
    country: "Germany",
    address: "Schauinslandstraße 52",
    lat: 47.9101,
    lng: 7.8968,
    currency: "EUR",
    minNights: 2,
    description:
      "A timber cabin in the pines above Freiburg, with a wood stove, a deck for stargazing and hiking trails from the front door.",
    amenities: ["wifi", "kitchen", "parking", "pets_allowed"],
    photos: [
      "1595521624992-48a59aef95e3", // cabin in the forest
      "1568605114967-8130f3a36994", // timber house at dusk
      "1560448204-e02f11c3d0e2", // living room
    ],
    rooms: [
      {
        name: "Entire cabin",
        description: "Queen bed under the eaves and a cosy second bedroom.",
        price: 16000,
        maxGuests: 4,
        quantity: 1,
        beds: 2,
        bedrooms: 2,
        bathrooms: 1,
        photos: ["1560067174-c5a3a8f37060"],
      },
    ],
  },
  {
    title: "Modern Beach House",
    type: "HOUSE",
    city: "Miami Beach",
    country: "United States",
    address: "4120 Pine Tree Drive",
    lat: 25.8146,
    lng: -80.1254,
    currency: "USD",
    minNights: 2,
    description:
      "A white modernist house a block from the beach, with a pool, a roof terrace, an open living room and a modern kitchen.",
    amenities: ["wifi", "kitchen", "air_conditioning", "washer", "parking", "pool"],
    photos: [
      "1600596542815-ffad4c1539a9", // house and pool
      "1512917774080-9991f1c4c750", // pool terrace
      "1567767292278-a4f21aa2d36e", // living room
      "1564013799919-ab600027ffc6", // house and pool in the palms
    ],
    rooms: [
      {
        name: "Entire house",
        description: "Main bedroom with a king bed, plus two guest rooms.",
        price: 38000,
        maxGuests: 6,
        quantity: 1,
        beds: 4,
        bedrooms: 3,
        bathrooms: 3,
        photos: ["1595526114035-0d45ed16cfbf", "1566665797739-1674de7a421a"],
      },
    ],
  },
];

/**
 * Creates the showcase listings that don't exist yet (matched by title), alternating between the
 * given hosts. Returns each new listing's id with its first room, for seeding bookings and reviews.
 */
export async function createFeatured(
  db: PrismaClient,
  hostIds: string[],
): Promise<{ id: string; roomTypeId: string; pricePerNight: number }[]> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const existing = new Set((await db.property.findMany({ select: { title: true } })).map((p) => p.title));
  const created: { id: string; roomTypeId: string; pricePerNight: number }[] = [];

  for (const [i, f] of FEATURED.entries()) {
    if (existing.has(f.title)) continue;
    const p = await db.property.create({
      data: {
        hostId: hostIds[i % hostIds.length],
        title: f.title,
        description: f.description,
        type: f.type,
        address: f.address,
        city: f.city,
        country: f.country,
        lat: f.lat,
        lng: f.lng,
        currency: f.currency,
        amenities: JSON.stringify(f.amenities),
        status: "PUBLISHED",
        minNights: f.minNights,
        media: { create: f.photos.map((id, order) => ({ kind: "IMAGE", url: unsplash(id), order })) },
        pricingRules: { create: [{ minNights: 7, discountPercent: 10 }] },
        roomTypes: {
          create: f.rooms.map((r, order) => ({
            name: r.name,
            description: r.description,
            pricePerNight: r.price,
            maxGuests: r.maxGuests,
            quantity: r.quantity,
            beds: r.beds,
            bedrooms: r.bedrooms,
            bathrooms: r.bathrooms,
            order,
          })),
        },
      },
      include: { roomTypes: { orderBy: { order: "asc" } } },
    });

    // Bedroom photos belong to their room; `order` continues after the general photos.
    let order = f.photos.length;
    for (const [ri, r] of f.rooms.entries()) {
      await db.propertyMedia.createMany({
        data: r.photos.map((id) => ({ propertyId: p.id, roomTypeId: p.roomTypes[ri].id, kind: "IMAGE", url: unsplash(id), order: order++ })),
      });
    }

    // Weekend prices for the next four months, as a host would set them in the pricing calendar.
    if (f.weekendMarkupPercent) {
      const weekendNights = Array.from({ length: 120 }, (_, d) => new Date(today.getTime() + d * 86_400_000)).filter((d) =>
        [5, 6].includes(d.getUTCDay()),
      );
      for (const [ri, r] of f.rooms.entries()) {
        const price = Math.round((r.price * (100 + f.weekendMarkupPercent)) / 100 / 100) * 100;
        await db.nightlyRate.createMany({ data: weekendNights.map((date) => ({ roomTypeId: p.roomTypes[ri].id, date, price })) });
      }
    }
    created.push({ id: p.id, roomTypeId: p.roomTypes[0].id, pricePerNight: f.rooms[0].price });
  }
  return created;
}
