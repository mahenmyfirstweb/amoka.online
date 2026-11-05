"use client";

import Link from "next/link";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { CategoryVisual } from "./category-visual";

/** Every category as a picture with its name, scrollable sideways. */
export function CategoryRail({ categories }: { categories: Category[] }) {
  const list = useRef<HTMLUListElement>(null);
  const pathname = usePathname();

  const scroll = (direction: 1 | -1) =>
    list.current?.scrollBy({ left: direction * list.current.clientWidth * 0.8, behavior: "smooth" });

  const arrow = "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-beige bg-white shadow-md hover:bg-beige-tint md:flex";

  return (
    <nav aria-label="Categories" className="no-print border-b border-beige bg-white">
      <div className="relative mx-auto max-w-6xl">
        <button type="button" aria-label="Scroll categories left" onClick={() => scroll(-1)} className={`${arrow} left-2`}>
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
        <ul ref={list} className="no-scrollbar flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 py-3 sm:gap-5 md:scroll-px-14 md:px-14">
          {categories.map((c) => {
            const href = `/c/${c.slug}`;
            const active = pathname === href;
            return (
              <li key={c.id} className="snap-start">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="group flex w-[4.5rem] flex-col items-center gap-1.5 text-center md:w-20"
                >
                  <span className="block w-14 md:w-16">
                    <CategoryVisual category={c} sizes="64px" active={active} />
                  </span>
                  <span className={`text-xs leading-tight ${active ? "font-bold text-bark" : "font-medium"}`}>{c.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <button type="button" aria-label="Scroll categories right" onClick={() => scroll(1)} className={`${arrow} right-2`}>
          <ChevronRight aria-hidden="true" size={20} />
        </button>
      </div>
    </nav>
  );
}
