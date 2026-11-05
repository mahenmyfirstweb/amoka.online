"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Category } from "@/lib/types";
import { CategoryVisual } from "./category-visual";

export function MobileMenu({ categories, signedIn }: { categories: Category[]; signedIn: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const close = () => dialog.current?.close();

  // Close the menu after navigating to a new page.
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className="-ml-2 flex h-12 w-12 items-center justify-center"
      >
        <Menu aria-hidden="true" size={24} />
      </button>

      <dialog
        ref={dialog}
        aria-label="Menu"
        className="m-0 h-full max-h-none w-[min(100%,24rem)] max-w-none bg-white p-0 text-brown backdrop:bg-bark/60"
      >
        <div className="flex items-center justify-between border-b border-beige px-4 py-2">
          <p className="font-heading text-xl font-semibold">Menu</p>
          <button type="button" aria-label="Close menu" onClick={close} className="-mr-2 flex h-12 w-12 items-center justify-center">
            <X aria-hidden="true" size={24} />
          </button>
        </div>
        <div className="p-4">
          <Link href={signedIn ? "/account" : "/login"} onClick={close} className="btn btn-outline w-full">
            {signedIn ? "My account" : "Sign in or register"}
          </Link>
          <h2 className="eyebrow mt-6 mb-3">Shop by category</h2>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} onClick={close} className="group flex flex-col items-center gap-1.5 text-center">
                  <span className="block w-16"><CategoryVisual category={c} sizes="64px" /></span>
                  <span className="text-xs leading-tight font-medium">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </div>
  );
}
