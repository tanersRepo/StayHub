"use server";

import { cookies } from "next/headers";
import { CURRENCY_COOKIE, isCurrency } from "@/lib/currency";
import type { ActionResult } from "@/actions/properties";

/** Remember the guest's display currency. Next re-renders the current page with it. */
export async function setDisplayCurrency(currency: string): Promise<ActionResult> {
  if (!isCurrency(currency)) return { error: "Unsupported currency" };
  (await cookies()).set(CURRENCY_COOKIE, currency, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { success: true };
}
