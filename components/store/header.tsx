import Link from "next/link";
import { LayoutDashboard, Search, User } from "lucide-react";
import { getIsAdmin, getUser } from "@/lib/auth";
import { getCategories, getStoreSettings } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { CartLink } from "./cart-link";
import { CategoryRail } from "./category-rail";
import { LogoImage } from "./logo";
import { MobileMenu } from "./mobile-menu";

export function Logo() {
  return (
    <Link href="/" aria-label="amoka.online home" className="flex shrink-0 items-center">
      <LogoImage height={64} priority className="h-12 w-auto sm:h-16" />
    </Link>
  );
}

export async function Header() {
  const [categories, user, settings, isAdmin] = await Promise.all([
    getCategories(),
    getUser(),
    getStoreSettings(),
    getIsAdmin(),
  ]);
  const freeFrom = settings?.free_shipping_threshold_cents;
  // Admins go straight to the console; customers to their account.
  const account = isAdmin
    ? { href: "/admin", label: "Admin" }
    : user
      ? { href: "/account", label: "My account" }
      : { href: "/login", label: "Sign in" };

  return (
    <>
      <p className="no-print bg-bark px-4 py-2 text-center text-xs tracking-wide text-beige-tint sm:text-sm">
        {freeFrom ? (
          <>Free delivery across Singapore on orders over <span className="font-semibold text-yellow">{formatPrice(freeFrom)}</span></>
        ) : (
          "Delivered across Singapore"
        )}
        <span className="hidden sm:inline"> · Pay online or pay later</span>
      </p>

      <header className="no-print sticky top-0 z-40 border-b border-beige bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:gap-6">
          <MobileMenu categories={categories} account={account} />
          <Logo />

          <form action="/search" role="search" className="ml-auto hidden flex-1 md:block md:max-w-lg">
            <label htmlFor="search-desktop" className="sr-only">Search products</label>
            <div className="relative">
              <input
                id="search-desktop"
                name="q"
                type="search"
                placeholder="Search spices, snacks, pickles..."
                className="input rounded-full bg-paper pl-5 pr-12"
              />
              <button type="submit" aria-label="Search" className="absolute inset-y-0 right-1 flex w-11 items-center justify-center">
                <Search aria-hidden="true" size={20} />
              </button>
            </div>
          </form>

          <div className="ml-auto flex items-center md:ml-0">
            <Link href="/search" aria-label="Search" className="flex h-12 w-12 items-center justify-center md:hidden">
              <Search aria-hidden="true" size={22} />
            </Link>
            <Link href={account.href} className="hidden h-12 items-center gap-2 px-2 text-sm font-medium md:flex">
              {isAdmin ? <LayoutDashboard aria-hidden="true" size={22} /> : <User aria-hidden="true" size={22} />}
              {account.label}
            </Link>
            <CartLink />
          </div>
        </div>
      </header>

      {categories.length > 0 && <CategoryRail categories={categories} />}
    </>
  );
}
