import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import type { Order, OrderItem } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OrderWithItems = { order: Order; items: OrderItem[] };

function split(data: Record<string, unknown>): OrderWithItems {
  const { order_items: items, ...order } = data;
  return { order: order as Order, items: items as OrderItem[] };
}

/** Loads an order through RLS, so customers can only ever reach their own. */
export async function getOrder(id: string): Promise<OrderWithItems | null> {
  if (!UUID.test(id)) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*, order_items (*)").eq("id", id).maybeSingle();
  return data ? split(data) : null;
}

/**
 * The signed-in owner (or an admin) sees the order through RLS. Anyone else needs the
 * secret token from the confirmation link, which is how guests see their order.
 */
export async function getOrderForViewer(id: string, token: string | undefined): Promise<OrderWithItems | null> {
  const own = await getOrder(id);
  if (own) return own;
  if (!token || !UUID.test(id) || !UUID.test(token)) return null;

  const { data } = await createAdminClient()
    .from("orders")
    .select("*, order_items (*)")
    .eq("id", id)
    .eq("access_token", token)
    .maybeSingle();
  return data ? split(data) : null;
}
