import { site } from "@/config/site";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";
import { LogoImage } from "./logo";
import { PAYMENT_LABELS } from "./order-labels";
import { OrderTotals } from "./order-totals";
import { ShippingAddress } from "./order-view";

/**
 * The customer's invoice, laid out for printing. A paid order from a GST-registered store
 * is a tax invoice; an unpaid pay-later order shows the amount due instead.
 */
export function InvoiceDocument({ order, items }: { order: Order; items: OrderItem[] }) {
  const paid = order.paid_at !== null;
  const taxInvoice = paid && order.gst_rate_bp > 0;

  return (
    <article className="card space-y-6 bg-white p-6 text-sm text-bark sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-beige pb-5">
        <div>
          <LogoImage height={72} className="h-[72px] w-auto" />
          <h1 className="mt-3 text-2xl">{taxInvoice ? "Tax invoice" : "Invoice"}</h1>
          <p>Invoice no: <strong>{order.order_number}</strong></p>
          <p>Date: {formatDate(order.paid_at ?? order.created_at)}</p>
          <p>Payment: {PAYMENT_LABELS[order.payment_method]}{paid ? ", paid" : ", not yet paid"}</p>
        </div>
        <div className="sm:text-right">
          <p className="font-semibold">{site.legalName}</p>
          <p>UEN: {site.uen}</p>
          {order.gst_reg_no && <p>GST Reg No: {order.gst_reg_no}</p>}
          <p className="max-w-56 sm:ml-auto">{site.address}</p>
          <p>{site.email}</p>
          <p>{site.phone}</p>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-1 font-sans text-sm font-semibold uppercase tracking-wide">Bill and deliver to</h2>
          <ShippingAddress order={order} />
          <p className="mt-1">{order.email}</p>
        </section>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-brown">
            <th scope="col" className="py-2">Item</th>
            <th scope="col" className="py-2 text-right">Qty</th>
            <th scope="col" className="py-2 text-right">Unit price</th>
            <th scope="col" className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-beige">
              <td className="py-2">{item.product_name} ({item.variant_label})</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{formatPrice(item.unit_price_cents)}</td>
              <td className="py-2 text-right">{formatPrice(item.line_total_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs">
        <OrderTotals
          subtotal={order.subtotal_cents}
          shipping={order.shipping_cents}
          total={order.total_cents}
          gst={order.gst_cents}
          gstRateBp={order.gst_rate_bp}
        />
        {taxInvoice && <p className="mt-2">Amount before GST: {formatPrice(order.total_cents - order.gst_cents)}</p>}
        {!paid && order.status !== "cancelled" && (
          <p className="mt-3 rounded-lg bg-beige-tint p-2 font-semibold">Amount due: {formatPrice(order.total_cents)}</p>
        )}
      </div>

      <footer className="border-t border-beige pt-4 text-center text-xs">
        Thank you for shopping with {site.name}. Questions? {site.email} or {site.phone}.
      </footer>
    </article>
  );
}
