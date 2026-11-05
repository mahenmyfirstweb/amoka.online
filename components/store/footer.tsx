import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/config/site";
import { getCategories } from "@/lib/catalog";
import { LogoImage } from "./logo";

const POLICY_LINKS = [
  { href: "/policies/shipping", label: "Shipping" },
  { href: "/policies/refunds", label: "Refunds and returns" },
  { href: "/policies/privacy", label: "Privacy" },
  { href: "/policies/terms", label: "Terms" },
];

export async function Footer() {
  const categories = await getCategories();

  return (
    <footer className="no-print mt-16 bg-bark text-beige-tint">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <LogoImage height={72} className="h-[72px] w-auto" />
          <p className="mt-2 font-heading text-xl font-bold text-white">
            amoka<span className="font-semibold italic">.online</span>
          </p>
          <p className="mt-3 text-sm">{site.tagline}. Delivered in {site.deliveryTime}.</p>
          <p className="mt-4 text-xs">SFA licence {site.sfaLicence}</p>
        </div>

        {categories.length > 0 && (
          <div className="lg:col-span-1">
            <h2 className="eyebrow font-sans text-yellow">Shop</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {categories.slice(0, 12).map((c) => (
                <li key={c.id}>
                  <Link href={`/c/${c.slug}`} className="underline-offset-2 hover:text-white hover:underline">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="eyebrow font-sans text-yellow">Help</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {POLICY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="underline-offset-2 hover:text-white hover:underline">{l.label}</Link>
              </li>
            ))}
            <li><Link href="/account/orders" className="underline-offset-2 hover:text-white hover:underline">Your orders</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow font-sans text-yellow">Contact</h2>
          <address className="mt-4 space-y-3 text-sm not-italic">
            <p className="flex gap-2"><Mail aria-hidden="true" size={18} className="mt-0.5 shrink-0" /> <a href={`mailto:${site.email}`} className="hover:text-white hover:underline">{site.email}</a></p>
            <p className="flex gap-2"><Phone aria-hidden="true" size={18} className="mt-0.5 shrink-0" /> {site.phone}, {site.supportHours}</p>
            <p className="flex gap-2"><MapPin aria-hidden="true" size={18} className="mt-0.5 shrink-0" /> {site.address}</p>
          </address>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs sm:text-left">
          © {new Date().getFullYear()} {site.legalName} (UEN {site.uen}). All prices in Singapore dollars and include GST.
        </p>
      </div>
    </footer>
  );
}
