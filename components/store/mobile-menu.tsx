"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Category } from "@/lib/types";

export function MobileMenu({ categories, signedIn }: { categories: Category[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Close the menu after navigating to a new page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
        className="-ml-2 flex h-12 w-12 items-center justify-center"
      >
        {open ? <X aria-hidden="true" size={24} /> : <Menu aria-hidden="true" size={24} />}
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Main menu"
          className="fixed inset-x-0 top-[65px] bottom-0 z-50 overflow-y-auto bg-white px-4 py-3"
        >
          <Link href={signedIn ? "/account" : "/login"} className="block py-3 font-semibold">
            {signedIn ? "My account" : "Sign in"}
          </Link>
          <h2 className="mt-3 mb-1 text-sm">Categories</h2>
          <ul>
            {categories.map((c) => (
              <li key={c.id} className="border-t border-beige">
                <Link href={`/c/${c.slug}`} className="block py-3">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
