import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCart } from "@/components/store/clear-cart";
import { OrderSummary } from "@/components/store/order-view";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/orders";
import { createStripe, recordPaidSession } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Order confirmation",
  description: "Your order confirmation.",
  robots: { index: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

// The webhook may not have arrived when the customer lands here, so ask Stripe directly.
// The URL proves nothing: only Stripe's answer for this exact order can mark it paid.
async function confirmWithStripe(orderId: string, sessionId: string) {
  try {
    const session = await createStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.order_id === orderId && session.payment_status === "paid") {
      await recordPaidSession(createAdminClient(), session);
    }
  } catch (e) {
    console.error("Stripe confirmation failed", e);
  }
}

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { session_id: sessionId } = await searchParams;
  await requireUser(`/orders/${id}/confirmation`);

  let result = await getOrder(id);
  if (!result) notFound();

  if (result.order.status === "pending" && sessionId) {
    await confirmWithStripe(id, sessionId);
    result = await getOrder(id);
    if (!result) notFound();
  }

  const { order, items } = result;
  const paid = order.status !== "pending" && order.status !== "cancelled";

  return (
    <>
      {paid && <ClearCart />}
      <div className="mb-6 rounded-xl bg-beige-tint p-5">
        {paid ? (
          <>
            <h1 className="text-2xl">Thank you for your order</h1>
            <p className="mt-1">Order {order.order_number} is confirmed. Stripe will email your receipt to {order.email}.</p>
          </>
        ) : order.status === "pending" ? (
          <>
            <h1 className="text-2xl">We&apos;re confirming your payment</h1>
            <p className="mt-1">This usually takes a moment. Refresh this page, or check your orders shortly.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl">This order was cancelled</h1>
            <p className="mt-1">Order {order.order_number} wasn&apos;t completed. If you were charged, please contact us.</p>
          </>
        )}
      </div>
      <OrderSummary order={order} items={items} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">Continue shopping</Link>
        <Link href={`/account/orders/${order.id}`} className="btn btn-outline">View order</Link>
      </div>
    </>
  );
}
