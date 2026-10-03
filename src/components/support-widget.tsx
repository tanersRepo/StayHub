"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sendSupportMessage } from "@/actions/support";

/**
 * Chat bubble fixed to the bottom-right of every page. Opens a small form whose message is
 * emailed to the StayHub team (see `sendSupportMessage`), with Reply-To set to the user's email.
 */
export function SupportWidget({ userEmail }: { userEmail?: string | null }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(userEmail ?? "");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await sendSupportMessage({ email, message, website, pageUrl: window.location.href });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setSentTo(email);
      setMessage("");
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          aria-label={open ? "Close support chat" : "Contact support"}
          className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-lg"
        >
          {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={12} className="w-[calc(100vw-2rem)] p-0 sm:w-96">
        <div className="rounded-t-lg bg-primary px-4 py-3 text-primary-foreground">
          <p className="font-semibold">Questions? We&apos;re here to help.</p>
          <p className="text-sm opacity-80">Send us a message and we&apos;ll reply by email.</p>
        </div>

        {sentTo ? (
          <div className="space-y-3 p-4 text-center">
            <CheckCircle2 className="mx-auto size-10 text-green-600" />
            <p className="font-medium">Thanks, your message is on its way.</p>
            <p className="text-sm text-muted-foreground">We&apos;ll reply to {sentTo} as soon as we can.</p>
            <Button variant="outline" size="sm" onClick={() => setSentTo(null)}>
              Send another message
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 p-4">
            <div>
              <Label htmlFor="support-email" className="mb-1.5 block">Your email</Label>
              <Input
                id="support-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="support-message" className="mb-1.5 block">How can we help?</Label>
              <Textarea
                id="support-message"
                required
                minLength={10}
                maxLength={5000}
                rows={5}
                placeholder="Ask about a booking, your listing, payments…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {/* Honeypot: invisible to people, tempting to bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
