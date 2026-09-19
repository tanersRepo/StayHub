"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { checkAvailability, toUtcDay } from "@/lib/availability";
import { calculatePrice, nightsBetween } from "@/lib/pricing";
import { parseStayRange } from "@/lib/search";
import { createBookingSchema, reviewSchema, type CreateBookingInput, type ReviewInput } from "@/lib/validators/booking";

export type BookingResult = { error?: string; success?: boolean };

/**
 * Creates a PENDING booking. Availability is re-checked inside the transaction so two guests
 * cannot both grab the last unit. Price is computed server-side from the room rate + property rules.
 */
export async function createBooking(input: CreateBookingInput): Promise<BookingResult> {
  const user = await requireUser();
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const range = parseStayRange(parsed.data.checkIn, parsed.data.checkOut);
  if (!range) return { error: "Check-out must be after check-in" };
  if (range.checkIn < toUtcDay(new Date())) return { error: "Check-in date is in the past" };

  const roomType = await db.roomType.findUnique({
    where: { id: parsed.data.roomTypeId },
    include: { property: { include: { pricingRules: true } } },
  });
  if (!roomType || roomType.property.status !== "PUBLISHED") return { error: "This room is not available" };
  if (roomType.property.hostId === user.id) return { error: "You cannot book your own property" };
  if (parsed.data.guests > roomType.maxGuests) return { error: `This room sleeps at most ${roomType.maxGuests} guests` };
  const nights = nightsBetween(range.checkIn, range.checkOut);
  if (nights < roomType.property.minNights) {
    return { error: `Minimum stay is ${roomType.property.minNights} nights` };
  }

  const price = calculatePrice(roomType.pricePerNight, range.checkIn, range.checkOut, roomType.property.pricingRules);

  let bookingId: string;
  try {
    bookingId = await db.$transaction(async (tx) => {
      const free = await checkAvailability(roomType.id, range, tx);
      if (!free) throw new Error("SOLD_OUT");
      const booking = await tx.booking.create({
        data: {
          propertyId: roomType.propertyId,
          roomTypeId: roomType.id,
          guestId: user.id,
          checkIn: range.checkIn,
          checkOut: range.checkOut,
          guests: parsed.data.guests,
          nights,
          totalAmount: price.total,
          status: "PENDING",
        },
      });
      return booking.id;
    });
  } catch (err) {
    if ((err as Error).message === "SOLD_OUT") return { error: "Sorry — those dates were just taken. Pick different dates." };
    throw err;
  }
  redirect(`/bookings/${bookingId}`);
}

/** Mock payment: records a Payment and confirms the booking. Stripe replaces this later. */
export async function payBooking(bookingId: string): Promise<BookingResult> {
  const user = await requireUser();
  const booking = await db.booking.findFirst({ where: { id: bookingId, guestId: user.id }, include: { payment: true } });
  if (!booking) return { error: "Booking not found" };
  if (booking.status !== "PENDING" || booking.payment) return { error: "This booking has already been processed" };

  await db.$transaction([
    db.payment.create({ data: { bookingId, amount: booking.totalAmount, provider: "MOCK", status: "PAID", providerRef: `mock_${Date.now()}` } }),
    db.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED" } }),
  ]);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/trips");
  redirect(`/bookings/${bookingId}?paid=1`);
}

export async function cancelBooking(bookingId: string): Promise<BookingResult> {
  const user = await requireUser();
  const booking = await db.booking.findFirst({ where: { id: bookingId, guestId: user.id } });
  if (!booking) return { error: "Booking not found" };
  if (!["PENDING", "CONFIRMED"].includes(booking.status)) return { error: "This booking cannot be cancelled" };
  if (booking.checkIn <= toUtcDay(new Date())) return { error: "Stays that have started cannot be cancelled" };

  await db.$transaction([
    db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } }),
    db.payment.updateMany({ where: { bookingId, status: "PAID" }, data: { status: "REFUNDED" } }),
  ]);
  revalidatePath("/trips");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function createReview(input: ReviewInput): Promise<BookingResult> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const booking = await db.booking.findFirst({
    where: { id: parsed.data.bookingId, guestId: user.id },
    include: { review: true },
  });
  if (!booking) return { error: "Booking not found" };
  if (booking.review) return { error: "You already reviewed this stay" };
  if (!["CONFIRMED", "COMPLETED"].includes(booking.status) || booking.checkOut > toUtcDay(new Date())) {
    return { error: "You can review a stay after check-out" };
  }

  await db.$transaction([
    db.review.create({
      data: { bookingId: booking.id, propertyId: booking.propertyId, authorId: user.id, rating: parsed.data.rating, comment: parsed.data.comment },
    }),
    db.booking.update({ where: { id: booking.id }, data: { status: "COMPLETED" } }),
  ]);
  revalidatePath("/trips");
  revalidatePath(`/properties/${booking.propertyId}`);
  return { success: true };
}
