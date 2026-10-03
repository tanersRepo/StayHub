"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteProperty, setPropertyStatus } from "@/actions/properties";

interface Props {
  propertyId: string;
  status: string;
  /** What a draft still needs before it can be published. */
  checks: { label: string; ok: boolean; href?: string; optional?: boolean }[];
}

/** Top of the Details tab: whether the listing is live, a link to it, and publish/unpublish. */
export function ListingStatus({ propertyId, status, checks }: Props) {
  const [pending, start] = useTransition();
  const ready = checks.every((c) => c.ok || c.optional);
  const published = status === "PUBLISHED";

  function toggle() {
    start(async () => {
      const res = await setPropertyStatus(propertyId, published ? "DRAFT" : "PUBLISHED");
      if (res.error) toast.error(res.error);
      else toast.success(published ? "Listing unpublished. Guests can no longer see or book it." : "Listing is live!");
    });
  }

  return (
    <section className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Listing status</h2>
          <Badge variant={published ? "default" : "outline"}>{published ? "Published" : "Draft"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {published ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/properties/${propertyId}`} target="_blank">
                View listing <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Guests can see it once it&apos;s published</span>
          )}
          <Button size="sm" variant={published ? "outline" : "default"} onClick={toggle} disabled={pending || (!published && !ready)}>
            {published ? "Unpublish" : "Publish listing"}
          </Button>
        </div>
      </div>

      {!published && (
        <ul className="space-y-2 border-t pt-4">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              {c.ok ? <CheckCircle2 className="size-4 text-green-600" /> : <Circle className="size-4 text-muted-foreground" />}
              {c.href && !c.ok ? <Link href={c.href} className="underline">{c.label}</Link> : c.label}
              {c.optional && !c.ok && <span className="text-xs text-muted-foreground">(optional — map pin will be missing)</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Bottom of the Details tab: permanently remove the listing. */
export function DeleteListing({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm("Remove this listing permanently? This can't be undone.")) return;
    start(async () => {
      const res = await deleteProperty(propertyId);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-destructive/40 p-4">
      <div>
        <h2 className="font-semibold">Remove listing</h2>
        <p className="text-sm text-muted-foreground">
          Deletes the listing with its rooms, photos and prices. To hide it for a while instead, unpublish it above.
          Listings with upcoming bookings can&apos;t be removed.
        </p>
      </div>
      <Button variant="destructive" onClick={remove} disabled={pending}>
        Remove listing
      </Button>
    </section>
  );
}
