import Link from "next/link";
import { STATUS_LABELS, StatusBadge } from "@/components/store/order-view";
import { formatDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";
import { ORDER_STATUSES, orderStatusSchema } from "@/lib/validation";

export const metadata = { title: "Orders" };

type Row = Pick<Order, "id" | "order_number" | "email" | "status" | "total_cents" | "needs_review" | "created_at">;

export default async function AdminOrdersPage({ searchParams }: {
  searchParams: Promise<{ status?: string; review?: string; q?: string }>;
}) {
  const { status, review, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, order_number, email, status, total_cents, needs_review, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const statusFilter = orderStatusSchema.safeParse(status);
  if (statusFilter.success) query = query.eq("status", statusFilter.data);
  if (review === "1") query = query.eq("needs_review", true);
  if (q) query = query.ilike("order_number", `%${q.replace(/[%_,]/g, "")}%`);

  const { data } = await query;
  const orders = (data ?? []) as Row[];

  return (
    <>
      <h1 className="mb-4 text-2xl">Orders</h1>

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="status" className="mb-1 block text-sm">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input w-48">
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="q" className="mb-1 block text-sm">Order number</label>
          <input id="q" name="q" type="search" defaultValue={q} className="input w-48" />
        </div>
        <label className="flex min-h-12 items-center gap-2 text-sm">
          <input type="checkbox" name="review" value="1" defaultChecked={review === "1"} className="h-5 w-5 accent-brown" />
          Needs review
        </label>
        <button type="submit" className="btn btn-outline">Filter</button>
      </form>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-beige-tint">
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {o.order_number}
                    {o.needs_review && <span className="badge ml-2">Review</span>}
                  </span>
                  <span className="block truncate text-sm">{o.email}, {formatDate(o.created_at)}</span>
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
