import { z } from "zod";

export const distanceQuerySchema = z.object({
  propertyId: z.string().min(1),
  query: z.string().trim().min(2, "Type a place, address or landmark").max(200),
  /** A suggestion the guest picked: use its exact position instead of looking the text up again. */
  place: z
    .object({
      label: z.string().trim().min(1).max(200),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export const placeSuggestSchema = z.object({
  propertyId: z.string().min(1),
  query: z.string().trim().min(2).max(200),
});
export type PlaceSuggestInput = z.infer<typeof placeSuggestSchema>;
export type DistanceQueryInput = z.infer<typeof distanceQuerySchema>;
