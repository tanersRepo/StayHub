"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireHost, requireUser } from "@/lib/auth";
import { assertOwnsProperty } from "@/lib/host";
import { geocodeAddress } from "@/lib/geocode";
import { propertyBasicsSchema, type PropertyBasicsInput } from "@/lib/validators/property";

export type ActionResult = { error?: string; success?: boolean };

/** Creates a DRAFT property and sends the host to the editor. */
export async function createProperty(input: PropertyBasicsInput): Promise<ActionResult> {
  const user = await requireHost();
  const parsed = propertyBasicsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { amenities, ...rest } = parsed.data;

  const geo = await geocodeAddress(rest);
  const property = await db.property.create({
    data: { ...rest, amenities: JSON.stringify(amenities), hostId: user.id, lat: geo?.lat, lng: geo?.lng },
  });
  redirect(`/host/properties/${property.id}/edit?tab=rooms`);
}

export async function updatePropertyBasics(
  propertyId: string,
  input: PropertyBasicsInput,
): Promise<ActionResult> {
  await assertOwnsProperty(propertyId);
  const parsed = propertyBasicsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { amenities, ...rest } = parsed.data;

  const existing = await db.property.findUniqueOrThrow({ where: { id: propertyId } });
  const addressChanged =
    existing.address !== rest.address || existing.city !== rest.city || existing.country !== rest.country;
  const geo = addressChanged || existing.lat === null ? await geocodeAddress(rest) : null;

  await db.property.update({
    where: { id: propertyId },
    data: { ...rest, amenities: JSON.stringify(amenities), ...(geo ? { lat: geo.lat, lng: geo.lng } : {}) },
  });
  revalidatePath(`/host/properties/${propertyId}/edit`);
  revalidatePath(`/properties/${propertyId}`);
  return { success: true };
}

export async function setPropertyStatus(
  propertyId: string,
  status: "DRAFT" | "PUBLISHED",
): Promise<ActionResult> {
  await assertOwnsProperty(propertyId);
  if (status === "PUBLISHED") {
    const p = await db.property.findUniqueOrThrow({
      where: { id: propertyId },
      include: { _count: { select: { roomTypes: true, media: true } } },
    });
    if (p._count.roomTypes === 0) return { error: "Add at least one room type before publishing" };
    if (p._count.media === 0) return { error: "Add at least one photo before publishing" };
  }
  await db.property.update({ where: { id: propertyId }, data: { status } });
  revalidatePath(`/host/properties/${propertyId}/edit`);
  revalidatePath("/host/properties");
  revalidatePath("/");
  return { success: true };
}

export async function deleteProperty(propertyId: string): Promise<ActionResult> {
  await assertOwnsProperty(propertyId);
  const active = await db.booking.count({
    where: { propertyId, status: { in: ["PENDING", "CONFIRMED"] } },
  });
  if (active > 0) return { error: "This property has upcoming bookings and cannot be deleted" };
  await db.property.delete({ where: { id: propertyId } });
  revalidatePath("/host/properties");
  redirect("/host/properties");
}

/** Used by the navbar link so any signed-in user can become a host. */
export async function becomeHost() {
  const user = await requireUser("/host");
  if (user.role !== "HOST") await db.user.update({ where: { id: user.id }, data: { role: "HOST" } });
  redirect("/host");
}
