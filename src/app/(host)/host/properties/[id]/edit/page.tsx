import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOwnedProperty } from "@/lib/host";
import { updatePropertyBasics } from "@/actions/properties";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyForm } from "@/components/host/property-form";
import { RoomTypeEditor } from "@/components/host/room-type-editor";
import { MediaUploader } from "@/components/host/media-uploader";
import { PricingRulesEditor } from "@/components/host/pricing-rules-editor";
import { DeleteListing, ListingStatus } from "@/components/host/listing-status";
import { PricingCalendar } from "@/components/host/pricing-calendar";
import { Button } from "@/components/ui/button";
import { loadCalendarNights } from "@/lib/host-calendar";
import { startingPrices } from "@/lib/rates";
import type { PropertyBasicsInput } from "@/lib/validators/property";

const TABS = ["details", "rooms", "media", "pricing"] as const;

export default async function EditPropertyPage({ params, searchParams }: PageProps<"/host/properties/[id]/edit">) {
  const { id } = await params;
  const { tab, room } = await searchParams;
  const { property } = await getOwnedProperty(id);
  const activeTab = TABS.includes(tab as (typeof TABS)[number]) ? (tab as string) : "details";

  const initial: PropertyBasicsInput = {
    title: property.title,
    type: property.type as PropertyBasicsInput["type"],
    description: property.description,
    address: property.address,
    city: property.city,
    country: property.country,
    currency: property.currency as PropertyBasicsInput["currency"],
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
    amenities: JSON.parse(property.amenities),
  };
  const editBase = `/host/properties/${property.id}/edit`;
  // Rooms are priced date by date in the Pricing tab's calendar; "from" is each room's lowest price.
  const from = await startingPrices(property.roomTypes);
  const priced = [...from.values()].filter((x): x is number => x != null);
  const cheapest = priced.length ? Math.min(...priced) : null;
  const pricingRoom = property.roomTypes.find((r) => r.id === room) ?? property.roomTypes[0];
  const calendarNights = pricingRoom ? await loadCalendarNights(pricingRoom.id) : {};
  const updateBasics = updatePropertyBasics.bind(null, property.id);
  // Photos of a room type are managed from the Rooms tab; the Media tab holds general property media.
  const generalMedia = property.media.filter((m) => m.roomTypeId === null);
  const roomTypes = property.roomTypes.map((rt) => ({
    ...rt,
    fromPrice: from.get(rt.id) ?? null,
    media: property.media.filter((m) => m.roomTypeId === rt.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/host/properties" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> All properties
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{property.title}</h1>
          <Badge variant={property.status === "PUBLISHED" ? "default" : "outline"}>{property.status}</Badge>
        </div>
      </div>

      {/* Keyed so following a link to another tab (e.g. a room's "Set prices") switches to it. */}
      <Tabs key={`${activeTab}:${room ?? ""}`} defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="rooms">Rooms ({property.roomTypes.length})</TabsTrigger>
          <TabsTrigger value="media">Media ({generalMedia.length})</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="max-w-3xl space-y-8 pt-4">
          <ListingStatus
            propertyId={property.id}
            status={property.status}
            checks={[
              { label: "Basic details and address", ok: true },
              { label: "At least one room type", ok: property.roomTypes.length > 0, href: `${editBase}?tab=rooms` },
              {
                label: "Every room has prices",
                ok: property.roomTypes.length > 0 && property.roomTypes.every((r) => from.get(r.id) != null),
                href: `${editBase}?tab=pricing`,
              },
              { label: "At least one photo", ok: property.media.some((m) => m.kind === "IMAGE"), href: `${editBase}?tab=media` },
              { label: "Location found on the map", ok: property.lat !== null, href: `${editBase}?tab=details`, optional: true },
            ]}
          />
          <PropertyForm initial={initial} submitLabel="Save changes" onSubmit={updateBasics} />
          <DeleteListing propertyId={property.id} />
        </TabsContent>

        <TabsContent value="rooms" className="pt-4">
          <RoomTypeEditor
            propertyId={property.id}
            propertyType={property.type}
            currency={property.currency}
            roomTypes={roomTypes}
          />
        </TabsContent>

        <TabsContent value="media" className="pt-4">
          <MediaUploader propertyId={property.id} media={generalMedia} />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-10 pt-4">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Prices by date</h2>
              <p className="text-sm text-muted-foreground">
                Pick dates on the calendar and give them a price. Guests can only book dates that have one.
              </p>
            </div>
            {!pricingRoom ? (
              <p className="text-sm text-muted-foreground">
                <Link href={`${editBase}?tab=rooms`} className="underline">Add a room type</Link> first, then price it here.
              </p>
            ) : (
              <>
                {property.roomTypes.length > 1 && (
                  <nav className="flex flex-wrap gap-2" aria-label="Room type">
                    {property.roomTypes.map((rt) => (
                      <Button key={rt.id} variant={rt.id === pricingRoom.id ? "default" : "outline"} size="sm" asChild>
                        <Link href={`${editBase}?tab=pricing&room=${rt.id}`}>
                          {rt.name}
                          {from.get(rt.id) == null && <span className="ml-1 text-xs opacity-70">(no prices)</span>}
                        </Link>
                      </Button>
                    ))}
                  </nav>
                )}
                <PricingCalendar
                  key={pricingRoom.id}
                  roomTypeId={pricingRoom.id}
                  basePrice={pricingRoom.pricePerNight}
                  currency={property.currency}
                  quantity={pricingRoom.quantity}
                  nights={calendarNights}
                />
              </>
            )}
          </section>

          <section className="space-y-4 border-t pt-8">
            <div>
              <h2 className="text-lg font-semibold">Long-stay discounts</h2>
              <p className="text-sm text-muted-foreground">Reward longer stays with a discount on the total.</p>
            </div>
          <PricingRulesEditor
            propertyId={property.id}
            currency={property.currency}
            minNights={property.minNights}
            rules={property.pricingRules.map((r) => ({ minNights: r.minNights, discountPercent: r.discountPercent }))}
            samplePrice={cheapest}
          />
          </section>
        </TabsContent>

      </Tabs>
    </div>
  );
}
