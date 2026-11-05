import { formatPrice } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";
import { PAYMENT_LABELS, STATUS_LABELS } from "./order-labels";
import { OrderTotals } from "./order-totals";
import { ProductImage } from "./product-image";

export { PAYMENT_LABELS, STATUS_LABELS };

export function StatusBadge({ status }: { status: Order["status"] }) {
  const style = status === "cancelled" ? "bg-beige-tint text-bark" : status === "delivered" ? "bg-brown text-white" : "bg-yellow text-brown";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>{STATUS_LABELS[status]}</span>;
}

export function ShippingAddress({ order }: { order: Order }) {
  const a = order.shipping_address;
  return (
    <address className="text-sm not-italic">
      <p className="font-semibold">{a.recipient_name}</p>
      <p>{a.street}{a.unit ? `, ${a.unit}` : ""}</p>
      {a.building && <p>{a.building}</p>}
      <p>Singapore {a.postal_code}</p>
      <p>{a.phone}</p>
    </address>
  );
}

export function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y divide-beige">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2">
          <div className="w-14 shrink-0"><ProductImage path={item.image_path} alt="" sizes="56px" /></div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">{item.product_name}</p>
            <p>{item.variant_label} × {item.quantity}</p>
          </div>
          <p className="text-sm font-semibold text-bark">{formatPrice(item.line_total_cents)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderSummary({ order, items }: { order: Order; items: OrderItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card p-4" aria-labelledby="items-heading">
        <h2 id="items-heading" className="mb-2 text-lg">Items</h2>
        <OrderItems items={items} />
      </section>
      <div className="space-y-4">
        <section className="card p-4" aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className="mb-2 text-lg">Delivery to</h2>
          <ShippingAddress order={order} />
        </section>
        <section className="card p-4" aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="mb-2 text-lg">Payment</h2>
          <p className="mb-2 text-sm">Method: {PAYMENT_LABELS[order.payment_method] ?? PAYMENT_LABELS.online}</p>
          <OrderTotals
            subtotal={order.subtotal_cents}
            shipping={order.shipping_cents}
            total={order.total_cents}
            gst={order.gst_cents}
            gstRateBp={order.gst_rate_bp}
          />
        </section>
      </div>
    </div>
  );
}
