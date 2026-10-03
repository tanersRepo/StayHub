import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

/** Longest run of nights a host can change in one go. */
export const MAX_RANGE_NIGHTS = 366;

/** A run of nights, `from` through `to` inclusive (both are nights, yyyy-mm-dd). */
const nightRange = z
  .object({ roomTypeId: z.string().min(1), from: isoDate, to: isoDate })
  .refine((v) => v.from <= v.to, { message: "The end date must be on or after the start date" });

export const setNightlyPriceSchema = nightRange.and(
  z.object({
    /** Whole units in the listing currency, or null to go back to the base price. */
    price: z.number().int("Use a whole amount, without cents").positive("Price must be positive").max(100000).nullable(),
  }),
);
export type SetNightlyPriceInput = z.infer<typeof setNightlyPriceSchema>;

export const setBlockedNightsSchema = nightRange.and(z.object({ blocked: z.boolean() }));
export type SetBlockedNightsInput = z.infer<typeof setBlockedNightsSchema>;

export const setDefaultPriceSchema = z.object({
  roomTypeId: z.string().min(1),
  /** Whole units in the listing currency; null = no default (only priced dates can be booked). */
  price: z.number().int("Use a whole amount, without cents").positive("Price must be positive").max(100000).nullable(),
});
export type SetDefaultPriceInput = z.infer<typeof setDefaultPriceSchema>;
