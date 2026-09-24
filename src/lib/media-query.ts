import type { Prisma } from "@/generated/prisma/client";

/**
 * Cover-image query fragment: first photo by order, general property photos before room photos.
 * Use wherever a listing/card needs one representative image.
 */
export const COVER_IMAGE = {
  where: { kind: "IMAGE" },
  orderBy: [{ roomTypeId: { sort: "asc", nulls: "first" } }, { order: "asc" }],
  take: 1,
} satisfies Prisma.PropertyMediaFindManyArgs;
