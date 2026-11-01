import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="pb-20 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {product.categories && (
        <nav aria-label="Breadcrumb" className="mb-3 text-sm">
          <Link href={`/c/${product.categories.slug}`} className="underline underline-offset-2">
            {product.categories.name}
          </Link>
        </nav>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex snap-x gap-3 overflow-x-auto">
          {images.length > 0 ? (
            images.map((image, index) => (
              <div key={image.id} className="card w-full shrink-0 snap-start overflow-hidden">
                <ProductImage
                  path={image.storage_path}
                  alt={image.alt ?? product.name}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority={index === 0}
                />
              </div>
            ))
          ) : (
            <div className="card w-full overflow-hidden">
              <ProductImage path={null} alt={product.name} sizes="50vw" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl">{product.name}</h1>
          <ProductBuyBox name={product.name} variants={product.product_variants} taxNote={taxNote} />
          {product.description && <p className="mt-6 whitespace-pre-line">{product.description}</p>}
          {details.length > 0 && (
            <dl className="mt-6 divide-y divide-beige border-y border-beige text-sm">
              {details.map(([term, value]) => (
                <div key={term} className="grid grid-cols-3 gap-2 py-2">
                  <dt className="font-semibold">{term}</dt>
                  <dd className="col-span-2">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
