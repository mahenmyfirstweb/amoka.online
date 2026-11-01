export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "placeholder";

/** False until real keys are set, so the site still builds and renders without them. */
export const isSupabaseConfigured =
  !SUPABASE_URL.includes("placeholder") &&
  !SUPABASE_URL.includes("your-project-ref") &&
  SUPABASE_KEY !== "placeholder";

export const IMAGE_BUCKET = "product-images";

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}
