import { CategoryForm } from "@/components/admin/category-form";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*, products (count)").order("sort_order");
  const categories = (data ?? []) as (Category & { products: { count: number }[] })[];
  const nextSort = (categories.at(-1)?.sort_order ?? 0) + 10;

  return (
    <>
      <h1 className="mb-4 text-2xl">Categories</h1>
      <ul className="mb-8 max-w-2xl space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="card p-3">
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm">
                  {c.products[0]?.count ?? 0} products
                  {!c.is_active && <span className="badge ml-2">Hidden</span>}
                </span>
              </summary>
              <div className="mt-3"><CategoryForm category={c} /></div>
            </details>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-lg">Add a category</h2>
      <div className="max-w-2xl"><CategoryForm nextSort={nextSort} /></div>
    </>
  );
}
