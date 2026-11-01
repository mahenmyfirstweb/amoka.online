import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { site } from "@/config/site";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = ["", "/policies/shipping", "/policies/refunds", "/policies/privacy", "/policies/terms"]
    .map((path) => ({ url: `${site.url}${path}` }));

  if (!isSupabaseConfigured) return pages;

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const [categories, products] = await Promise.all([
    supabase.from("categories").select("slug, updated_at").eq("is_active", true),
    supabase.from("products").select("slug, updated_at").eq("is_active", true).is("archived_at", null),
  ]);

  return [
    ...pages,
    ...(categories.data ?? []).map((c) => ({ url: `${site.url}/c/${c.slug}`, lastModified: c.updated_at })),
    ...(products.data ?? []).map((p) => ({ url: `${site.url}/p/${p.slug}`, lastModified: p.updated_at })),
  ];
}
