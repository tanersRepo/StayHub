"use client";

import { useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { suggestDestinations } from "@/actions/destinations";
import type { Destination } from "@/lib/destinations";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Debounce between keystrokes and the suggestion request. */
const DEBOUNCE_MS = 150;

/**
 * "Where to?" text box with a dropdown of matching cities. Keyboard: ↑/↓ move, Enter picks the
 * highlighted city (otherwise it submits the surrounding form as usual), Escape closes.
 */
export function DestinationInput({ value, onChange, placeholder, className }: Props) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Responses can arrive out of order; only the latest request may update the list.
  const latest = useRef(0);

  function type(next: string) {
    onChange(next);
    clearTimeout(timer.current);
    if (!next.trim()) {
      latest.current++;
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const id = ++latest.current;
      const res = await suggestDestinations(next);
      if (id !== latest.current) return;
      setSuggestions(res);
      setActive(res.length ? 0 : -1);
      setOpen(true);
    }, DEBOUNCE_MS);
  }

  function pick(d: Destination) {
    latest.current++; // drop any request still in flight
    clearTimeout(timer.current);
    onChange(d.city);
    setOpen(false);
    setSuggestions([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // pick instead of submitting the search form
      pick(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && value.trim() !== "";

  return (
    <div className={cn("relative flex flex-1 items-center gap-2 px-3", className)}>
      <MapPin className="size-4 shrink-0 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => type(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        className="border-0 shadow-none focus-visible:ring-0"
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover py-1 text-left text-popover-foreground shadow-lg md:right-auto md:min-w-80"
        >
          {suggestions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No stays in places matching “{value.trim()}”</li>
          ) : (
            suggestions.map((d, i) => (
              <li
                key={`${d.city}|${d.country}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: keeps focus in the input so onBlur doesn't close us first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(d);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-2.5",
                  i === active && "bg-accent text-accent-foreground",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                  <MapPin className="size-4 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{d.city}</span>
                  <span className="block truncate text-xs text-muted-foreground">{d.country}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {d.count} {d.count === 1 ? "stay" : "stays"}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
