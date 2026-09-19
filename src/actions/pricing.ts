"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertOwnsProperty } from "@/lib/host";
import { pricingRulesSchema, type PricingRulesInput } from "@/lib/validators/property";
import type { ActionResult } from "@/actions/properties";

/** Replaces the property's discount tiers and minimum stay in one transaction. */
export async function savePricingRules(propertyId: string, input: PricingRulesInput): Promise<ActionResult> {
  await assertOwnsProperty(propertyId);
  const parsed = pricingRulesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { minNights, rules } = parsed.data;

  await db.$transaction([
    db.property.update({ where: { id: propertyId }, data: { minNights } }),
    db.pricingRule.deleteMany({ where: { propertyId } }),
    ...(rules.length
      ? [db.pricingRule.createMany({ data: rules.map((r) => ({ ...r, propertyId })) })]
      : []),
  ]);
  revalidatePath(`/host/properties/${propertyId}/edit`);
  revalidatePath(`/properties/${propertyId}`);
  return { success: true };
}
