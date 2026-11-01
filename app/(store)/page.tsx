import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { getCategories, listProducts } from "@/lib/catalog";

export default async function HomePage() {
  const categories = await getCategories();
  const featured = await listProducts({ featured: true, limit: 8 });
  const products = featured.products.length > 0 ? featured.products : (await listProducts({ limit: 8 })).products;

  return (
    <div className="space-y-10">
      <section className="-mx-4 -mt-6 bg-yellow px-6 py-10 sm:mx-0 sm:mt-0 sm:rounded-2xl sm:px-10 sm:py-14">
        <h1 className="max-w-xl text-3xl font-bold sm:text-4xl">Indian groceries, delivered across Singapore</h1>
        <p className="mt-3 max-w-md text-brown">Spices, snacks, pickles, dhall and more from home.</p>
        <Link href="/search" className="btn mt-5 bg-brown text-white hover:bg-bark">Shop groceries</Link>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="mb-3 text-xl">Shop by category</h2>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-5">
            {categories.map((c) => (
              <li key={c.id} className="w-24 shrink-0 snap-start sm:w-auto">
                <Link href={`/c/${c.slug}`} className="block text-center text-sm font-medium">
                  <span className="card block overflow-hidden">
                    {c.image_path ? (
                      <ProductImage path={c.image_path} alt="" sizes="(min-width: 640px) 20vw, 96px" />
                    ) : (
                      <span className="flex aspect-square items-center justify-center bg-beige-tint">
                        <ShoppingBasket aria-hidden="true" size={28} />
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {products.length > 0 && (
        <section aria-labelledby="featured-heading">
          <h2 id="featured-heading" className="mb-3 text-xl">Featured</h2>
          <ProductGrid products={products} />
        </section>
      )}
    </div>
  );
}
