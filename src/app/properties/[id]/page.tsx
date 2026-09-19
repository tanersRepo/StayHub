import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Bath, BedDouble, Check, MapPin, Star, Users } from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { AMENITY_LABEL, PROPERTY_TYPE_LABEL } from "@/lib/properties";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const p = await db.property.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      host: { select: { name: true, createdAt: true } },
      images: { orderBy: { order: "asc" } },
      roomTypes: { orderBy: { order: "asc" } },
      reviews: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!p) notFound();

  const amenities: string[] = JSON.parse(p.amenities);
  const rating = p.reviews.length
    ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
    : null;
  const fromPrice = Math.min(...p.roomTypes.map((r) => r.pricePerNight));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4">
        <Badge variant="secondary">{PROPERTY_TYPE_LABEL[p.type] ?? p.type}</Badge>
        <h1 className="mt-2 text-3xl font-bold">{p.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {rating !== null && (
            <span className="flex items-center gap-1 text-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)} · {p.reviews.length} reviews
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="size-4" />
            {p.address}, {p.city}, {p.country}
          </span>
        </div>
      </div>

      {/* Gallery */}
      <div className="grid gap-2 overflow-hidden rounded-2xl md:grid-cols-4 md:grid-rows-2">
        {p.images.slice(0, 5).map((img, i) => (
          <div
            key={img.id}
            className={`relative bg-muted ${i === 0 ? "aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto" : "aspect-[4/3]"}`}
          >
            <Image src={img.url} alt="" fill sizes="50vw" className="object-cover" priority={i === 0} />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback>{p.host.name?.[0] ?? "H"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">Hosted by {p.host.name}</p>
              <p className="text-sm text-muted-foreground">
                Host since {format(p.host.createdAt, "MMMM yyyy")}
              </p>
            </div>
          </div>
          <Separator />
          <p className="leading-relaxed">{p.description}</p>
          <Separator />
          <div>
            <h2 className="mb-3 text-xl font-semibold">Amenities</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {amenities.map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  {AMENITY_LABEL[a] ?? a}
                </li>
              ))}
            </ul>
          </div>
          <Separator />
          <div>
            <h2 className="mb-3 text-xl font-semibold">Rooms & rates</h2>
            <div className="space-y-3">
              {p.roomTypes.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex-row flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="size-4" />{r.maxGuests} guests</span>
                        <span className="flex items-center gap-1"><BedDouble className="size-4" />{r.beds} beds</span>
                        <span className="flex items-center gap-1"><Bath className="size-4" />{r.bathrooms} bath</span>
                        {r.quantity > 1 && <span>{r.quantity} available</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatMoney(r.pricePerNight, p.currency)}</p>
                      <p className="text-xs text-muted-foreground">per night</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <h2 className="mb-3 text-xl font-semibold">Reviews</h2>
            {p.reviews.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {p.reviews.map((r) => (
                <div key={r.id} className="rounded-xl border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{r.author.name}</span>
                    <span className="flex items-center gap-1 text-sm">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      {r.rating}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking widget placeholder — Phase 3 wires dates + room selection */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>
                <span className="text-2xl">{formatMoney(fromPrice, p.currency)}</span>
                <span className="text-sm font-normal text-muted-foreground"> / night</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p>Add date</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p>Add date</p>
                </div>
              </div>
              <Button className="w-full" size="lg">
                Reserve
              </Button>
              <p className="text-center text-xs text-muted-foreground">You won&apos;t be charged yet</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
