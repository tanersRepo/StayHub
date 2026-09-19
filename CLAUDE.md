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
