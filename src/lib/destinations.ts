/** A place guests can search for, with how many published stays it has. Client-safe (no DB). */
export interface Destination {
  city: string;
  country: string;
  count: number;
}

/** Lower-case and strip accents, so "sao" finds "São Paulo" and "LIS" finds "Lisbon". */
function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/**
 * Rank destinations for an autocomplete query. Best first: city starts with the query, then a
 * later word of the city does ("york" → "New York"), then the country does, then a plain
 * substring match. Ties go to the destination with more stays, then alphabetical.
 */
export function rankDestinations(all: Destination[], query: string, limit = 6): Destination[] {
  const q = normalize(query);
  if (!q) return [];
  const score = (d: Destination): number => {
    const city = normalize(d.city);
    const country = normalize(d.country);
    if (city.startsWith(q)) return 0;
    if (city.split(/[\s-]+/).some((w) => w.startsWith(q))) return 1;
    if (country.startsWith(q)) return 2;
    if (city.includes(q) || country.includes(q)) return 3;
    return -1;
  };
  return all
    .map((d) => ({ d, s: score(d) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || b.d.count - a.d.count || a.d.city.localeCompare(b.d.city))
    .slice(0, limit)
    .map((x) => x.d);
}
