import { format } from "date-fns";

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
