import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/store/print-button";
import { ShippingAddress } from "@/components/store/order-view";
import { OrderTotals } from "@/components/store/order-totals";
import { site } from "@/config/site";
import { formatDate, formatPrice } from "@/lib/format";
import { getOrder } from "@/lib/orders";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOrder(id);
  if (!result || !result.order.paid_at || result.order.status === "cancelled") notFound();
  const { order, items } = result;
  const taxInvoice = order.gst_rate_bp > 0;

  return (
    <article className="card space-y-5 bg-white p-6 text-sm">
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl">{taxInvoice ? "Tax invoice" : "Invoice"}</h1>
          <p>Invoice no: {order.order_number}</p>
          <p>Date: {formatDate(order.paid_at!)}</p>
        </div>
        <div className="sm:text-right">
          <p className="font-semibold">{site.legalName}</p>
          <p>UEN: {site.uen}</p>
          {order.gst_reg_no && <p>GST Reg No: {order.gst_reg_no}</p>}
          <p>{site.address}</p>
        </div>
      </header>

      <section>
        <h2 className="mb-1 font-semibold">Deliver to</h2>
        <ShippingAddress order={order} />
      </section>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-brown">
            <th scope="col" className="py-1.5">Item</th>
            <th scope="col" className="py-1.5 text-right">Qty</th>
            <th scope="col" className="py-1.5 text-right">Price</th>
            <th scope="col" className="py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-beige">
              <td className="py-1.5">{item.product_name} ({item.variant_label})</td>
              <td className="py-1.5 text-right">{item.quantity}</td>
              <td className="py-1.5 text-right">{formatPrice(item.unit_price_cents)}</td>
              <td className="py-1.5 text-right">{formatPrice(item.line_total_cents)}</td>
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
        {taxInvoice && (
          <p className="mt-2">Amount before GST: {formatPrice(order.total_cents - order.gst_cents)}</p>
        )}
      </div>

      <PrintButton />
    </article>
  );
}
