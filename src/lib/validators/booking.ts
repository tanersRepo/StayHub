import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const createBookingSchema = z.object({
  roomTypeId: z.string().min(1),
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.coerce.number().int().min(1).max(30),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10, "Tell others a bit more (10+ characters)").max(2000),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
