import Link from "next/link";
import { Search, User } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getCategories } from "@/lib/catalog";
import { CartLink } from "./cart-link";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  const [categories, user] = await Promise.all([getCategories(), getUser()]);

  return (
    <header className="no-print sticky top-0 z-40 border-b border-beige bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:gap-4">
        <MobileMenu categories={categories} signedIn={Boolean(user)} />
        <Link href="/" className="font-heading text-xl font-bold text-brown">
          amoka<span className="sr-only">.online home</span>
          <span aria-hidden="true">.online</span>
        </Link>

        <form action="/search" role="search" className="ml-auto hidden flex-1 md:block md:max-w-md">
          <label htmlFor="search-desktop" className="sr-only">Search products</label>
          <div className="relative">
            <input id="search-desktop" name="q" type="search" placeholder="Search products" className="input pr-11" />
            <button type="submit" aria-label="Search" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center">
              <Search aria-hidden="true" size={20} />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center md:ml-0">
          <Link href="/search" aria-label="Search" className="flex h-12 w-12 items-center justify-center md:hidden">
            <Search aria-hidden="true" size={22} />
          </Link>
          <Link
            href={user ? "/account" : "/login"}
            aria-label={user ? "My account" : "Sign in"}
            className="hidden h-12 w-12 items-center justify-center md:flex"
          >
            <User aria-hidden="true" size={22} />
          </Link>
          <CartLink />
        </div>
      </div>

      {categories.length > 0 && (
        <nav aria-label="Categories" className="hidden border-t border-beige md:block">
          <ul className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 py-2 text-sm whitespace-nowrap">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="inline-block py-1 hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
