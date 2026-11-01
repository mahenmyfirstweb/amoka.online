import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilterBar, Pagination, parseFilters, type SearchParams } from "@/components/store/listing";
import { ProductGrid } from "@/components/store/product-card";
import { getCategories, listProducts } from "@/lib/catalog";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

async function findCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await findCategory((await params).slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name} online with delivery across Singapore.`,
    alternates: { canonical: `/c/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();

  const search = await searchParams;
  const filters = parseFilters(search);
  const { products, total } = await listProducts({ ...filters, categorySlug: slug });
  const filtered = Object.keys(search).some((k) => k !== "page");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl">{category.name}</h1>
      {category.description && <p className="mt-1">{category.description}</p>}

      {products.length === 0 && !filtered ? (
        <div className="mt-6 rounded-xl bg-beige-tint px-6 py-12 text-center">
          <h2 className="text-xl">Coming soon</h2>
          <p className="mt-2">We&apos;re stocking this shelf. Have a look at our other categories for now.</p>
          <Link href="/" className="btn btn-primary mt-4">Back to the shop</Link>
        </div>
      ) : (
        <div className="mt-4">
          <FilterBar params={search} />
          {products.length === 0 ? (
            <p>No products match those filters.</p>
          ) : (
            <>
              <ProductGrid products={products} />
              <Pagination total={total} page={filters.page ?? 1} params={search} basePath={`/c/${slug}`} />
            </>
          )}
        </div>
      )}
    </>
  );
}
