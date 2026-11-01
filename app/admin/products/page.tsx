import Link from "next/link";
import { updateStock } from "../actions";
import { getStoreSettings } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Products" };

type Row = {
  id: string;
  name: string;
  is_active: boolean;
  archived_at: string | null;
  categories: { name: string } | null;
  product_variants: { id: string; label: string; price_cents: number; stock: number }[];
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
    .select("id, name, is_active, archived_at, categories (name), product_variants (id, label, price_cents, stock)")
    .order("name")
    .limit(500);
  query = archived === "1" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (q) query = query.ilike("name", `%${q.replace(/[%_,]/g, "")}%`);

  const { data } = await query;
  let products = (data ?? []) as unknown as Row[];
  if (low === "1") products = products.filter((p) => p.product_variants.some((v) => v.stock <= threshold));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary">Add product</Link>
      </div>

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
                <Link href={`/admin/products/${p.id}`} className="font-semibold underline underline-offset-2">{p.name}</Link>
                <span className="text-sm">
                  {p.categories?.name}
                  {!p.is_active && !p.archived_at && <span className="badge ml-2">Hidden</span>}
                  {p.archived_at && <span className="badge ml-2">Archived</span>}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-beige">
                {p.product_variants.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                    <span>
                      {v.label}, {formatPrice(v.price_cents)}
                      {v.stock <= threshold && <span className="badge ml-2">{v.stock === 0 ? "Sold out" : "Low"}</span>}
                    </span>
                    <form action={updateStock} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={v.id} />
                      <label htmlFor={`stock-${v.id}`} className="sr-only">Stock of {p.name} {v.label}</label>
                      <input id={`stock-${v.id}`} name="stock" type="number" min={0} defaultValue={v.stock} className="input w-24" />
                      <button type="submit" className="btn btn-outline">Update</button>
                    </form>
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
