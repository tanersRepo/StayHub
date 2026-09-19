"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AMENITIES, PROPERTY_TYPES, type PropertyBasicsInput } from "@/lib/validators/property";
import { AMENITY_LABEL, PROPERTY_TYPE_LABEL } from "@/lib/labels";
import type { ActionResult } from "@/actions/properties";

interface Props {
  initial?: Partial<PropertyBasicsInput>;
  submitLabel: string;
  onSubmit: (input: PropertyBasicsInput) => Promise<ActionResult>;
}

/** Basics form used by both "new property" and the Details tab of the editor. */
export function PropertyForm({ initial, submitLabel, onSubmit }: Props) {
  const [pending, start] = useTransition();
  const [type, setType] = useState<PropertyBasicsInput["type"]>(initial?.type ?? "APARTMENT");
  const [amenities, setAmenities] = useState<string[]>(initial?.amenities ?? []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      title: String(fd.get("title")),
      type,
      description: String(fd.get("description")),
      address: String(fd.get("address")),
      city: String(fd.get("city")),
      country: String(fd.get("country")),
      currency: String(fd.get("currency") || "USD").toUpperCase(),
      checkInTime: String(fd.get("checkInTime") || "15:00"),
      checkOutTime: String(fd.get("checkOutTime") || "11:00"),
      amenities: amenities as PropertyBasicsInput["amenities"],
    };
    start(async () => {
      const res = await onSubmit(input);
      if (res?.error) toast.error(res.error);
      else if (res?.success) toast.success("Saved");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Title" className="sm:col-span-2">
          <Input name="title" defaultValue={initial?.title} required placeholder="Sunny two-bedroom near the beach" />
        </Field>
        <Field label="Type">
          <Select value={type} onValueChange={(v) => setType(v as PropertyBasicsInput["type"])}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {PROPERTY_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Description">
        <Textarea name="description" defaultValue={initial?.description} required rows={5} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Street address" className="sm:col-span-3">
          <Input name="address" defaultValue={initial?.address} required />
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={initial?.city} required />
        </Field>
        <Field label="Country">
          <Input name="country" defaultValue={initial?.country} required />
        </Field>
        <Field label="Currency">
          <Input name="currency" defaultValue={initial?.currency ?? "USD"} maxLength={3} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Check-in from">
          <Input name="checkInTime" type="time" defaultValue={initial?.checkInTime ?? "15:00"} />
        </Field>
        <Field label="Check-out by">
          <Input name="checkOutTime" type="time" defaultValue={initial?.checkOutTime ?? "11:00"} />
        </Field>
      </div>

      <div>
        <Label className="mb-3 block">Amenities</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={amenities.includes(a)}
                onCheckedChange={(v) =>
                  setAmenities((prev) => (v ? [...prev, a] : prev.filter((x) => x !== a)))
                }
              />
              {AMENITY_LABEL[a]}
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}
