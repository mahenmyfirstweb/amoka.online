"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { IMAGE_BUCKET } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { categorySchema, orderStatusSchema, productSchema, settingsSchema } from "@/lib/validation";

// Every action checks the admin role, then writes through the signed-in user's client,
// so RLS and the order status rules apply as a second layer.

export type ActionState = { error?: string; saved?: boolean };

const DUPLICATE_MESSAGE = "That web address (slug) or SKU is already in use.";

function refreshStore() {
  revalidatePath("/", "layout");
}

export async function saveProduct(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = form.get("id") ? String(form.get("id")) : null;

  let input: unknown;
  try {
    input = JSON.parse(String(form.get("payload")));
  } catch {
    return { error: "We couldn't read the form. Please try again." };
  }
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { variants, ...product } = parsed.data;
  const row = { ...product, slug: product.slug || slugify(product.name) };

  const supabase = await createClient();
  const saved = id
    ? await supabase.from("products").update(row).eq("id", id).select("id").single()
    : await supabase.from("products").insert(row).select("id").single();
  if (saved.error) {
    return { error: saved.error.code === "23505" ? DUPLICATE_MESSAGE : saved.error.message };
  }
  const productId = saved.data.id;

  const keptIds = variants.flatMap((v) => (v.id ? [v.id] : []));
  if (id) {
    const removal = supabase.from("product_variants").delete().eq("product_id", productId);
    const { error } = keptIds.length > 0
      ? await removal.not("id", "in", `(${keptIds.join(",")})`)
      : await removal;
    if (error) return { error: error.message };
  }

  for (const [index, v] of variants.entries()) {
    const variantRow = {
      product_id: productId,
      label: v.label,
      price_cents: v.price,
      mrp_cents: v.mrp,
      stock: v.stock,
      sku: v.sku ?? null,
      sort_order: index,
    };
    const { error } = v.id
      ? await supabase.from("product_variants").update(variantRow).eq("id", v.id)
      : await supabase.from("product_variants").insert(variantRow);
    if (error) return { error: error.code === "23505" ? DUPLICATE_MESSAGE : error.message };
  }

  refreshStore();
  if (!id) redirect(`/admin/products/${productId}`);
  return { saved: true };
}

/** Deletes a product, or archives it if past orders refer to it. */
export async function deleteProduct(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const supabase = await createClient();

  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if (count && count > 0) {
    await supabase.from("products").update({ archived_at: new Date().toISOString(), is_active: false }).eq("id", id);
  } else {
    const { data: images } = await supabase.from("product_images").select("storage_path").eq("product_id", id);
    await supabase.from("products").delete().eq("id", id);
    if (images?.length) await supabase.storage.from(IMAGE_BUCKET).remove(images.map((i) => i.storage_path));
  }

  refreshStore();
  redirect("/admin/products");
}

export async function updateStock(form: FormData) {
  await requireAdmin();
  const stock = z.coerce.number().int().min(0).safeParse(form.get("stock"));
  if (!stock.success) return;

  const supabase = await createClient();
  await supabase.from("product_variants").update({ stock: stock.data }).eq("id", String(form.get("id")));
  refreshStore();
}

export async function addProductImage(productId: string, storagePath: string, alt: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  const { error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, storage_path: storagePath, alt, sort_order: count ?? 0 });
  if (error) throw new Error(error.message);
  refreshStore();
}

export async function deleteProductImage(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_images")
    .delete()
    .eq("id", String(form.get("id")))
    .select("storage_path")
    .single();
  if (data) await supabase.storage.from(IMAGE_BUCKET).remove([data.storage_path]);
  refreshStore();
}

export async function saveCategory(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = form.get("id") ? String(form.get("id")) : null;
  const imagePath = form.get("image_path") ? String(form.get("image_path")) : null;

  const parsed = categorySchema.safeParse({
    name: form.get("name"),
    slug: form.get("slug"),
    description: form.get("description"),
    sort_order: form.get("sort_order"),
    is_active: form.get("is_active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const row = { ...parsed.data, slug: parsed.data.slug || slugify(parsed.data.name), image_path: imagePath };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(row).eq("id", id)
    : await supabase.from("categories").insert(row);
  if (error) return { error: error.code === "23505" ? "That web address (slug) is already in use." : error.message };

  refreshStore();
  return { saved: true };
}

export async function deleteCategory(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", String(form.get("id")));
  if (error) {
    return { error: error.code === "23503" ? "Move or delete this category's products first." : error.message };
  }
  refreshStore();
  return { saved: true };
}

export async function updateOrderStatus(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const status = orderStatusSchema.safeParse(form.get("status"));
  if (!status.success) return { error: "Choose a status." };

  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status: status.data }).eq("id", id);
  if (error) return { error: "That status change isn't allowed." };

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  return { saved: true };
}

export async function clearOrderReview(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const supabase = await createClient();
  await supabase.from("orders").update({ needs_review: false, review_note: null }).eq("id", id);
  revalidatePath(`/admin/orders/${id}`);
}

export async function saveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    shipping_fee: form.get("shipping_fee"),
    free_shipping_threshold: form.get("free_shipping_threshold"),
    gst_registered: form.get("gst_registered") === "on",
    gst_rate: form.get("gst_rate"),
    gst_reg_no: form.get("gst_reg_no"),
    low_stock_threshold: form.get("low_stock_threshold"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { shipping_fee, free_shipping_threshold, gst_rate, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("store_settings")
    .update({
      ...rest,
      shipping_fee_cents: shipping_fee,
      free_shipping_threshold_cents: free_shipping_threshold,
      // "9" or "9.00" percent parses to 900, which is also 9% in basis points.
      gst_rate_bp: gst_rate,
    })
    .eq("id", 1);
  if (error) return { error: error.message };

  refreshStore();
  return { saved: true };
}
