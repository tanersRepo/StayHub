import { differenceInCalendarDays } from "date-fns";

/** Service fee charged to guests, as a fraction of the nightly subtotal. */
export const SERVICE_FEE_RATE = 0.1;

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return differenceInCalendarDays(checkOut, checkIn);
}

export interface PriceBreakdown {
  nights: number;
  pricePerNight: number;
  subtotal: number;
  serviceFee: number;
  total: number;
}

/** All amounts in minor units (cents). */
export function calculatePrice(
  pricePerNight: number,
  checkIn: Date,
  checkOut: Date,
): PriceBreakdown {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) throw new Error("Check-out must be after check-in");
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  return { nights, pricePerNight, subtotal, serviceFee, total: subtotal + serviceFee };
}

export function formatMoney(minor: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}
