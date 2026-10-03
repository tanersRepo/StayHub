import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Bath, BedDouble, Check, MapPin, Star, Users } from "lucide-react";
import { db } from "@/lib/db";
import { formatPrice, toDisplay } from "@/lib/currency";
import { getDisplayMoney } from "@/lib/currency-server";
import { loadOverrides, startingPrices, unpricedAhead } from "@/lib/rates";
import { AMENITY_LABEL, PROPERTY_TYPE_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookingWidget } from "@/components/booking-widget";
import { PropertyLocation } from "@/components/property-location";
import { PropertyGallery } from "@/components/property-gallery";
import { RoomPhotos } from "@/components/room-photos";
import { LightboxStateProvider } from "@/components/lightbox-state";
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

  const [user, display, overrides, starting, ...soldOutLists] = await Promise.all([
    currentUser(),
    getDisplayMoney(),
    // Host-set prices per night from today on; the widget prices any stay from these + the default.
    loadOverrides(p.roomTypes.map((r) => r.id), new Date(), null),
    startingPrices(p.roomTypes),
    ...p.roomTypes.map((r) => unavailableNights(r.id)),
  ]);
  // Nights a guest can't pick: sold out or blocked, plus — for rooms with no default price — any
  // night the host hasn't priced yet.
  const unavailable = Object.fromEntries(
    p.roomTypes.map((r, i) => [
      r.id,
      [
        ...soldOutLists[i].map((d) => d.toISOString().slice(0, 10)),
        ...unpricedAhead({ base: r.pricePerNight, overrides: overrides.get(r.id) }),
      ],
    ]),
  );

  // Hero gallery shows general property photos; fall back to room photos if the host only uploaded those.
  const general = p.media.filter((m) => m.roomTypeId === null);
  const gallery = general.length ? general : p.media;
  const roomPhotos = (roomTypeId: string) => p.media.filter((m) => m.roomTypeId === roomTypeId);

  const hasLocation = p.lat !== null && p.lng !== null;
  const roomFrom = p.roomTypes.map((r) => starting.get(r.id)).filter((x): x is number => x != null);
  const fromPrice = roomFrom.length ? Math.min(...roomFrom) : null;

  const amenities: string[] = JSON.parse(p.amenities);
  const rating = p.reviews.length
    ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
    : null;

  return (
    <LightboxStateProvider>
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

      {/* Gallery, with the location mini map alongside it (as long as we geocoded the address) */}
      <div className="grid gap-2 lg:grid-cols-4">
        <PropertyGallery
          photos={gallery}
          title={p.title}
          className={hasLocation ? "lg:col-span-3" : "lg:col-span-4"}
        />
        {hasLocation && (
          <PropertyLocation
            pin={{
              id: p.id,
              title: p.title,
              lat: p.lat!,
              lng: p.lng!,
              fromPrice: fromPrice === null ? null : toDisplay(fromPrice, p.currency, display).amount,
              currency: fromPrice === null ? p.currency : toDisplay(fromPrice, p.currency, display).currency,
            }}
            address={`${p.address}, ${p.city}, ${p.country}`}
            className="aspect-[4/3] lg:aspect-auto"
          />
        )}
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
                      {starting.get(r.id) == null ? (
                        <p className="text-sm text-muted-foreground">No dates available yet</p>
                      ) : (
                        <>
                          <p className="text-lg font-semibold">
                            {Object.keys(overrides.get(r.id) ?? {}).length > 0 && <span className="text-sm font-normal text-muted-foreground">from </span>}
                            {formatPrice(starting.get(r.id)!, p.currency, display)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            per night{Object.keys(overrides.get(r.id) ?? {}).length > 0 && ", varies by date"}
                          </p>
                        </>
                      )}
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
            roomTypes={p.roomTypes.map((r) => ({
              id: r.id,
              name: r.name,
              pricePerNight: r.pricePerNight,
              fromPrice: starting.get(r.id) ?? null,
              overrides: overrides.get(r.id) ?? {},
              maxGuests: r.maxGuests,
              quantity: r.quantity,
            }))}
            unavailable={unavailable}
            rules={p.pricingRules}
            minNights={p.minNights}
            currency={p.currency}
            display={display}
            loggedIn={!!user}
            initial={{ checkIn: first(sp.checkIn), checkOut: first(sp.checkOut), guests: Number(first(sp.guests)) || undefined }}
          />
        </div>
      </div>
    </div>
    </LightboxStateProvider>
  );
}
