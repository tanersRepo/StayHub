"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculatePrice, formatMoney } from "@/lib/pricing";
import { savePricingRules } from "@/actions/pricing";

interface Tier {
  minNights: number;
  discountPercent: number;
}

interface Props {
  propertyId: string;
  currency: string;
  minNights: number;
  rules: Tier[];
  /** Cheapest nightly rate, used for the live example. */
  samplePrice: number | null;
}

export function PricingRulesEditor({ propertyId, currency, minNights: initialMin, rules: initialRules, samplePrice }: Props) {
  const [minNights, setMinNights] = useState(initialMin);
  const [rules, setRules] = useState<Tier[]>(initialRules);
  const [exampleNights, setExampleNights] = useState(10);
  const [pending, start] = useTransition();

  const sorted = [...rules].sort((a, b) => a.minNights - b.minNights);
  const example =
    samplePrice !== null && exampleNights > 0
      ? calculatePrice(samplePrice, new Date(0), new Date(exampleNights * 86_400_000), rules)
      : null;

  function update(i: number, patch: Partial<Tier>) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function save() {
    start(async () => {
      const res = await savePricingRules(propertyId, { minNights, rules });
      if (res.error) toast.error(res.error);
      else toast.success("Pricing rules saved");
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <div>
          <Label className="mb-2 block">Minimum stay (nights)</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={minNights}
            onChange={(e) => setMinNights(Number(e.target.value))}
            className="w-32"
          />
          <p className="mt-1 text-xs text-muted-foreground">Guests can&apos;t book fewer nights than this.</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Length-of-stay discounts</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRules((p) => [...p, { minNights: (p.at(-1)?.minNights ?? 3) + 4, discountPercent: 10 }])}
              disabled={rules.length >= 10}
            >
              <Plus className="size-4" /> Add tier
            </Button>
          </div>
          {rules.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No discounts yet. Add a tier like &ldquo;7+ nights → 10 % off&rdquo; to encourage longer stays.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stays of at least</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={2} max={365} value={r.minNights} onChange={(e) => update(i, { minNights: Number(e.target.value) })} className="w-24" />
                        <span className="text-sm text-muted-foreground">nights</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} max={90} value={r.discountPercent} onChange={(e) => update(i, { discountPercent: Number(e.target.value) })} className="w-24" />
                        <span className="text-sm text-muted-foreground">% off</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" aria-label="Remove tier" onClick={() => setRules((p) => p.filter((_, idx) => idx !== i))}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            The highest tier a stay reaches is applied. Discounts apply to the nightly subtotal before the guest service fee.
          </p>
        </div>

        <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save pricing"}</Button>
      </div>

      {/* Live example */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border bg-muted/30 p-5">
          <p className="mb-3 font-medium">Live example</p>
          {samplePrice === null ? (
            <p className="text-sm text-muted-foreground">Add a room type to see an example.</p>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 text-sm">
                <span>A stay of</span>
                <Input type="number" min={1} max={365} value={exampleNights} onChange={(e) => setExampleNights(Number(e.target.value))} className="w-20" />
                <span>nights at {formatMoney(samplePrice, currency)}</span>
              </div>
              {example && (
                <dl className="space-y-1.5 text-sm">
                  <Row label={`${formatMoney(samplePrice, currency)} × ${example.nights} nights`} value={formatMoney(example.subtotal, currency)} />
                  {example.discount > 0 && (
                    <Row label={`Long-stay discount (${example.discountPercent}%)`} value={`− ${formatMoney(example.discount, currency)}`} className="text-green-700 dark:text-green-400" />
                  )}
                  <Row label="Guest service fee (10%)" value={formatMoney(example.serviceFee, currency)} />
                  <Row label="Guest pays" value={formatMoney(example.total, currency)} className="border-t pt-2 font-semibold" />
                  <Row label="You receive" value={formatMoney(example.subtotal - example.discount, currency)} className="text-muted-foreground" />
                </dl>
              )}
              {sorted.length > 0 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Tiers: {sorted.map((r) => `${r.minNights}+ nights → ${r.discountPercent}%`).join(" · ")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between gap-4 ${className ?? ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
