import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import type { Banner, Category, ProductCardData, ProductDetail } from "./types";

export const PAGE_SIZE = 24;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name" },
] as const;

export type ListFilters = {
  categorySlug?: string;
  query?: string;
  minCents?: number;
  maxCents?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
};

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data;
});

/** Live home page slides. Empty, not an error, if supabase/09_banners.sql hasn't been run yet. */
export const getBanners = cache(async (): Promise<Banner[]> => {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order")
    .order("created_at")
    .limit(10);
  if (error) {
    console.warn("Home page slides unavailable:", error.message);
    return [];
  }
  return data as Banner[];
});

export type StoreSettings = {
  shipping_fee_cents: number;
  free_shipping_threshold_cents: number;
  gst_registered: boolean;
  gst_rate_bp: number;
  gst_reg_no: string | null;
  low_stock_threshold: number;
};

export const getStoreSettings = cache(async (): Promise<StoreSettings | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
});

export async function listProducts(filters: ListFilters): Promise<{ products: ProductCardData[]; total: number }> {
  if (!isSupabaseConfigured) return { products: [], total: 0 };
  const limit = filters.limit ?? PAGE_SIZE;
  const page = Math.max(filters.page ?? 1, 1);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_products", {
    p_category_slug: filters.categorySlug ?? null,
    p_query: filters.query ?? null,
    p_min_cents: filters.minCents ?? null,
    p_max_cents: filters.maxCents ?? null,
    p_in_stock: filters.inStock ?? false,
    p_featured: filters.featured ?? false,
    p_sort: filters.sort ?? (filters.query ? "relevance" : "newest"),
    p_limit: limit,
    p_offset: (page - 1) * limit,
  });
  if (error) throw new Error(error.message);

  const products = data as ProductCardData[];
  return { products, total: Number(products[0]?.total_count ?? 0) };
}

export const getProduct = cache(async (slug: string): Promise<ProductDetail | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, slug, description, brand, ingredients, allergens, country_of_origin, shelf_life, manufacturer,
       categories (name, slug),
       product_images (id, storage_path, alt, sort_order),
       product_variants (id, label, price_cents, mrp_cents, stock, sort_order)`,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const product = data as unknown as ProductDetail;
  product.product_images.sort((a, b) => a.sort_order - b.sort_order);
  product.product_variants.sort((a, b) => a.sort_order - b.sort_order || a.price_cents - b.price_cents);
  return product;
});
