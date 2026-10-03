"use server";

import { db } from "@/lib/db";
import { rankDestinations, type Destination } from "@/lib/destinations";

/**
 * Autocomplete for the "Where to?" box: cities with at least one published stay that match the
 * query. Matching runs in JS rather than as a DB `contains`, which is case-insensitive on SQLite
 * but case-sensitive on Postgres. The list is one row per distinct city, so this stays cheap.
 */
export async function suggestDestinations(query: string): Promise<Destination[]> {
  const q = String(query ?? "").slice(0, 80);
  if (!q.trim()) return [];
  const rows = await db.property.groupBy({
    by: ["city", "country"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  return rankDestinations(
    rows.map((r) => ({ city: r.city, country: r.country, count: r._count._all })),
    q,
  );
}
