import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct } from "@/app/admin/actions";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export const metadata = { title: "Edit product" };

const money = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2));

export default async function EditProductPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_images (id, storage_path, sort_order), product_variants (*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("*").order("sort_order"),
  ]);
  if (!product) notFound();

  const images = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
  const variants = [...product.product_variants].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <Link href="/admin/products" className="text-sm underline underline-offset-2">Back to products</Link>
      <h1 className="mt-2 mb-4 text-3xl">{product.name}</h1>
      {created === "1" && (
        <p role="status" className="mb-4 max-w-2xl rounded-lg bg-yellow p-3 text-sm font-medium text-brown">
          Product created{product.is_active ? " and live in the shop" : ""}. You can add more photos or edit it below.{" "}
          <Link href={`/p/${product.slug}`} className="underline">View in shop</Link>
        </p>
      )}
      <ProductImages productId={product.id} productName={product.name} images={images} />
      <ProductForm
        categories={(categories ?? []) as Category[]}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          category_id: product.category_id,
          brand: product.brand ?? "",
          description: product.description ?? "",
          ingredients: product.ingredients ?? "",
          allergens: product.allergens ?? "",
          country_of_origin: product.country_of_origin ?? "",
          shelf_life: product.shelf_life ?? "",
          manufacturer: product.manufacturer ?? "",
          is_active: product.is_active,
          is_featured: product.is_featured,
          variants: variants.map((v) => ({
            key: v.id,
            id: v.id,
            label: v.label,
            price: money(v.price_cents),
            mrp: money(v.mrp_cents),
            stock: String(v.stock),
            sku: v.sku ?? "",
          })),
        }}
      />

      <form action={deleteProduct} className="mt-8 border-t border-beige pt-4">
        <input type="hidden" name="id" value={product.id} />
        <button type="submit" className="btn btn-outline">Delete product</button>
        <p className="mt-2 text-sm">Products with past orders are archived and kept for your records.</p>
      </form>
    </>
  );
}
