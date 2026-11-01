import Link from "next/link";
import { StatusBadge } from "@/components/store/order-view";
import { requireUser } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export default async function OrdersPage() {
  await requireUser("/account/orders");
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, total_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const orders = (data ?? []) as Pick<Order, "id" | "order_number" | "status" | "total_cents" | "created_at">[];

  return (
    <>
      <h1 className="mb-4 text-2xl">Orders</h1>
      {orders.length === 0 ? (
        <p>You haven&apos;t placed any orders yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-beige-tint">
                <span>
                  <span className="block font-semibold">{o.order_number}</span>
                  <span className="text-sm">{formatDate(o.created_at)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={o.status} />
                  <span className="font-semibold text-bark">{formatPrice(o.total_cents)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
