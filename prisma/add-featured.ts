import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { FEATURED, createFeatured } from "./seed-featured";

/**
 * Adds the showcase listings (prisma/seed-featured.ts) to the current database WITHOUT wiping it,
 * skipping any that already exist. `npm run db:seed` resets everything and includes them too.
 */
const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

async function main() {
  const hosts = await db.user.findMany({
    where: { email: { in: ["host@example.com", "host2@example.com"] } },
    orderBy: { email: "asc" },
    select: { id: true },
  });
  if (hosts.length === 0) throw new Error("No seed hosts found. Run `npm run db:seed` first.");
  const created = await createFeatured(db, hosts.map((h) => h.id));
  console.log(`Added ${created.length} of ${FEATURED.length} showcase listings (${FEATURED.length - created.length} already existed).`);
}

main().finally(() => db.$disconnect());
