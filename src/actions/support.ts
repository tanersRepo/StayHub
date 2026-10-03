"use server";

import { headers } from "next/headers";
import { currentUser } from "@/lib/auth";
import { buildSupportEmail, sendSupportEmail } from "@/lib/support";
import { supportMessageSchema, type SupportMessageInput } from "@/lib/validators/support";
import type { ActionResult } from "@/actions/properties";

/**
 * Per-IP limit on support messages. In memory, so it resets on restart and isn't shared between
 * server instances — enough to stop casual spam on a single server.
 */
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;
const recent = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= LIMIT) {
    recent.set(ip, hits);
    return true;
  }
  recent.set(ip, [...hits, now]);
  return false;
}

/** The support widget's form: emails the message to the StayHub team, Reply-To the user. */
export async function sendSupportMessage(input: SupportMessageInput): Promise<ActionResult> {
  const parsed = supportMessageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // A bot filled the hidden field: pretend it worked so it doesn't retry.
  if (parsed.data.website) return { success: true };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (rateLimited(ip)) return { error: "You've sent several messages just now. Please wait a few minutes." };

  const user = await currentUser();
  const email = buildSupportEmail(parsed.data, user ? { id: user.id, name: user.name, role: user.role } : null);
  const sent = await sendSupportEmail(email);
  return sent.ok ? { success: true } : { error: sent.error };
}
