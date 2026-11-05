import Link from "next/link";
import { ArrowRight, BadgeCheck, HandCoins, ShieldCheck, Truck } from "lucide-react";
import { CategoryVisual } from "@/components/store/category-visual";
import { HeroCarousel, type Slide, type SlideProduct } from "@/components/store/hero-carousel";
import { bestSaving, ProductGrid } from "@/components/store/product-card";
import { site } from "@/config/site";
import { getBanners, getCategories, getStoreSettings, listProducts } from "@/lib/catalog";
import { formatPrice, percentOff } from "@/lib/format";
import type { ProductCardData } from "@/lib/types";

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

/** Up to four products with photos, each shown at its best-value size. */
function forSlide(products: ProductCardData[]): SlideProduct[] {
  return products
    .filter((p) => p.image_path)
    .slice(0, 4)
    .map((p) => {
      const variant = [...p.variants].sort(
        (a, b) => (percentOff(b.price_cents, b.mrp_cents) ?? 0) - (percentOff(a.price_cents, a.mrp_cents) ?? 0),
      )[0];
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        image_path: p.image_path,
        price_cents: variant.price_cents,
        mrp_cents: variant.mrp_cents,
      };
    });
}

export default async function HomePage() {
  const [categories, settings, featured, catalogue, banners] = await Promise.all([
    getCategories(),
    getStoreSettings(),
    listProducts({ featured: true, limit: 8 }),
    listProducts({ sort: "newest", limit: 100 }),
    getBanners(),
  ]);
  const all = catalogue.products;
  const products = featured.products.length > 0 ? featured.products : all.slice(0, 8);
  const newArrivals = all.slice(0, 8);
  // Offers come from the "Was price" on each size, so they appear as soon as one is set in admin.
  const offers = all
    .filter((p) => bestSaving(p))
    .sort((a, b) => (bestSaving(b) ?? 0) - (bestSaving(a) ?? 0))
    .slice(0, 8);
  const bestOffer = offers.length > 0 ? bestSaving(offers[0]) : null;
  const freeFrom = settings?.free_shipping_threshold_cents;

  // Slides added in Admin > Home slides replace the automatic ones below.
  const adminSlides: Slide[] = banners.map((b) => ({
    id: b.id,
    tone: "bark",
    eyebrow: b.eyebrow ?? "",
    title: b.title,
    text: b.body ?? "",
    cta: b.button_label && b.button_link ? { href: b.button_link, label: b.button_label } : undefined,
    image_path: b.image_path,
    products: [],
  }));

  const automaticSlides: Slide[] = [
    {
      id: "welcome",
      tone: "bark",
      eyebrow: "Authentic Indian pantry · Singapore",
      title: "The taste of home, delivered to your door",
      text: "Hand-picked spices, snacks, pickles, dhall and pantry essentials, packed with care.",
      cta: { href: "/search", label: "Shop now" },
      secondary: { href: "#categories-heading", label: "Browse categories" },
      products: forSlide(products),
    },
    ...(offers.length > 0
      ? [{
          id: "offers",
          tone: "brown" as const,
          eyebrow: "Special offers",
          title: `Save up to ${bestOffer}% on pantry favourites`,
          text: "Limited-time prices on selected products, while stocks last.",
          cta: { href: "#offers-heading", label: "Shop the offers" },
          products: forSlide(offers),
        }]
      : []),
    ...(newArrivals.length > 0
      ? [{
          id: "new",
          tone: "gold" as const,
          eyebrow: "Just landed",
          title: "New arrivals on our shelves",
          text: "Discover the latest additions to the amoka.online pantry.",
          cta: { href: "#new-heading", label: "See what's new" },
          products: forSlide(newArrivals),
        }]
      : []),
    ...(freeFrom
      ? [{
          id: "delivery",
          tone: "bark" as const,
          eyebrow: "Delivery offer",
          title: `Free delivery on orders over ${formatPrice(freeFrom)}`,
          text: `Delivered across Singapore in ${site.deliveryTime}. Pay online, or place your order and pay later.`,
          cta: { href: "/search", label: "Start shopping" },
          products: [],
        }]
      : []),
  ];
  const slides = adminSlides.length > 0 ? adminSlides : automaticSlides;

  const promises = [
    { icon: Truck, title: "Delivered across Singapore", text: `In ${site.deliveryTime}` },
    { icon: BadgeCheck, title: freeFrom ? `Free delivery over ${formatPrice(freeFrom)}` : "Fair delivery fees", text: "Shown before you pay" },
    { icon: HandCoins, title: "Pay online or pay later", text: "Card, PayNow or GrabPay" },
    { icon: ShieldCheck, title: "SFA-licensed importer", text: site.legalName },
  ];

  return (
    <div className="space-y-14">
      <HeroCarousel slides={slides} />

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

      {offers.length > 0 && (
        <section aria-labelledby="offers-heading" className="scroll-mt-28 rounded-3xl bg-beige-tint p-4 sm:p-8">
          <SectionHeading id="offers-heading" eyebrow="Limited time" title="Special offers" />
          <ProductGrid products={offers} />
        </section>
      )}

      {newArrivals.length > 0 && (
        <section aria-labelledby="new-heading" className="scroll-mt-28">
          <SectionHeading
            id="new-heading"
            eyebrow="Just landed"
            title="New arrivals"
            link={{ href: "/search?sort=newest", label: "View all" }}
          />
          <ProductGrid products={newArrivals.slice(0, 4)} label="New" />
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
