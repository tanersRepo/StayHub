"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES, CURRENCY_LABEL, type Currency } from "@/lib/currency";
import { setDisplayCurrency } from "@/actions/currency";

/** Header "USD ▾" menu: which currency guests see prices in. */
export function CurrencySwitcher({ current }: { current: Currency }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(c: Currency) {
    if (c === current) return;
    start(async () => {
      const res = await setDisplayCurrency(c);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      // A price filter in the URL is in the old currency; drop it rather than silently reinterpret it.
      const url = new URL(window.location.href);
      if (url.searchParams.has("minPrice") || url.searchParams.has("maxPrice")) {
        url.searchParams.delete("minPrice");
        url.searchParams.delete("maxPrice");
        router.replace(`${url.pathname}${url.search}`);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" disabled={pending} aria-label={`Currency: ${CURRENCY_LABEL[current].name}`}>
          {current}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Show prices in</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CURRENCIES.map((c) => (
          <DropdownMenuItem key={c} onSelect={() => choose(c)} className="justify-between">
            <span>
              <span className="font-medium">{c}</span>{" "}
              <span className="text-muted-foreground">
                {CURRENCY_LABEL[c].symbol} {CURRENCY_LABEL[c].name}
              </span>
            </span>
            {c === current && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
