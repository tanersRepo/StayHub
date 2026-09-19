"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Home, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/host", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/host/properties", label: "Properties", icon: Home },
  { href: "/host/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/host/calendar", label: "Calendar", icon: CalendarDays },
];

export function HostSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-52 shrink-0 md:block">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Host
      </p>
      <nav className="space-y-1">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                active && "bg-muted font-medium",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
