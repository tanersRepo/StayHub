import { z } from "zod";

export const supportMessageSchema = z.object({
  email: z.string().trim().email("Enter a valid email so we can reply"),
  message: z.string().trim().min(10, "Tell us a bit more (10+ characters)").max(5000, "Keep it under 5,000 characters"),
  /** Page the user was on when they wrote in. */
  pageUrl: z.string().max(500).optional(),
  /** Honeypot: hidden from people, so anything typed here came from a bot. */
  website: z.string().optional(),
});
export type SupportMessageInput = z.infer<typeof supportMessageSchema>;
