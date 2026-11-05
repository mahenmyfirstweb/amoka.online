import Link from "next/link";
import { CategoryForm } from "@/components/admin/category-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Add category" };

export default async function NewCategoryPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextSort = (data?.[0]?.sort_order ?? 0) + 10;

  return (
    <>
      <Link href="/admin/categories" className="text-sm underline underline-offset-2">Back to categories</Link>
      <h1 className="mt-2 mb-1 text-3xl">Add category</h1>
      <p className="mb-5 text-sm">
        Give it a name and a photo, then click <strong>Save category</strong>. A square photo of a single pack on a
        white background looks best in the round frames.
      </p>
      <div className="card max-w-2xl p-5"><CategoryForm nextSort={nextSort} /></div>
    </>
  );
}
