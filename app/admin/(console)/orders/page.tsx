import Link from "next/link";
import { ChartColumn } from "lucide-react";
import { PAYMENT_LABELS, STATUS_LABELS, StatusBadge } from "@/components/store/order-view";
import { formatDateTime, formatPrice } from "@/lib/format";
import { customerSearchFilter } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";
import { ORDER_STATUSES, PAYMENT_METHODS, orderStatusSchema } from "@/lib/validation";

export const metadata = { title: "Orders" };

type Row = Pick<
  Order,
  "id" | "order_number" | "user_id" | "email" | "status" | "payment_method" | "total_cents" | "needs_review" | "created_at" | "shipping_address"
> & { order_items: { quantity: number }[] };

export default async function AdminOrdersPage({ searchParams }: {
  searchParams: Promise<{ status?: string; payment?: string; review?: string; q?: string }>;
}) {
  const { status, payment, review, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, order_number, user_id, email, status, payment_method, total_cents, needs_review, created_at, shipping_address, order_items (quantity)")
    .order("created_at", { ascending: false })
    .limit(200);

  const statusFilter = orderStatusSchema.safeParse(status);
  if (statusFilter.success) query = query.eq("status", statusFilter.data);
  if (payment === "online" || payment === "pay_later") query = query.eq("payment_method", payment);
  if (review === "1") query = query.eq("needs_review", true);
  const search = customerSearchFilter(q);
  if (search) query = query.or(search);

  const { data } = await query;
  const orders = (data ?? []) as unknown as Row[];

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Orders</h1>
        <Link href="/admin/reports" className="btn btn-outline"><ChartColumn aria-hidden="true" size={18} /> Sales report</Link>
      </div>
      <p className="mb-5 text-sm">Every order appears here, from guests and from customers with an account. Open one to update it, print it or print the invoice.</p>

      <form className="mb-5 flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="mb-1 block text-sm">Search</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Customer name, email or order number" className="input" />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-sm">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input w-44">
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="payment" className="mb-1 block text-sm">Payment</label>
          <select id="payment" name="payment" defaultValue={payment ?? ""} className="input w-40">
            <option value="">All</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}
          </select>
        </div>
        <label className="flex min-h-12 items-center gap-2 text-sm">
          <input type="checkbox" name="review" value="1" defaultChecked={review === "1"} className="h-5 w-5 accent-brown" />
          Needs review
        </label>
        <button type="submit" className="btn btn-primary">Filter</button>
      </form>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-beige-tint">
              <tr>
                <th scope="col" className="px-4 py-3">Order</th>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3 text-right">Items</th>
                <th scope="col" className="px-4 py-3">Payment</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-beige hover:bg-beige-tint/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold underline underline-offset-2">{o.order_number}</Link>
                    {o.needs_review && <span className="badge ml-2">Review</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-bark">{o.shipping_address?.recipient_name}</span>
                    <span className="block text-xs">{o.email}{o.user_id ? "" : " · guest"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{o.order_items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                  <td className="px-4 py-3">{PAYMENT_LABELS[o.payment_method]}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-bark">{formatPrice(o.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
