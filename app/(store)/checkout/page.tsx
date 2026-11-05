import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Address } from "@/lib/types";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order.",
  robots: { index: false },
};

// Signing in is optional: guests type their details on this page.
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const user = await getUser();
  const { cancelled } = await searchParams;

  let addresses: Address[] = [];
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    addresses = (data ?? []) as Address[];
  }

  return (
    <CheckoutForm
      account={user ? { email: user.email ?? "" } : null}
      addresses={addresses}
      cancelled={cancelled === "1"}
    />
  );
}
