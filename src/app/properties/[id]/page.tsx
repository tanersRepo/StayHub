import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Bath, BedDouble, Check, MapPin, Star, Users } from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { AMENITY_LABEL, PROPERTY_TYPE_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookingWidget } from "@/components/booking-widget";
import { currentUser } from "@/lib/auth";
import { unavailableNights } from "@/lib/availability";

export default async function PropertyPage({ params, searchParams }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const p = await db.property.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      host: { select: { name: true, createdAt: true } },
      media: { where: { kind: "IMAGE" }, orderBy: { order: "asc" } },
      roomTypes: { orderBy: { order: "asc" } },
      pricingRules: true,
      reviews: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!p) notFound();

  const [user, ...soldOutLists] = await Promise.all([
    currentUser(),
    ...p.roomTypes.map((r) => unavailableNights(r.id)),
  ]);
  const unavailable = Object.fromEntries(
    p.roomTypes.map((r, i) => [r.id, soldOutLists[i].map((d) => d.toISOString().slice(0, 10))]),
  );

  // Hero gallery shows general property photos; fall back to room photos if the host only uploaded those.
  const general = p.media.filter((m) => m.roomTypeId === null);
  const gallery = general.length ? general : p.media;
  const roomPhotos = (roomTypeId: string) => p.media.filter((m) => m.roomTypeId === roomTypeId);

  const amenities: string[] = JSON.parse(p.amenities);
  const rating = p.reviews.length
    ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
    : null;

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
        {gallery.slice(0, 5).map((img, i) => (
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
              {p.roomTypes.map((r) => {
                const photos = roomPhotos(r.id);
                return (
                <Card key={r.id}>
                  <CardContent className="flex-row flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      {photos.length > 0 && <RoomPhotos photos={photos} name={r.name} />}
                      <div>
                      <p className="font-medium">{r.name}</p>
                      {r.description && <p className="mb-1 text-sm text-muted-foreground">{r.description}</p>}
                      <p className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="size-4" />{r.maxGuests} guests</span>
                        <span className="flex items-center gap-1"><BedDouble className="size-4" />{r.beds} beds</span>
                        <span className="flex items-center gap-1"><Bath className="size-4" />{r.bathrooms} bath</span>
                        {r.quantity > 1 && <span>{r.quantity} available</span>}
                      </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatMoney(r.pricePerNight, p.currency)}</p>
                      <p className="text-xs text-muted-foreground">per night</p>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
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

        <div>
          <BookingWidget
            propertyId={p.id}
            roomTypes={p.roomTypes.map((r) => ({ id: r.id, name: r.name, pricePerNight: r.pricePerNight, maxGuests: r.maxGuests, quantity: r.quantity }))}
            unavailable={unavailable}
            rules={p.pricingRules}
            minNights={p.minNights}
            currency={p.currency}
            loggedIn={!!user}
            initial={{ checkIn: first(sp.checkIn), checkOut: first(sp.checkOut), guests: Number(first(sp.guests)) || undefined }}
          />
        </div>
      </div>
    </div>
  );
}

/** Cover photo of a room type plus a strip of up to 3 more thumbnails. */
function RoomPhotos({ photos, name }: { photos: { id: string; url: string }[]; name: string }) {
  const [cover, ...rest] = photos;
  return (
    <div className="flex shrink-0 gap-1">
      <div className="relative size-24 overflow-hidden rounded-lg bg-muted sm:size-28">
        <Image src={cover.url} alt={name} fill sizes="112px" className="object-cover" />
      </div>
      {rest.length > 0 && (
        <div className="hidden w-14 flex-col gap-1 sm:flex">
          {rest.slice(0, 3).map((ph, i) => (
            <div key={ph.id} className="relative flex-1 overflow-hidden rounded bg-muted">
              <Image src={ph.url} alt="" fill sizes="56px" className="object-cover" />
              {i === 2 && rest.length > 3 && (
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-medium text-white">
                  +{rest.length - 3}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
