import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireHost } from "@/lib/auth";

/** Loads a property only if the current user owns it; 404 otherwise. */
export async function getOwnedProperty(propertyId: string) {
  const user = await requireHost();
  const property = await db.property.findFirst({
    where: { id: propertyId, hostId: user.id },
    include: {
      media: { orderBy: { order: "asc" } },
      roomTypes: { orderBy: { order: "asc" } },
      pricingRules: { orderBy: { minNights: "asc" } },
    },
  });
  if (!property) notFound();
  return { user, property };
}

/** Throws (for server actions) instead of 404ing. */
export async function assertOwnsProperty(propertyId: string) {
  const user = await requireHost();
  const property = await db.property.findFirst({
    where: { id: propertyId, hostId: user.id },
    select: { id: true },
  });
  if (!property) throw new Error("Property not found");
  return user;
}

export type OwnedProperty = Awaited<ReturnType<typeof getOwnedProperty>>["property"];
