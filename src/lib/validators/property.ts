import { z } from "zod";

export const PROPERTY_TYPES = ["HOTEL", "APARTMENT", "HOUSE", "ROOM"] as const;

export const AMENITIES = [
  "wifi",
  "kitchen",
  "air_conditioning",
  "washer",
  "parking",
  "pool",
  "gym",
  "breakfast",
  "pets_allowed",
  "workspace",
] as const;

export const propertyBasicsSchema = z.object({
  title: z.string().trim().min(5, "Title is too short").max(100),
  type: z.enum(PROPERTY_TYPES),
  description: z.string().trim().min(20, "Describe the place in at least 20 characters").max(3000),
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  currency: z.string().length(3).default("USD"),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM").default("15:00"),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM").default("11:00"),
  amenities: z.array(z.enum(AMENITIES)).default([]),
});
export type PropertyBasicsInput = z.infer<typeof propertyBasicsSchema>;

export const roomTypeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).default(""),
  /** Major units in the form (e.g. 95.00); converted to cents in the action. */
  price: z.coerce.number().positive("Price must be positive").max(100000),
  maxGuests: z.coerce.number().int().min(1).max(30),
  bedrooms: z.coerce.number().int().min(0).max(30),
  beds: z.coerce.number().int().min(1).max(60),
  bathrooms: z.coerce.number().int().min(1).max(30),
  quantity: z.coerce.number().int().min(1, "At least one unit").max(500),
});
export type RoomTypeInput = z.infer<typeof roomTypeSchema>;

export const pricingRulesSchema = z.object({
  minNights: z.coerce.number().int().min(1).max(365),
  rules: z
    .array(
      z.object({
        minNights: z.coerce.number().int().min(2, "Tier must be at least 2 nights").max(365),
        discountPercent: z.coerce.number().int().min(1).max(90),
      }),
    )
    .max(10)
    .refine((rules) => new Set(rules.map((r) => r.minNights)).size === rules.length, {
      message: "Each tier needs a different number of nights",
    }),
});
export type PricingRulesInput = z.infer<typeof pricingRulesSchema>;
