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
  checks: { label: string; ok: boolean; href?: string; optional?: boolean }[];
}

export function PublishCard({ propertyId, status, checks }: Props) {
  const [pending, start] = useTransition();
  const ready = checks.every((c) => c.ok || c.optional);
  const published = status === "PUBLISHED";

  function toggle() {
    start(async () => {
      const res = await setPropertyStatus(propertyId, published ? "DRAFT" : "PUBLISHED");
      if (res.error) toast.error(res.error);
      else toast.success(published ? "Listing unpublished" : "Listing is live!");
    });
  }

  function remove() {
    if (!confirm("Delete this property? This cannot be undone.")) return;
    start(async () => {
      const res = await deleteProperty(propertyId);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status</span>
        <Badge variant={published ? "default" : "outline"}>{status}</Badge>
        {published && (
          <Button variant="link" size="sm" asChild>
            <Link href={`/properties/${propertyId}`} target="_blank">
              View listing <ExternalLink className="size-3" />
            </Link>
          </Button>
        )}
      </div>

      <ul className="space-y-2 rounded-xl border p-4">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-sm">
            {c.ok ? <CheckCircle2 className="size-4 text-green-600" /> : <Circle className="size-4 text-muted-foreground" />}
            {c.href && !c.ok ? <Link href={c.href} className="underline">{c.label}</Link> : c.label}
            {c.optional && !c.ok && <span className="text-xs text-muted-foreground">(optional — map pin will be missing)</span>}
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <Button onClick={toggle} disabled={pending || (!published && !ready)}>
          {published ? "Unpublish" : "Publish listing"}
        </Button>
        <Button variant="destructive" onClick={remove} disabled={pending}>
          Delete property
        </Button>
      </div>
    </div>
  );
}
