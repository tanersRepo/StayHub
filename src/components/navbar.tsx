import Link from "next/link";
import { Building2 } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";
import { ON_BLUE } from "@/lib/nav-styles";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { getDisplayCurrency } from "@/lib/currency-server";

export async function Navbar() {
  const [user, currency] = await Promise.all([currentUser(), getDisplayCurrency()]);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#003580] text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="size-6" />
          StayHub
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <CurrencySwitcher current={currency} className={ON_BLUE} />
          {/* Narrow screens: the links collapse into one menu button. */}
          <div className="sm:hidden">
            <MobileNav userName={user ? (user.name ?? user.email ?? "Account") : null} />
          </div>
          <nav className="hidden items-center gap-2 sm:flex">
            <Button variant="ghost" className={ON_BLUE} asChild>
              <Link href="/host">List your property</Link>
            </Button>
            {user ? (
              <>
                <Button variant="ghost" className={ON_BLUE} asChild>
                  <Link href="/trips">My trips</Link>
                </Button>
                <UserMenu name={user.name ?? user.email ?? "Account"} image={user.image} />
              </>
            ) : (
              <>
                <Button variant="ghost" className={ON_BLUE} asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button className="bg-white text-[#003580] hover:bg-white/90" asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
