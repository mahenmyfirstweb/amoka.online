import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { CategoryForm } from "@/components/admin/category-form";
import { CategoryVisual } from "@/components/store/category-visual";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*, products (count)").order("sort_order");
  const categories = (data ?? []) as (Category & { products: { count: number }[] })[];

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Categories</h1>
        <Link href="/admin/categories/new" className="btn btn-primary">
          <FolderPlus aria-hidden="true" size={18} /> Add new category
        </Link>
      </div>
      <p className="mb-5 text-sm">
        Open a category to rename it, change its photo, hide it or delete it. Categories show in the shop in sort order.
      </p>

      {created && (
        <p role="status" className="mb-4 max-w-3xl rounded-lg bg-yellow p-3 text-sm font-medium text-brown">
          Category &ldquo;{created}&rdquo; created.
        </p>
      )}

      <ul className="max-w-3xl space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="card p-3">
            <details>
              <summary className="flex min-h-12 cursor-pointer items-center gap-3">
                <span className="block w-12 shrink-0"><CategoryVisual category={c} sizes="48px" /></span>
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="text-sm">
                  {c.products[0]?.count ?? 0} products
                  {!c.is_active && <span className="badge ml-2">Hidden</span>}
                  {!c.image_path && <span className="ml-2 rounded-full bg-beige-tint px-2.5 py-0.5 text-xs font-semibold text-bark">No photo</span>}
                </span>
              </summary>
              <div className="mt-4 border-t border-beige pt-4"><CategoryForm category={c} /></div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
