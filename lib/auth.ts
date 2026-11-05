import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export const getUser = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export const getIsAdmin = cache(async () => {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin";
});

export async function requireUser(next: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Call at the top of every admin page and server action. Sends others to the admin sign-in. */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/admin/login");
  if (!(await getIsAdmin())) redirect("/admin/login?denied=1");
  return user;
}
