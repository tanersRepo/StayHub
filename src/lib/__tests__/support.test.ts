import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSupportEmail, sendSupportEmail } from "../support";
import { supportMessageSchema } from "../validators/support";

const input = { email: "ana@example.com", message: "Can I check in early on Friday?\nWe land at 9am.", pageUrl: "http://localhost:3000/properties/abc" };
const email = buildSupportEmail(input, { id: "u1", name: "Ana", role: "GUEST" }, new Date("2026-10-03T12:00:00Z"));

describe("supportMessageSchema", () => {
  it("accepts a normal message", () => {
    expect(supportMessageSchema.safeParse(input).success).toBe(true);
  });
  it("rejects a bad email", () => {
    const r = supportMessageSchema.safeParse({ ...input, email: "not-an-email" });
    expect(r.success).toBe(false);
  });
  it("rejects a message that's too short", () => {
    const r = supportMessageSchema.safeParse({ ...input, message: "help" });
    expect(r.success).toBe(false);
  });
});

describe("buildSupportEmail", () => {
  it("uses the first line as the subject and replies to the user", () => {
    expect(email.subject).toBe("StayHub support: Can I check in early on Friday?");
    expect(email.replyTo).toBe("ana@example.com");
  });
  it("includes the message, sender, account and page", () => {
    expect(email.text).toContain("We land at 9am.");
    expect(email.text).toContain("From: ana@example.com");
    expect(email.text).toContain("Account: Ana · GUEST · u1");
    expect(email.text).toContain("Page: http://localhost:3000/properties/abc");
  });
  it("shortens long subjects and handles logged-out users", () => {
    const e = buildSupportEmail({ ...input, message: "x".repeat(100) }, null);
    expect(e.subject.length).toBeLessThanOrEqual("StayHub support: ".length + 58);
    expect(e.text).toContain("Account: not logged in");
  });
});

describe("sendSupportEmail", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SUPPORT_TO_EMAIL", "owner@example.com");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("posts to Resend with the owner as recipient and the user as Reply-To", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendSupportEmail(email)).toEqual({ ok: true, delivered: "email" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.reply_to).toBe("ana@example.com");
    expect(body.subject).toBe(email.subject);
  });

  it("reports failure on an HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad key", { status: 401 }));
    expect((await sendSupportEmail(email)).ok).toBe(false);
  });

  it("reports failure on a network error or timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    expect((await sendSupportEmail(email)).ok).toBe(false);
  });

  it("logs instead of sending when not configured (outside production)", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(await sendSupportEmail(email)).toEqual({ ok: true, delivered: "console" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses when not configured in production", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await sendSupportEmail(email)).ok).toBe(false);
  });
});
