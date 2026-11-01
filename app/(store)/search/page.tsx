import type { Metadata } from "next";
import { FilterBar, Pagination, parseFilters, type SearchParams } from "@/components/store/listing";
import { ProductGrid } from "@/components/store/product-card";
import { listProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Indian groceries, spices, snacks and more.",
  robots: { index: false },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const search = await searchParams;
  const query = typeof search.q === "string" ? search.q.trim().slice(0, 100) : "";
  const filters = parseFilters(search);
  const { products, total } = await listProducts({ ...filters, query: query || undefined });

  return (
    <>
      <h1 className="text-2xl sm:text-3xl">{query ? `Results for "${query}"` : "All products"}</h1>

      <form action="/search" role="search" className="mt-4 flex gap-2 md:hidden">
        <label htmlFor="search-mobile" className="sr-only">Search products</label>
        <input id="search-mobile" name="q" type="search" defaultValue={query} placeholder="Search products" className="input" />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      <div className="mt-4">
        <FilterBar params={search} query={query} />
        {products.length === 0 ? (
          <p>{query ? "Nothing found. Try a different spelling or a shorter word." : "No products yet."}</p>
        ) : (
          <>
            <p className="mb-3 text-sm">{total} {total === 1 ? "product" : "products"}</p>
            <ProductGrid products={products} />
            <Pagination total={total} page={filters.page ?? 1} params={search} basePath="/search" />
          </>
        )}
      </div>
    </>
  );
}
