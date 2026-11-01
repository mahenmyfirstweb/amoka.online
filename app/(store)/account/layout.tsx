import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/store/auth-forms";
import { getIsAdmin, requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "My account", template: "%s | amoka.online" },
  description: "Your orders, addresses and details.",
  robots: { index: false },
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  const isAdmin = await getIsAdmin();

  const links = [
    { href: "/account", label: "Profile" },
    { href: "/account/orders", label: "Orders" },
    { href: "/account/addresses", label: "Addresses" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="grid gap-6 md:grid-cols-4">
      <nav aria-label="Account" className="no-print flex flex-wrap items-center gap-2 md:flex-col md:items-stretch">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2.5 font-medium hover:bg-beige-tint">{l.label}</Link>
        ))}
        <SignOutButton />
      </nav>
      <div className="md:col-span-3">{children}</div>
    </div>
  );
}
