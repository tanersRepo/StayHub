"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AMENITY_LABEL, PROPERTY_TYPE_LABEL } from "@/lib/labels";
import { formatMoney } from "@/lib/pricing";
import { AMENITIES, PROPERTY_TYPES } from "@/lib/validators/property";
import { cn } from "@/lib/utils";

interface Props {
  /** Slider bounds in minor units. */
  bounds: { min: number; max: number };
  currency: string;
  className?: string;
}

export function SearchFilters({ bounds, currency, className }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  // Slider works in whole currency units; the URL carries the same.
  const loMin = Math.floor(bounds.min / 100);
  const loMax = Math.ceil(bounds.max / 100);
  const urlMin = Number(params.get("minPrice") ?? NaN);
  const urlMax = Number(params.get("maxPrice") ?? NaN);
  const selected = params.getAll("amenity");
  const type = params.get("type");

  const urlPrice: [number, number] = [
    Number.isFinite(urlMin) ? urlMin : loMin,
    Number.isFinite(urlMax) ? urlMax : loMax,
  ];

  // Local state only exists so the thumbs move while dragging; the URL stays the source of
  // truth. When it changes (a new search, or Clear all), re-sync during render.
  const [price, setPrice] = useState<[number, number]>(urlPrice);
  const [syncedTo, setSyncedTo] = useState(urlPrice.join("-"));
  if (syncedTo !== urlPrice.join("-")) {
    setSyncedTo(urlPrice.join("-"));
    setPrice(urlPrice);
  }

  /** Rewrite the query string, always resetting to page defaults for anything not passed. */
  function apply(mutate: (q: URLSearchParams) => void) {
    const q = new URLSearchParams(params.toString());
    mutate(q);
    router.push(`/search?${q.toString()}`);
  }

  function commitPrice([lo, hi]: [number, number]) {
    apply((q) => {
      if (lo > loMin) q.set("minPrice", String(lo));
      else q.delete("minPrice");
      if (hi < loMax) q.set("maxPrice", String(hi));
      else q.delete("maxPrice");
    });
  }

  function toggleAmenity(a: string, on: boolean) {
    apply((q) => {
      const rest = q.getAll("amenity").filter((x) => x !== a);
      q.delete("amenity");
      for (const x of rest) q.append("amenity", x);
      if (on) q.append("amenity", a);
    });
  }

  function setType(t: string | null) {
    apply((q) => (t ? q.set("type", t) : q.delete("type")));
  }

  function clearAll() {
    apply((q) => {
      for (const k of ["minPrice", "maxPrice", "amenity", "type"]) q.delete(k);
    });
  }

  const activeCount =
    selected.length + (type ? 1 : 0) + (Number.isFinite(urlMin) ? 1 : 0) + (Number.isFinite(urlMax) ? 1 : 0);

  const panel = (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <Label className="font-semibold">Price per night</Label>
          <span className="text-sm text-muted-foreground">
            {formatMoney(price[0] * 100, currency)} – {formatMoney(price[1] * 100, currency)}
            {price[1] >= loMax && "+"}
          </span>
        </div>
        <Slider
          min={loMin}
          max={loMax}
          step={Math.max(1, Math.round((loMax - loMin) / 100))}
          value={price}
          onValueChange={(v) => setPrice([v[0], v[1]])}
          onValueCommit={(v) => commitPrice([v[0], v[1]])}
          aria-label="Price range"
        />
      </div>

      <Separator />

      <div>
        <Label className="mb-3 block font-semibold">Property type</Label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={type === t ? "default" : "outline"}
              onClick={() => setType(type === t ? null : t)}
            >
              {PROPERTY_TYPE_LABEL[t]}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="mb-3 block font-semibold">Amenities</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {AMENITIES.map((a) => {
            const id = `amenity-${a}`;
            return (
              <div key={a} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={selected.includes(a)}
                  onCheckedChange={(on) => toggleAmenity(a, on === true)}
                />
                <Label htmlFor={id} className="text-sm font-normal">
                  {AMENITY_LABEL[a]}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="w-full">
          <X className="size-4" /> Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: filters live in a sheet so results stay above the fold. */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <SlidersHorizontal className="size-4" />
              Filters{activeCount > 0 && ` (${activeCount})`}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="p-4">{panel}</div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className={cn("hidden rounded-xl border p-4 lg:block", className)}>{panel}</aside>
    </>
  );
}
