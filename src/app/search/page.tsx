import { Suspense } from "react";
import { formatStay } from "@/lib/dates";
import { SearchBar } from "@/components/search-bar";
import { SearchFilters } from "@/components/search-filters";
import { PropertyCard } from "@/components/property-card";
import { SearchMap } from "@/components/search-map";
import { parseFilters, priceBounds, searchProperties } from "@/lib/search";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const { city, guests, checkIn, checkOut } = filters;
  const range = checkIn && checkOut ? { checkIn, checkOut } : null;

  const [results, bounds] = await Promise.all([searchProperties(filters), priceBounds()]);
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

  const filtered =
    filters.amenities?.length || filters.minPrice !== undefined || filters.maxPrice !== undefined || filters.type;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Suspense>
        <SearchBar className="mb-6" />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-6">
        <div className="lg:col-span-2 xl:col-span-1">
          <Suspense>
            <SearchFilters bounds={bounds} currency={results[0]?.currency ?? "USD"} className="sticky top-6" />
          </Suspense>
        </div>

        <div className="lg:col-span-4 xl:col-span-3">
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
              <p className="mt-1 text-sm text-muted-foreground">
                {filtered
                  ? "Try widening the price range or removing some filters."
                  : "Try different dates, fewer guests, or another city."}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {results.map((p) => (
                <PropertyCard key={p.id} p={p} hrefSuffix={linkSuffix} />
              ))}
            </div>
          )}
        </div>

        <div className="hidden xl:col-span-2 xl:block">
          <SearchMap pins={pins} />
        </div>
      </div>
    </div>
  );
}
