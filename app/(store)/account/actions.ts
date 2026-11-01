"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addressSchema, profileSchema } from "@/lib/validation";

export type FormState = { error?: string; saved?: boolean };

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/account");
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "We couldn't save your details. Please try again." };

  revalidatePath("/account");
  return { saved: true };
}

export async function saveAddress(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/account/addresses");
  const id = form.get("id");
  const makeDefault = form.get("is_default") === "on";
  form.delete("id");
  form.delete("is_default");

  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { count } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const isDefault = makeDefault || count === 0;

  // Only one default is allowed, so clear the old one first.
  if (isDefault) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id).eq("is_default", true);
  }

  const row = { ...parsed.data, user_id: user.id, ...(isDefault ? { is_default: true } : {}) };
  const { error } = id
    ? await supabase.from("addresses").update(row).eq("id", String(id))
    : await supabase.from("addresses").insert(row);
  if (error) return { error: "We couldn't save this address. Please try again." };

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { saved: true };
}

export async function deleteAddress(form: FormData) {
  await requireUser("/account/addresses");
  const supabase = await createClient();
  await supabase.from("addresses").delete().eq("id", String(form.get("id")));
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}
