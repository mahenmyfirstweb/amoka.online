import { createClient } from "./supabase/server";
import type { Order, OrderItem } from "./types";

/** Loads an order through RLS, so customers can only ever reach their own. */
export async function getOrder(id: string): Promise<{ order: Order; items: OrderItem[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*, order_items (*)").eq("id", id).maybeSingle();
  if (!data) return null;

  const { order_items: items, ...order } = data;
  return { order: order as Order, items: items as OrderItem[] };
}
