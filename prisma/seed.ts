import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

const PASSWORD = "password123";

function utcDay(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
function img(seed: string, i: number) {
  return `https://picsum.photos/seed/${seed}-${i}/1200/800`;
}

const CITIES = [
  { city: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393 },
  { city: "Barcelona", country: "Spain", lat: 41.3874, lng: 2.1686 },
  { city: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041 },
];

const AMENITIES = ["wifi", "kitchen", "air_conditioning", "washer", "parking", "pool", "gym", "breakfast", "pets_allowed", "workspace"];

type RoomSpec = { name: string; price: number; maxGuests: number; quantity: number; beds?: number; bedrooms?: number; bathrooms?: number };
type ListingSpec = { title: string; type: string; rooms: RoomSpec[] };

const LISTINGS: ListingSpec[] = [
  { title: "Sunny Alfama Apartment", type: "APARTMENT", rooms: [{ name: "Entire apartment", price: 9500, maxGuests: 4, quantity: 1, beds: 2, bedrooms: 2 }] },
  {
    title: "Riverside Boutique Hotel",
    type: "HOTEL",
    rooms: [
      { name: "Standard Double", price: 14000, maxGuests: 2, quantity: 8 },
      { name: "Deluxe King", price: 19000, maxGuests: 2, quantity: 4 },
      { name: "Family Suite", price: 28000, maxGuests: 4, quantity: 2, beds: 3, bedrooms: 2 },
    ],
  },
  { title: "Cozy Private Room", type: "ROOM", rooms: [{ name: "Private room", price: 5200, maxGuests: 2, quantity: 1 }] },
  { title: "Family Villa with Pool", type: "HOUSE", rooms: [{ name: "Entire villa", price: 26000, maxGuests: 8, quantity: 1, beds: 5, bedrooms: 4, bathrooms: 3 }] },
];

async function main() {
  await db.review.deleteMany();
  await db.payment.deleteMany();
  await db.booking.deleteMany();
  await db.blockedDate.deleteMany();
  await db.roomType.deleteMany();
  await db.propertyImage.deleteMany();
  await db.property.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await hash(PASSWORD, 10);
  const [host1, host2] = await Promise.all([
    db.user.create({ data: { name: "Maria Host", email: "host@example.com", passwordHash, role: "HOST" } }),
    db.user.create({ data: { name: "Jonas Host", email: "host2@example.com", passwordHash, role: "HOST" } }),
  ]);
  const guests = await Promise.all(
    ["guest@example.com", "guest2@example.com", "guest3@example.com"].map((email, i) =>
      db.user.create({ data: { name: `Guest ${i + 1}`, email, passwordHash } }),
    ),
  );

  const properties: { id: string; roomTypeId: string; pricePerNight: number }[] = [];
  let n = 0;
  for (const c of CITIES) {
    for (const spec of LISTINGS) {
      n++;
      const host = n % 2 ? host1 : host2;
      const p = await db.property.create({
        data: {
          hostId: host.id,
          title: `${spec.title} · ${c.city}`,
          description: `A lovely ${spec.type.toLowerCase()} in the heart of ${c.city}. Close to transport, cafes and the best sights.`,
          type: spec.type,
          address: `${10 + n} Main Street`,
          city: c.city,
          country: c.country,
          lat: c.lat + (Math.random() - 0.5) * 0.04,
          lng: c.lng + (Math.random() - 0.5) * 0.04,
          amenities: JSON.stringify(AMENITIES.filter((_, i) => (i + n) % 3 !== 0)),
          status: "PUBLISHED",
          images: { create: [0, 1, 2, 3].map((i) => ({ url: img(`stay${n}`, i), order: i })) },
          roomTypes: {
            create: spec.rooms.map((r, i) => ({
              name: r.name, pricePerNight: r.price, maxGuests: r.maxGuests, quantity: r.quantity,
              beds: r.beds ?? 1, bedrooms: r.bedrooms ?? 1, bathrooms: r.bathrooms ?? 1, order: i,
            })),
          },
        },
        include: { roomTypes: { orderBy: { order: "asc" } } },
      });
      properties.push({ id: p.id, roomTypeId: p.roomTypes[0].id, pricePerNight: p.roomTypes[0].pricePerNight });
    }
  }

  // Past completed bookings with reviews
  const today = new Date();
  const base = utcDay(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());
  const comments = [
    "Fantastic stay, spotless and exactly as described.",
    "Great location, host was very responsive.",
    "Comfortable and quiet. Would book again.",
    "Good value, though the wifi was a bit slow.",
  ];
  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    const guest = guests[i % guests.length];
    const checkIn = addDays(base, -40 - i * 3);
    const checkOut = addDays(checkIn, 3);
    const total = p.pricePerNight * 3 + Math.round(p.pricePerNight * 3 * 0.1);
    const booking = await db.booking.create({
      data: {
        propertyId: p.id, roomTypeId: p.roomTypeId, guestId: guest.id, checkIn, checkOut, guests: 2, nights: 3,
        totalAmount: total, status: "COMPLETED",
        payment: { create: { amount: total } },
      },
    });
    await db.review.create({
      data: {
        bookingId: booking.id, propertyId: p.id, authorId: guest.id,
        rating: 3 + ((i * 7) % 3), comment: comments[i % comments.length],
      },
    });
  }

  // A few upcoming confirmed bookings and blocked dates
  for (let i = 0; i < 4; i++) {
    const p = properties[i];
    const checkIn = addDays(base, 5 + i * 4);
    const checkOut = addDays(checkIn, 2);
    const total = p.pricePerNight * 2 + Math.round(p.pricePerNight * 2 * 0.1);
    await db.booking.create({
      data: {
        propertyId: p.id, roomTypeId: p.roomTypeId, guestId: guests[0].id, checkIn, checkOut, guests: 2, nights: 2,
        totalAmount: total, status: "CONFIRMED", payment: { create: { amount: total } },
      },
    });
    await db.blockedDate.createMany({
      data: [20, 21].map((d) => ({ roomTypeId: p.roomTypeId, date: addDays(base, d) })),
    });
  }

  console.log(`Seeded ${properties.length} properties. Login: host@example.com / guest@example.com, password: ${PASSWORD}`);
}

main().finally(() => db.$disconnect());
