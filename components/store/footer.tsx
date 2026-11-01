import Link from "next/link";
import { site } from "@/config/site";

const POLICY_LINKS = [
  { href: "/policies/shipping", label: "Shipping" },
  { href: "/policies/refunds", label: "Refunds and returns" },
  { href: "/policies/privacy", label: "Privacy" },
  { href: "/policies/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="no-print mt-12 bg-brown text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-heading text-lg font-bold">{site.name}</p>
          <p className="mt-2 text-sm">{site.tagline}</p>
        </div>
        <div>
          <h2 className="font-semibold text-yellow">Help</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {POLICY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="underline-offset-2 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-yellow">Contact</h2>
          <address className="mt-2 space-y-1 text-sm not-italic">
            <p>{site.legalName}</p>
            <p>UEN: {site.uen}</p>
            <p>SFA licence: {site.sfaLicence}</p>
            <p>{site.address}</p>
            <p>{site.email}</p>
            <p>{site.phone}</p>
          </address>
        </div>
      </div>
      <p className="border-t border-white/30 px-4 py-4 text-center text-sm">
        © {new Date().getFullYear()} {site.legalName}. All prices in Singapore dollars.
      </p>
    </footer>
  );
}
