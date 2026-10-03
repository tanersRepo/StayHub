import type { SupportMessageInput } from "@/lib/validators/support";

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "StayHub Support <onboarding@resend.dev>";

/** Who wrote in, when they're logged in. */
export interface SupportSender {
  id: string;
  name?: string | null;
  role?: string | null;
}

export interface SupportEmail {
  subject: string;
  text: string;
  replyTo: string;
}

/** Subject (from the message's first line) and plain-text body of a support message. Pure. */
export function buildSupportEmail(input: SupportMessageInput, user: SupportSender | null, now = new Date()): SupportEmail {
  const firstLine = input.message.split("\n").find((l) => l.trim())?.trim() ?? "New message";
  const summary = firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
  const lines = [
    input.message.trim(),
    "",
    "—",
    `From: ${input.email}`,
    user ? `Account: ${user.name ?? "(no name)"} · ${user.role ?? "GUEST"} · ${user.id}` : "Account: not logged in",
    input.pageUrl ? `Page: ${input.pageUrl}` : null,
    `Sent: ${now.toISOString()}`,
    "",
    "Reply to this email to answer them directly.",
  ];
  return {
    subject: `StayHub support: ${summary}`,
    text: lines.filter((l) => l !== null).join("\n"),
    replyTo: input.email,
  };
}

export type SendResult = { ok: true; delivered: "email" | "console" } | { ok: false; error: string };

/**
 * Email a support message to SUPPORT_TO_EMAIL via Resend, with Reply-To set to the user. Without
 * RESEND_API_KEY it logs the message in development (so the widget can be tried) and refuses in
 * production rather than pretend to send.
 */
export async function sendSupportEmail(email: SupportEmail): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUPPORT_TO_EMAIL;
  if (!apiKey || !to) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[support] RESEND_API_KEY / SUPPORT_TO_EMAIL not set — message not emailed:\n${email.subject}\n${email.text}`);
      return { ok: true, delivered: "console" };
    }
    console.error("[support] RESEND_API_KEY or SUPPORT_TO_EMAIL is not set");
    return { ok: false, error: "Support messages aren't set up yet. Please try again later." };
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.SUPPORT_FROM_EMAIL || DEFAULT_FROM,
        to: [to],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
      }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[support] Resend returned ${res.status}: ${await res.text().catch(() => "")}`);
      return { ok: false, error: "We couldn't send your message. Please try again in a moment." };
    }
    return { ok: true, delivered: "email" };
  } catch (err) {
    console.error(`[support] sending failed: ${(err as Error).message}`);
    return { ok: false, error: "We couldn't send your message. Please try again in a moment." };
  }
}
