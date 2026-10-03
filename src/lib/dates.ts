import { addDays, format, isFriday, nextFriday } from "date-fns";

/**
 * Stay dates are stored as UTC midnight. Formatting them with date-fns directly would shift
 * them by the machine's timezone offset (e.g. Nov 10 UTC → "Nov 9" in the Americas).
 * This formats the UTC calendar day regardless of the runtime timezone.
 */
export function formatStay(date: Date, pattern = "MMM d, yyyy"): string {
  return format(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()), pattern);
}

/** yyyy-mm-dd of a UTC-midnight stay date. */
export function stayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Suggested dates for the home search bar: the first Friday at least `weeksAhead` weeks from
 * `today`, checking out that Sunday. Returns yyyy-mm-dd calendar days (as the date pickers and
 * `/search` URLs use), computed from `today`'s local calendar date — not a UTC stay date.
 */
export function defaultWeekendStay(today: Date, weeksAhead = 3): { checkIn: string; checkOut: string } {
  const earliest = addDays(today, weeksAhead * 7);
  const friday = isFriday(earliest) ? earliest : nextFriday(earliest);
  return { checkIn: format(friday, "yyyy-MM-dd"), checkOut: format(addDays(friday, 2), "yyyy-MM-dd") };
}
