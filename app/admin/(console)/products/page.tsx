import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { VariantQuickEdit } from "@/components/admin/variant-quick-edit";
import { ProductImage } from "@/components/store/product-image";
import { getStoreSettings } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Products" };

type Row = {
  id: string;
  name: string;
  is_active: boolean;
  archived_at: string | null;
  categories: { name: string } | null;
  product_variants: { id: string; label: string; price_cents: number; stock: number; sort_order: number }[];
  product_images: { storage_path: string; sort_order: number }[];
};

export default async function AdminProductsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; low?: string; archived?: string }>;
}) {
  const { q, low, archived } = await searchParams;
  const supabase = await createClient();
  const settings = await getStoreSettings();
  const threshold = settings?.low_stock_threshold ?? 5;

  let query = supabase
    .from("products")
    .select("id, name, is_active, archived_at, categories (name), product_variants (id, label, price_cents, stock, sort_order), product_images (storage_path, sort_order)")
    .order("sort_order", { referencedTable: "product_variants" })
    .order("sort_order", { referencedTable: "product_images" })
    .order("name")
    .limit(500);
  query = archived === "1" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (q) query = query.ilike("name", `%${q.replace(/[%_,]/g, "")}%`);

  const { data } = await query;
  let products = (data ?? []) as unknown as Row[];
  if (low === "1") products = products.filter((p) => p.product_variants.some((v) => v.stock <= threshold));

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary"><PackagePlus aria-hidden="true" size={18} /> Add new product</Link>
      </div>
      <p className="mb-5 text-sm">
        Change a price or stock and click <strong>Save</strong>. <strong>Out of stock</strong> sets stock to 0, and the
        shop then shows the size as out of stock. Open a product to edit its details or upload photos.
      </p>

      <form className="mb-4 flex flex-wrap items-center gap-2">
        <label htmlFor="q" className="sr-only">Search products</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by name" className="input max-w-xs" />
        <label className="flex min-h-12 items-center gap-2 text-sm">
          <input type="checkbox" name="low" value="1" defaultChecked={low === "1"} className="h-5 w-5 accent-brown" />
          Low stock
        </label>
        <label className="flex min-h-12 items-center gap-2 text-sm">
          <input type="checkbox" name="archived" value="1" defaultChecked={archived === "1"} className="h-5 w-5 accent-brown" />
          Archived
        </label>
        <button type="submit" className="btn btn-outline">Filter</button>
      </form>

      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold underline underline-offset-2">
                  <span className="block w-12 shrink-0 overflow-hidden rounded-lg border border-beige">
                    <ProductImage path={p.product_images[0]?.storage_path} alt="" sizes="48px" />
                  </span>
                  {p.name}
                </Link>
                <span className="text-sm">
                  {p.categories?.name}
                  {!p.is_active && !p.archived_at && <span className="badge ml-2">Hidden</span>}
                  {p.archived_at && <span className="badge ml-2">Archived</span>}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-beige">
                {p.product_variants.map((v) => (
                  <li key={v.id}>
                    <VariantQuickEdit productName={p.name} variant={v} threshold={threshold} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
