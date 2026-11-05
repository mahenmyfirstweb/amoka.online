import Link from "next/link";
import { notFound } from "next/navigation";
import { clearOrderReview } from "../../actions";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { OrderSummary, StatusBadge } from "@/components/store/order-view";
import { formatDate } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOrder(id);
  if (!result) notFound();
  const { order, items } = result;

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, status, stripe_session_id, stripe_payment_intent_id, amount_cents")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  return (
    <>
      <Link href="/admin/orders" className="text-sm underline underline-offset-2">Back to orders</Link>
      <div className="mt-2 mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mb-4 text-sm">
        {formatDate(order.created_at)}, {order.email} ({order.user_id ? "account" : "guest"}),{" "}
        {order.shipping_address.phone}
      </p>

      {order.payment_method === "pay_later" && order.status === "pending" && (
        <div role="note" className="mb-4 rounded-xl bg-yellow p-4 text-brown">
          <p className="font-semibold">Pay later: not paid yet</p>
          <p className="text-sm">
            Contact the customer to arrange payment. When you&apos;ve received it, change the status to Paid.
            Its stock stays reserved until then, or until you cancel it.
          </p>
        </div>
      )}

      {order.needs_review && (
        <div role="alert" className="mb-4 rounded-xl bg-orange p-4 text-bark">
          <p className="font-semibold">This order needs review</p>
          <p className="text-sm">{order.review_note}</p>
          <form action={clearOrderReview} className="mt-2">
            <input type="hidden" name="id" value={order.id} />
            <button type="submit" className="btn btn-outline">Mark as resolved</button>
          </form>
        </div>
      )}

      <section aria-label="Status" className="card mb-4 p-4">
        <OrderStatusForm orderId={order.id} status={order.status} paymentMethod={order.payment_method} />
      </section>

      <OrderSummary order={order} items={items} />

      {payments && payments.length > 0 && (
        <section aria-labelledby="stripe-heading" className="card mt-4 p-4 text-sm">
          <h2 id="stripe-heading" className="mb-2 text-lg">Stripe</h2>
          <ul className="space-y-1">
            {payments.map((p) => (
              <li key={p.id} className="break-all">
                {p.status}: {p.stripe_payment_intent_id ?? p.stripe_session_id}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
