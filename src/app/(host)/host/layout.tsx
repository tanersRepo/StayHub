import { requireHost } from "@/lib/auth";
import { HostSidebar } from "@/components/host/sidebar";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  await requireHost("/host");
  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      <HostSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
