"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search, Users } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DestinationInput } from "@/components/destination-input";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  /** yyyy-mm-dd dates to pre-select when the URL carries none (e.g. a suggested weekend). */
  defaultRange?: { checkIn: string; checkOut: string };
}

export function SearchBar({ className, defaultRange }: SearchBarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [city, setCity] = useState(params.get("city") ?? "");
  const [guests, setGuests] = useState(Number(params.get("guests") ?? 2));
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = params.get("checkIn") ?? defaultRange?.checkIn;
    const to = params.get("checkOut") ?? defaultRange?.checkOut;
    return from && to ? { from: new Date(`${from}T00:00:00`), to: new Date(`${to}T00:00:00`) } : undefined;
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (city.trim()) q.set("city", city.trim());
    if (range?.from && range?.to) {
      q.set("checkIn", format(range.from, "yyyy-MM-dd"));
      q.set("checkOut", format(range.to, "yyyy-MM-dd"));
    }
    q.set("guests", String(guests));
    router.push(`/search?${q.toString()}`);
  }

  const dateLabel =
    range?.from && range?.to
      ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`
      : "Add dates";

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border bg-background p-2 shadow-lg md:flex-row md:items-center md:rounded-full",
        className,
      )}
    >
      <DestinationInput value={city} onChange={setCity} placeholder="Where to? e.g. Lisbon" />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" className="h-auto justify-start gap-2 py-1.5 md:w-52">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-xs font-normal text-muted-foreground">Select your dates</span>
              <span>{dateLabel}</span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            defaultMonth={range?.from}
            onSelect={setRange}
            disabled={{ before: new Date() }}
          />
        </PopoverContent>
      </Popover>
      <div className="flex items-center gap-2 px-3">
        <Users className="size-4 text-muted-foreground" />
        <Input
          type="number"
          min={1}
          max={16}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-16 border-0 shadow-none focus-visible:ring-0"
          aria-label="Guests"
        />
        <span className="text-sm text-muted-foreground">guests</span>
      </div>
      <Button type="submit" size="lg" className="rounded-full md:size-11 md:p-0">
        <Search className="size-4" />
        <span className="md:hidden">Search</span>
      </Button>
    </form>
  );
}
