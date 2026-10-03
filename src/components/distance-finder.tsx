"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Car, ExternalLink, Footprints, MapPin, Navigation, Ruler, TrainFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { distanceFrom, suggestDistancePlaces, type DistanceResult } from "@/actions/distance";
import type { PlaceSuggestion } from "@/lib/geocode";
import { formatDistance, formatDuration, googleDirectionsUrl } from "@/lib/distance";

interface Props {
  propertyId: string;
  /** Short name of the listing, for the dialog title. */
  title: string;
  /** Show miles as well as kilometres (US listings). */
  imperial?: boolean;
  className?: string;
}

/**
 * "See distance from…" under the location mini map: the guest types a place (with suggestions as
 * they type, from OpenStreetMap via Photon) and sees how far it is from the listing by car and on foot (OpenStreetMap routing), with public transport handed
 * off to Google Maps, since no free service routes transit worldwide.
 */
export function DistanceFinder({ propertyId, title, imperial = false, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DistanceResult | null>(null);
  const [pending, start] = useTransition();
  const listId = useId();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Suggestions can arrive out of order; only the latest request may update the list.
  const latest = useRef(0);

  function type(next: string) {
    setQuery(next);
    clearTimeout(timer.current);
    if (next.trim().length < 2) {
      latest.current++;
      setSuggestions([]);
      setListOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const id = ++latest.current;
      const list = await suggestDistancePlaces({ propertyId, query: next });
      if (id !== latest.current) return;
      setSuggestions(list);
      setActive(-1);
      setListOpen(list.length > 0);
    }, 250);
  }

  /** Free-text search, or a picked suggestion (exact position, no second lookup). */
  function run(place?: PlaceSuggestion) {
    latest.current++; // drop suggestions still in flight
    clearTimeout(timer.current);
    setListOpen(false);
    const text = place ? [place.name, place.area].filter(Boolean).join(", ") : query;
    if (place) setQuery(text);
    start(async () =>
      setResult(
        await distanceFrom({ propertyId, query: text, place: place && { label: text, lat: place.lat, lng: place.lng } }),
      ),
    );
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    run(listOpen && active >= 0 ? suggestions[active] : undefined);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!listOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  }

  const found = result && !result.error && result.place && result.from ? result : null;

  return (
    <>
      <Button variant="outline" className={cn("w-full", className)} onClick={() => setOpen(true)}>
        <Navigation className="size-4" /> See distance from…
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-lg"
          // Esc closes the suggestion list first; a second Esc closes the dialog.
          onEscapeKeyDown={(e) => {
            if (listOpen) {
              e.preventDefault();
              setListOpen(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>How far is it?</DialogTitle>
            <DialogDescription>Enter a place, address or landmark to see its distance from {title}.</DialogDescription>
          </DialogHeader>

          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                autoFocus
                value={query}
                onChange={(e) => type(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={() => setListOpen(false)}
                onFocus={() => suggestions.length > 0 && setListOpen(true)}
                placeholder="e.g. airport, train station, a museum, an address"
                aria-label="Place, address or landmark"
                autoComplete="off"
                role="combobox"
                aria-expanded={listOpen}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={listOpen && active >= 0 ? `${listId}-${active}` : undefined}
              />
              {listOpen && (
                <ul
                  id={listId}
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover py-1 text-popover-foreground shadow-lg"
                >
                  {suggestions.map((sug, i) => (
                    <li
                      key={`${sug.name}|${sug.area}|${i}`}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      // mousedown, not click: keeps focus in the input so onBlur doesn't close the list first.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        run(sug);
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={cn("flex cursor-pointer items-start gap-2 px-3 py-2", i === active && "bg-accent text-accent-foreground")}
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{sug.name}</span>
                        {sug.area && <span className="block truncate text-xs text-muted-foreground">{sug.area}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button type="submit" disabled={pending || query.trim().length < 2}>
              {pending ? "Finding…" : "Find"}
            </Button>
          </form>

          {result?.error && <p className="text-sm text-destructive">{result.error}</p>}

          {found && (
            <div className="space-y-3">
              <p className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="font-medium">{found.place!.label}</span>
                  <span className="block text-muted-foreground">
                    <Ruler className="mr-1 inline size-3.5" />
                    {formatDistance(found.straightMeters!, imperial)} in a straight line
                  </span>
                </span>
              </p>

              <ul className="divide-y rounded-lg border">
                <Mode
                  icon={<Car className="size-4" />}
                  label="By car"
                  value={found.driving ? `${formatDuration(found.driving.seconds)} · ${formatDistance(found.driving.meters, imperial)}` : null}
                  empty="No driving route found"
                  href={found.driving ? googleDirectionsUrl(found.from!, found.place!, "driving") : null}
                />
                <Mode
                  icon={<Footprints className="size-4" />}
                  label="On foot"
                  value={found.walking ? `${formatDuration(found.walking.seconds)} · ${formatDistance(found.walking.meters, imperial)}` : null}
                  empty="Too far to walk"
                  href={found.walking ? googleDirectionsUrl(found.from!, found.place!, "walking") : null}
                />
                <Mode
                  icon={<TrainFront className="size-4" />}
                  label="Public transport"
                  value={null}
                  empty="See routes and times on Google Maps"
                  href={googleDirectionsUrl(found.from!, found.place!, "transit")}
                  linkLabel="Open"
                />
              </ul>
              <p className="text-xs text-muted-foreground">
                Car and walking times from OpenStreetMap, without traffic. Times are estimates.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Mode({
  icon,
  label,
  value,
  empty,
  href,
  linkLabel = "Route",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  empty: string;
  /** Google Maps link for this mode, or null to show no link (e.g. no route). */
  href: string | null;
  linkLabel?: string;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{value ?? empty}</span>
      </span>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {linkLabel} <ExternalLink className="size-3.5" />
        </a>
      )}
    </li>
  );
}
