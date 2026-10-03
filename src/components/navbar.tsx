import Link from "next/link";
import { Building2 } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { getDisplayCurrency } from "@/lib/currency-server";

export async function Navbar() {
  const [user, currency] = await Promise.all([currentUser(), getDisplayCurrency()]);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="size-6 text-primary" />
          StayHub
        </Link>
        <nav className="flex items-center gap-2">
          <CurrencySwitcher current={currency} />
          <Button variant="ghost" asChild>
            <Link href="/host">List your property</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/trips">My trips</Link>
              </Button>
              <UserMenu name={user.name ?? user.email ?? "Account"} image={user.image} />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
