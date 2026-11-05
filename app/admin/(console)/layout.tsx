import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/store/auth-forms";
import { LogoImage } from "@/components/store/logo";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="no-print bg-bark text-beige-tint md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 md:block md:py-6">
          <Link href="/admin" className="flex items-center gap-3 md:block">
            <LogoImage height={56} className="h-12 w-auto md:h-14" />
            <span className="block font-sans text-xs font-semibold tracking-[0.18em] text-yellow uppercase md:mt-2">Admin console</span>
          </Link>
        </div>
        <AdminNav />
        <div className="mt-auto hidden space-y-3 border-t border-white/15 px-5 py-5 md:block">
          <p className="truncate text-xs">Signed in as {user.email}</p>
          <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:text-white hover:underline">
            <ExternalLink aria-hidden="true" size={16} /> View store
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-paper">
        <div className="no-print flex items-center justify-end gap-3 border-b border-beige bg-white px-4 py-2">
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium md:hidden">
            <ExternalLink aria-hidden="true" size={16} /> View store
          </Link>
          <SignOutButton />
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
