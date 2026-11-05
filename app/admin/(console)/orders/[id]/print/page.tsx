import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoImage } from "@/components/store/logo";
import { PAYMENT_LABELS, STATUS_LABELS } from "@/components/store/order-labels";
import { PrintButton } from "@/components/store/print-button";
import { ShippingAddress } from "@/components/store/order-view";
import { formatDate, formatPrice } from "@/lib/format";
import { getOrder } from "@/lib/orders";

export const metadata = { title: "Order sheet" };

/** A printable sheet for packing and delivering an order. */
export default async function OrderSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOrder(id);
  if (!result) notFound();
  const { order, items } = result;
  const units = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/orders/${id}`} className="text-sm underline underline-offset-2">Back to order</Link>
        <PrintButton label="Print order" />
      </div>

      <article className="card space-y-6 bg-white p-6 text-sm text-bark sm:p-8 print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-beige pb-4">
          <div>
            <h1 className="text-3xl">Order {order.order_number}</h1>
            <p>Placed {formatDate(order.created_at)}</p>
            <p>Status: <strong>{STATUS_LABELS[order.status]}</strong></p>
            <p>
              Payment: <strong>{PAYMENT_LABELS[order.payment_method]}</strong>
              {order.paid_at ? `, paid ${formatDate(order.paid_at)}` : ", not paid yet"}
            </p>
          </div>
          <LogoImage height={64} className="h-16 w-auto" />
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="mb-1 font-sans text-sm font-semibold uppercase tracking-wide">Deliver to</h2>
            <ShippingAddress order={order} />
          </section>
          <section>
            <h2 className="mb-1 font-sans text-sm font-semibold uppercase tracking-wide">Customer</h2>
            <p>{order.shipping_address.recipient_name}</p>
            <p>{order.email}</p>
            <p>{order.shipping_address.phone}</p>
            <p>{order.user_id ? "Registered customer" : "Guest checkout"}</p>
          </section>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-brown">
              <th scope="col" className="w-10 py-2"><span className="sr-only">Packed</span></th>
              <th scope="col" className="py-2">Item</th>
              <th scope="col" className="py-2">Size</th>
              <th scope="col" className="py-2 text-right">Qty</th>
              <th scope="col" className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-beige">
                <td className="py-2"><span aria-hidden="true" className="inline-block h-4 w-4 rounded border border-brown" /></td>
                <td className="py-2 font-medium">{item.product_name}</td>
                <td className="py-2">{item.variant_label}</td>
                <td className="py-2 text-right text-base font-bold">{item.quantity}</td>
                <td className="py-2 text-right">{formatPrice(item.line_total_cents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td colSpan={2} className="pt-3 font-semibold">{items.length} {items.length === 1 ? "line" : "lines"}, {units} {units === 1 ? "item" : "items"}</td>
              <td colSpan={2} className="pt-3 text-right">
                <span className="block">Shipping: {order.shipping_cents === 0 ? "Free" : formatPrice(order.shipping_cents)}</span>
                <span className="block text-base font-bold">Total: {formatPrice(order.total_cents)}</span>
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="grid gap-6 border-t border-beige pt-4 sm:grid-cols-2">
          <p>Packed by: ______________________</p>
          <p>Delivered on: ______________________</p>
        </div>
      </article>
    </div>
  );
}
