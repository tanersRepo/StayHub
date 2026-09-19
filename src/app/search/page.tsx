import { Suspense } from "react";
import { formatStay } from "@/lib/dates";
import { SearchBar } from "@/components/search-bar";
import { PropertyCard } from "@/components/property-card";
import { SearchMap } from "@/components/search-map";
import { parseStayRange, searchProperties } from "@/lib/search";

export const metadata = { title: "Search" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const city = first(sp.city)?.trim() || undefined;
  const guests = Math.max(1, Number(first(sp.guests) ?? 1) || 1);
  const range = parseStayRange(first(sp.checkIn), first(sp.checkOut));
  const type = first(sp.type) || undefined;

  const results = await searchProperties({ city, guests, type, ...(range ?? {}) });
  const pins = results
    .filter((r) => r.lat !== null && r.lng !== null)
    .map((r) => ({ id: r.id, title: r.title, lat: r.lat!, lng: r.lng!, fromPrice: r.fromPrice, currency: r.currency }));

  const summary = [
    city ? `in ${city}` : "everywhere",
    range ? `${formatStay(range.checkIn, "MMM d")} – ${formatStay(range.checkOut, "MMM d")}` : "any dates",
    `${guests} guest${guests === 1 ? "" : "s"}`,
  ].join(" · ");

  // Preserve the search context on card links so the booking widget can pre-fill dates.
  const query = new URLSearchParams();
  if (range) {
    query.set("checkIn", formatStay(range.checkIn, "yyyy-MM-dd"));
    query.set("checkOut", formatStay(range.checkOut, "yyyy-MM-dd"));
  }
  query.set("guests", String(guests));
  const linkSuffix = `?${query.toString()}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Suspense>
        <SearchBar className="mb-6" />
      </Suspense>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-4">
            <h1 className="text-xl font-semibold">
              {results.length} {results.length === 1 ? "stay" : "stays"} {summary}
            </h1>
            {range && (
              <p className="text-sm text-muted-foreground">
                Only showing places with a free room for every night of your stay.
              </p>
            )}
          </div>
          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <p className="font-medium">No stays match</p>
              <p className="mt-1 text-sm text-muted-foreground">Try different dates, fewer guests, or another city.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {results.map((p) => (
                <PropertyCard key={p.id} p={p} hrefSuffix={linkSuffix} />
              ))}
            </div>
          )}
        </div>
        <div className="hidden lg:col-span-2 lg:block">
          <SearchMap pins={pins} />
        </div>
      </div>
    </div>
  );
}
