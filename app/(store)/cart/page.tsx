"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart, useQuote } from "@/components/store/cart-context";
import { OrderTotals } from "@/components/store/order-totals";
import { ProductImage } from "@/components/store/product-image";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, setQuantity, remove } = useCart();
  const { quote, error, loading } = useQuote();

  if (items.length === 0 && !loading) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl">Your cart is empty</h1>
        <Link href="/" className="btn btn-primary mt-4">Start shopping</Link>
      </div>
    );
  }

  const lines = quote?.lines ?? [];
  const blocked = lines.some((l) => !l.available);
  const toFree = quote ? quote.free_shipping_threshold_cents - quote.subtotal_cents : 0;

  return (
    <>
      <h1 className="mb-4 text-2xl">Your cart</h1>
      {error && <p role="alert" className="mb-3 font-medium text-bark">We couldn&apos;t load your cart. Please refresh the page.</p>}
      {loading && <p role="status">Loading your cart...</p>}

      {quote && (
        <div className="grid gap-6 md:grid-cols-3">
          <ul className="space-y-3 md:col-span-2">
            {lines.map((line) => (
              <li key={line.variant_id} className="card flex gap-3 p-3">
                <div className="w-20 shrink-0">
                  <ProductImage path={line.image_path} alt="" sizes="80px" />
                </div>
                <div className="min-w-0 flex-1">
                  {line.product_slug ? (
                    <Link href={`/p/${line.product_slug}`} className="font-medium">{line.product_name}</Link>
                  ) : (
                    <p className="font-medium">Item no longer available</p>
                  )}
                  {line.variant_label && <p className="text-sm">{line.variant_label}</p>}
                  {!line.available && line.product_slug && (
                    <p role="alert" className="mt-1 text-sm font-semibold text-bark">
                      {line.stock > 0 ? `Only ${line.stock} left. Please reduce the quantity.` : "Sold out. Please remove this item."}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Reduce quantity of ${line.product_name}`}
                        onClick={() => setQuantity(line.variant_id, line.quantity - 1)}
                        className="btn btn-outline h-11 min-h-11 w-11 p-0"
                      >
                        <Minus aria-hidden="true" size={16} />
                      </button>
                      <span aria-live="polite" className="w-8 text-center">{line.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${line.product_name}`}
                        disabled={line.quantity >= line.stock}
                        onClick={() => setQuantity(line.variant_id, line.quantity + 1)}
                        className="btn btn-outline h-11 min-h-11 w-11 p-0"
                      >
                        <Plus aria-hidden="true" size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${line.product_name}`}
                        onClick={() => remove(line.variant_id)}
                        className="ml-1 flex h-11 w-11 items-center justify-center"
                      >
                        <Trash2 aria-hidden="true" size={18} />
                      </button>
                    </div>
                    <p className="font-semibold text-bark">{formatPrice(line.line_total_cents)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <section aria-label="Order summary" className="card h-fit space-y-3 p-4">
            <OrderTotals
              subtotal={quote.subtotal_cents}
              shipping={quote.shipping_cents}
              total={quote.total_cents}
              gst={quote.gst_cents}
              gstRateBp={quote.gst_rate_bp}
            />
            {toFree > 0 && <p className="text-sm">Add {formatPrice(toFree)} more for free shipping.</p>}
            {blocked ? (
              <p className="text-sm font-semibold text-bark">Fix the items marked above to continue.</p>
            ) : (
              <Link href="/checkout" className="btn btn-primary w-full">Go to checkout</Link>
            )}
          </section>
        </div>
      )}
    </>
  );
}
