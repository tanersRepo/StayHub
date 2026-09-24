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
import { PublishCard } from "@/components/host/publish-card";
import type { PropertyBasicsInput } from "@/lib/validators/property";

const TABS = ["details", "rooms", "media", "pricing", "publish"] as const;

export default async function EditPropertyPage({ params, searchParams }: PageProps<"/host/properties/[id]/edit">) {
  const { id } = await params;
  const { tab } = await searchParams;
  const { property } = await getOwnedProperty(id);
  const activeTab = TABS.includes(tab as (typeof TABS)[number]) ? (tab as string) : "details";

  const initial: PropertyBasicsInput = {
    title: property.title,
    type: property.type as PropertyBasicsInput["type"],
    description: property.description,
    address: property.address,
    city: property.city,
    country: property.country,
    currency: property.currency,
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
    amenities: JSON.parse(property.amenities),
  };
  const editBase = `/host/properties/${property.id}/edit`;
  const cheapest = property.roomTypes.length ? Math.min(...property.roomTypes.map((r) => r.pricePerNight)) : null;
  const updateBasics = updatePropertyBasics.bind(null, property.id);
  // Photos of a room type are managed from the Rooms tab; the Media tab holds general property media.
  const generalMedia = property.media.filter((m) => m.roomTypeId === null);
  const roomTypes = property.roomTypes.map((rt) => ({
    ...rt,
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

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="rooms">Rooms ({property.roomTypes.length})</TabsTrigger>
          <TabsTrigger value="media">Media ({generalMedia.length})</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="max-w-3xl pt-4">
          <PropertyForm initial={initial} submitLabel="Save changes" onSubmit={updateBasics} />
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

        <TabsContent value="pricing" className="pt-4">
          <PricingRulesEditor
            propertyId={property.id}
            currency={property.currency}
            minNights={property.minNights}
            rules={property.pricingRules.map((r) => ({ minNights: r.minNights, discountPercent: r.discountPercent }))}
            samplePrice={cheapest}
          />
        </TabsContent>

        <TabsContent value="publish" className="pt-4">
          <PublishCard
            propertyId={property.id}
            status={property.status}
            checks={[
              { label: "Basic details and address", ok: true },
              { label: "At least one room type", ok: property.roomTypes.length > 0, href: `${editBase}?tab=rooms` },
              { label: "At least one photo", ok: property.media.some((m) => m.kind === "IMAGE"), href: `${editBase}?tab=media` },
              { label: "Location found on the map", ok: property.lat !== null, href: `${editBase}?tab=details`, optional: true },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
