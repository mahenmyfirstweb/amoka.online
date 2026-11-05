import { ProductForm } from "@/components/admin/product-form";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order");

  return (
    <>
      <h1 className="mb-1 text-3xl">Add product</h1>
      <p className="mb-5 text-sm">Fill in the details, upload photos, set each size&apos;s price and stock, then click <strong>Save product</strong>.</p>
      <ProductForm
        categories={(data ?? []) as Category[]}
        initial={{
          name: "",
          slug: "",
          category_id: "",
          brand: "",
          description: "",
          ingredients: "",
          allergens: "",
          country_of_origin: "",
          shelf_life: "",
          manufacturer: "",
          is_active: true,
          is_featured: false,
          variants: [{ key: "new", id: null, label: "", price: "", mrp: "", stock: "0", sku: "" }],
        }}
      />
    </>
  );
}
