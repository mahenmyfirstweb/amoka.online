"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderPlus, LayoutDashboard, Package, PackagePlus, Receipt, Settings, Tags } from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/products/new", label: "Add product", icon: PackagePlus },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/categories/new", label: "Add category", icon: FolderPlus },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  // The most specific matching link is the current one, so "Add product" beats "Products".
  const current = LINKS.filter((l) => pathname === l.href || (l.href !== "/admin" && pathname.startsWith(`${l.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === current;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
              active ? "bg-yellow text-bark" : "hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon aria-hidden="true" size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
