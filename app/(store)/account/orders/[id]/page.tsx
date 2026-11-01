import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderSummary, StatusBadge } from "@/components/store/order-view";
import { formatDate } from "@/lib/format";
import { getOrder } from "@/lib/orders";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOrder(id);
  if (!result) notFound();
  const { order, items } = result;
  const paid = order.paid_at !== null && order.status !== "cancelled";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mb-4 text-sm">Placed on {formatDate(order.created_at)}</p>
      <OrderSummary order={order} items={items} />
      {paid && (
        <Link href={`/account/orders/${order.id}/invoice`} className="btn btn-outline mt-4">
          {order.gst_rate_bp > 0 ? "View tax invoice" : "View invoice"}
        </Link>
      )}
    </>
  );
}
