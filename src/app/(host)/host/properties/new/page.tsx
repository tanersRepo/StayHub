import { createProperty } from "@/actions/properties";
import { PropertyForm } from "@/components/host/property-form";

export const metadata = { title: "New property" };

export default function NewPropertyPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add a property</h1>
        <p className="text-sm text-muted-foreground">
          Start with the basics. You&apos;ll add rooms, photos and pricing next.
        </p>
      </div>
      <PropertyForm submitLabel="Create and continue" onSubmit={createProperty} />
    </div>
  );
}
