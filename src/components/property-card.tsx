import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/pricing";
import { PROPERTY_TYPE_LABEL, type PropertyCardData } from "@/lib/properties";

export function PropertyCard({ p }: { p: PropertyCardData }) {
  return (
    <Link href={`/properties/${p.id}`} className="group block">
      <Card className="overflow-hidden p-0 transition-shadow group-hover:shadow-lg">
        <div className="relative aspect-[4/3] bg-muted">
          {p.coverUrl && (
            <Image
              src={p.coverUrl}
              alt={p.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          <Badge variant="secondary" className="absolute left-2 top-2">
            {PROPERTY_TYPE_LABEL[p.type] ?? p.type}
          </Badge>
        </div>
        <div className="space-y-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-medium">{p.title}</h3>
            {p.rating !== null && (
              <span className="flex shrink-0 items-center gap-1 text-sm">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {p.rating.toFixed(1)}
                <span className="text-muted-foreground">({p.ratingCount})</span>
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {p.city}, {p.country}
          </p>
          {p.fromPrice !== null && (
            <p className="pt-1 text-sm">
              <span className="font-semibold">{formatMoney(p.fromPrice, p.currency)}</span>
              <span className="text-muted-foreground"> / night</span>
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
