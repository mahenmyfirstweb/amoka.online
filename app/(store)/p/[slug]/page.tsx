import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, HandCoins, ShieldCheck, Truck } from "lucide-react";
import { ProductBuyBox } from "@/components/store/buy-box";
import { ProductImage } from "@/components/store/product-image";
import { site } from "@/config/site";
import { getProduct, getStoreSettings } from "@/lib/catalog";
import { imageUrl } from "@/lib/supabase/config";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};

  const description = product.description ?? `Buy ${product.name} online with delivery across Singapore.`;
  const image = imageUrl(product.product_images[0]?.storage_path);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: { title: product.name, description, url: `/p/${product.slug}`, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product || product.product_variants.length === 0) notFound();

  const settings = await getStoreSettings();
  const taxNote = settings?.gst_registered === false ? "No GST charged." : "Price includes GST.";
  const images = product.product_images;
  const promises = [
    { icon: Truck, text: `Delivered in ${site.deliveryTime}` },
    { icon: HandCoins, text: "Pay online or pay later" },
    { icon: ShieldCheck, text: "SFA-licensed importer" },
  ];

  const details = [
    ["Brand", product.brand],
    ["Ingredients", product.ingredients],
    ["Allergens", product.allergens],
    ["Country of origin", product.country_of_origin],
    ["Shelf life", product.shelf_life],
    ["Manufacturer", product.manufacturer],
  ].filter((d): d is [string, string] => Boolean(d[1]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ?? undefined,
    image: images.map((i) => imageUrl(i.storage_path)),
    offers: product.product_variants.map((v) => ({
      "@type": "Offer",
      name: v.label,
      price: (v.price_cents / 100).toFixed(2),
      priceCurrency: "SGD",
      availability: `https://schema.org/${v.stock > 0 ? "InStock" : "OutOfStock"}`,
      url: `${site.url}/p/${product.slug}`,
    })),
  };

  return (
    <div className="pb-24 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="underline-offset-2 hover:underline">Home</Link></li>
          {product.categories && (
            <li className="flex items-center gap-1.5">
              <ChevronRight aria-hidden="true" size={14} />
              <Link href={`/c/${product.categories.slug}`} className="underline-offset-2 hover:underline">{product.categories.name}</Link>
            </li>
          )}
          <li className="flex min-w-0 items-center gap-1.5">
            <ChevronRight aria-hidden="true" size={14} />
            <span aria-current="page" className="truncate font-semibold text-bark">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <div className="flex snap-x gap-3 overflow-x-auto md:sticky md:top-24 md:self-start">
          {images.length > 0 ? (
            images.map((image, index) => (
              <div key={image.id} className="w-full shrink-0 snap-start overflow-hidden rounded-3xl border border-beige bg-white p-4 shadow-[0_20px_50px_-30px_rgb(59_28_21/0.45)] sm:p-8">
                <ProductImage
                  path={image.storage_path}
                  alt={image.alt ?? product.name}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority={index === 0}
                />
              </div>
            ))
          ) : (
            <div className="w-full overflow-hidden rounded-3xl border border-beige">
              <ProductImage path={null} alt={product.name} sizes="50vw" />
            </div>
          )}
        </div>

        <div>
          {(product.brand || product.categories) && (
            <span className="eyebrow">{product.brand ?? product.categories?.name}</span>
          )}
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{product.name}</h1>
          <ProductBuyBox name={product.name} variants={product.product_variants} taxNote={taxNote} />

          <ul className="mt-6 grid gap-3 rounded-2xl bg-beige-tint p-4 text-sm sm:grid-cols-3">
            {promises.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon aria-hidden="true" size={20} strokeWidth={1.75} className="shrink-0" />
                {text}
              </li>
            ))}
          </ul>

          {product.description && (
            <section aria-labelledby="about-heading" className="mt-8">
              <h2 id="about-heading" className="text-xl">About this product</h2>
              <p className="mt-2 whitespace-pre-line">{product.description}</p>
            </section>
          )}
          {details.length > 0 && (
            <section aria-labelledby="details-heading" className="mt-8">
              <h2 id="details-heading" className="text-xl">Product details</h2>
              <dl className="mt-3 divide-y divide-beige rounded-2xl border border-beige bg-white px-4 text-sm">
                {details.map(([term, value]) => (
                  <div key={term} className="grid grid-cols-3 gap-2 py-3">
                    <dt className="font-semibold">{term}</dt>
                    <dd className="col-span-2">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
