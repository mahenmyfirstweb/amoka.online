import Link from "next/link";
import { ArrowRight, BadgeCheck, HandCoins, ShieldCheck, Truck } from "lucide-react";
import { CategoryVisual } from "@/components/store/category-visual";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { site } from "@/config/site";
import { getCategories, getStoreSettings, listProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

function SectionHeading({ id, eyebrow, title, link }: {
  id: string;
  eyebrow: string;
  title: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={id} className="mt-1 text-2xl sm:text-3xl">{title}</h2>
      </div>
      {link && (
        <Link href={link.href} className="flex shrink-0 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
          {link.label} <ArrowRight aria-hidden="true" size={16} />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [categories, settings, featured] = await Promise.all([
    getCategories(),
    getStoreSettings(),
    listProducts({ featured: true, limit: 8 }),
  ]);
  const products = featured.products.length > 0 ? featured.products : (await listProducts({ limit: 8 })).products;
  const showcase = products.filter((p) => p.image_path).slice(0, 4);
  const freeFrom = settings?.free_shipping_threshold_cents;

  const promises = [
    { icon: Truck, title: "Delivered across Singapore", text: `In ${site.deliveryTime}` },
    { icon: BadgeCheck, title: freeFrom ? `Free delivery over ${formatPrice(freeFrom)}` : "Fair delivery fees", text: "Shown before you pay" },
    { icon: HandCoins, title: "Pay online or pay later", text: "Card, PayNow or GrabPay" },
    { icon: ShieldCheck, title: "SFA-licensed importer", text: site.legalName },
  ];

  return (
    <div className="space-y-14">
      <section className="relative -mx-4 -mt-6 overflow-hidden bg-bark px-6 py-12 sm:mx-0 sm:mt-0 sm:rounded-3xl sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-brown opacity-60 blur-3xl"
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow text-yellow">Authentic Indian pantry · Singapore</span>
            <h1 className="mt-4 max-w-xl text-4xl leading-tight font-bold text-white sm:text-5xl">
              The taste of home, delivered to your door
            </h1>
            <p className="mt-4 max-w-md text-lg text-beige-tint">
              Hand-picked spices, snacks, pickles, dhall and pantry essentials, packed with care.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/search" className="btn btn-primary px-7">Shop now</Link>
              <Link href="#categories-heading" className="btn border border-beige-tint px-7 text-white hover:bg-white/10">
                Browse categories
              </Link>
            </div>
          </div>

          {showcase.length === 4 && (
            <ul aria-label="Popular products" className="hidden grid-cols-2 gap-4 lg:grid">
              {showcase.map((p, i) => (
                <li key={p.id} className={i % 2 === 1 ? "translate-y-6" : ""}>
                  <Link href={`/p/${p.slug}`} className="block overflow-hidden rounded-2xl bg-white p-2 shadow-xl transition hover:-translate-y-1">
                    <ProductImage path={p.image_path} alt={p.name} sizes="240px" priority={i < 2} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-label="Why shop with us">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {promises.map(({ icon: Icon, title, text }) => (
            <li key={title} className="card flex flex-col items-start gap-2 p-4 sm:flex-row sm:gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-beige-tint">
                <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-bark">{title}</span>
                <span className="block text-xs">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="categories-heading" className="scroll-mt-28">
          <SectionHeading id="categories-heading" eyebrow="Explore" title="Shop by category" />
          <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-10">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="group flex flex-col items-center gap-2 text-center">
                  <span className="block w-full max-w-24">
                    <CategoryVisual category={c} sizes="(min-width: 1024px) 96px, 30vw" />
                  </span>
                  <span className="text-sm leading-tight font-medium">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {products.length > 0 && (
        <section aria-labelledby="featured-heading">
          <SectionHeading
            id="featured-heading"
            eyebrow="Our picks"
            title="Featured products"
            link={{ href: "/search", label: "View all" }}
          />
          <ProductGrid products={products} />
        </section>
      )}

      <section className="rounded-3xl bg-beige-tint px-6 py-10 text-center sm:px-12">
        <span className="eyebrow">Can&apos;t find something?</span>
        <h2 className="mx-auto mt-2 max-w-xl text-2xl sm:text-3xl">We&apos;re happy to help you find your favourites</h2>
        <p className="mx-auto mt-3 max-w-md">
          Email <a href={`mailto:${site.email}`} className="font-semibold underline underline-offset-2">{site.email}</a> or
          call {site.phone}, {site.supportHours}.
        </p>
      </section>
    </div>
  );
}
