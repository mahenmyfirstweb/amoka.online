import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/checkout-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Address } from "@/lib/types";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order.",
  robots: { index: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const user = await requireUser("/checkout");
  const { cancelled } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return <CheckoutForm addresses={(data ?? []) as Address[]} cancelled={cancelled === "1"} />;
}
