import { Suspense } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { PropertyCard } from "@/components/property-card";
import { listPublishedProperties } from "@/lib/properties";
import { Button } from "@/components/ui/button";

const CITIES = ["Lisbon", "Barcelona", "Amsterdam"];

export default async function Home() {
  const featured = await listPublishedProperties({ take: 8 });
  return (
    <>
      <section className="bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Find your next stay</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Hotels, apartments and homes — book in minutes.
          </p>
          <div className="mx-auto mt-8 max-w-3xl">
            <Suspense>
              <SearchBar />
            </Suspense>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {CITIES.map((c) => (
              <Button key={c} variant="outline" size="sm" className="rounded-full" asChild>
                <Link href={`/search?city=${c}`}>{c}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Featured stays</h2>
            <p className="text-sm text-muted-foreground">Hand-picked places guests love</p>
          </div>
          <Button variant="link" asChild>
            <Link href="/search">See all</Link>
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <PropertyCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="text-xl font-semibold">Own a hotel or a spare apartment?</h2>
            <p className="text-muted-foreground">List it in minutes and start earning.</p>
          </div>
          <Button size="lg" asChild>
            <Link href="/host">Become a host</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
