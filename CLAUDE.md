@AGENTS.md

# StayHub

Booking.com-style marketplace: hosts list properties (hotels, apartments, houses, rooms); guests search by city + dates and book.

## Stack
Next.js 16 (App Router, `src/`), TypeScript, Tailwind v4, shadcn/ui (**radix** style — `asChild` works), Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3` (Postgres in prod), Auth.js v5 (JWT sessions, Credentials + optional Google), zod v4, date-fns, react-leaflet + OSM, Vitest.

## Commands
- `npm run dev` — http://localhost:3000
- `npm run db:migrate` / `npm run db:seed` / `npm run db:reset` / `npm run db:studio`
- `npm run typecheck` (runs `next typegen` first — needed for `PageProps`/`LayoutProps`)
- `npm test` — Vitest unit tests in `src/**/__tests__`
- Seed logins: `host@example.com`, `guest@example.com` — password `password123`

## Conventions
- **Backend = Server Actions** in `src/actions/*.ts` (`"use server"`), validated with zod schemas from `src/lib/validators/`. No REST routes except `api/auth` and `api/uploads`.
- Actions used with `useActionState` return `{ error?: string }`; on success they `redirect()` or `revalidatePath()`.
- **Money is Int minor units (cents)**; format with `formatMoney()` in `src/lib/pricing.ts`.
- **Stay dates are UTC midnight**; a stay is the half-open range `[checkIn, checkOut)`. Use helpers in `src/lib/availability.ts`; never re-implement overlap logic.
- Every `Property` has ≥1 `RoomType` (hotels: several, with `quantity` > 1; apartments: one "Entire place" with quantity 1). Bookings/blocked dates attach to a **room type**. Availability is count-based (`checkAvailability`).
- Booking creation must run inside `db.$transaction` and re-check availability.
- Auth helpers: `currentUser()`, `requireUser()`, `requireHost()` in `src/lib/auth.ts`. Route protection lives in `src/proxy.ts` (Next 16 name for middleware).
- Prisma client is generated to `src/generated/prisma` (gitignored); import via `@/generated/prisma/client`. `postinstall` regenerates it.
- Enum-like columns are Strings (SQLite): Property.type, status, Booking.status, User.role. Keep the allowed values documented in `schema.prisma`.
- Read `node_modules/next/dist/docs/` when unsure about a Next 16 API before guessing.
- **Client components must not import from `src/lib/db.ts`, `storage.ts`, or `properties.ts`** (they pull SQLite/`node:fs` into the browser bundle and the route silently fails to build). Client-safe constants live in `src/lib/labels.ts` and `src/lib/media-limits.ts`.
- Media: `PropertyMedia` holds photos and ≤30 s videos (`kind` IMAGE|VIDEO, `order` 0 = cover). Uploads go through `POST /api/uploads` (route handler — Server Actions cap bodies at 1 MB); duration is verified server-side by `mp4DurationSeconds()`.
- Pricing: `PricingRule` tiers (minNights → discountPercent) are per property. Always price via `calculatePrice(rate, checkIn, checkOut, rules)`.
- Host pages live under `src/app/(host)/host/`; every page/action loads properties with `getOwnedProperty()` / `assertOwnsProperty()` from `src/lib/host.ts`.
- **Formatting stay dates:** use `formatStay()` from `src/lib/dates.ts`, never `format()` from date-fns directly (UTC-midnight dates shift a day in western timezones). Client date pickers parse `yyyy-mm-dd` as local (`new Date(\`${s}T00:00:00\`)`).
- Guest flow: `searchProperties()` (`src/lib/search.ts`) → `BookingWidget` → `createBooking` (transactional) → `/bookings/[id]` mock pay → `/trips`. Leaflet map is client-only via `next/dynamic` in `search-map.tsx`.
