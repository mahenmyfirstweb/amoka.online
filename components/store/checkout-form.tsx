"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart, useQuote } from "@/components/store/cart-context";
import { formatPrice } from "@/lib/format";
import type { Address } from "@/lib/types";
import { AddressForm } from "./address-form";
import { OrderTotals } from "./order-totals";

function formatAddress(a: Address) {
  return [a.street, a.unit, a.building, `Singapore ${a.postal_code}`].filter(Boolean).join(", ");
}

export function CheckoutForm({ addresses, cancelled }: { addresses: Address[]; cancelled: boolean }) {
  const { items } = useCart();
  const { quote, loading, error: quoteError } = useQuote();
  const [addressId, setAddressId] = useState(
    (addresses.find((a) => a.is_default) ?? addresses[0])?.id ?? "",
  );
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && items.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl">Your cart is empty</h1>
        <Link href="/" className="btn btn-primary mt-4">Start shopping</Link>
      </div>
    );
  }

  const selectedAddress = addressId || addresses[0]?.id;
  const blocked = quote?.lines.some((l) => !l.available) ?? false;

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId: selectedAddress, items }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.href = result.url;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl">Checkout</h1>
      {cancelled && <p role="status" className="mb-4 rounded-lg bg-beige-tint p-3 text-sm">Payment cancelled. You haven&apos;t been charged.</p>}

      <div className="mx-auto max-w-xl space-y-6">
        <section aria-labelledby="address-heading">
          <h2 id="address-heading" className="mb-2 text-lg">Delivery address</h2>
          <p className="mb-3 text-sm">We deliver within Singapore only.</p>

          {addresses.length > 0 && (
            <div role="radiogroup" aria-labelledby="address-heading" className="space-y-2">
              {addresses.map((a) => (
                <label key={a.id} className="card flex cursor-pointer gap-3 p-3 has-checked:border-brown has-checked:bg-beige-tint">
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddress === a.id}
                    onChange={() => setAddressId(a.id)}
                    className="mt-1 h-5 w-5 accent-brown"
                  />
                  <span className="text-sm">
                    <span className="block font-semibold">{a.recipient_name}</span>
                    {formatAddress(a)}
                    <span className="block">{a.phone}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {addresses.length === 0 || adding ? (
            <div className="mt-3"><AddressForm onSaved={() => setAdding(false)} /></div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="btn btn-outline mt-3">Add a new address</button>
          )}
        </section>

        <section aria-labelledby="summary-heading" className="card space-y-3 p-4">
          <h2 id="summary-heading" className="text-lg">Your order</h2>
          {loading && <p role="status">Loading your order...</p>}
          {quoteError && <p role="alert" className="font-medium text-bark">We couldn&apos;t load your order. Please refresh the page.</p>}
          {quote && (
            <>
              <ul className="space-y-1 text-sm">
                {quote.lines.map((l) => (
                  <li key={l.variant_id} className="flex justify-between gap-3">
                    <span>{l.quantity} × {l.product_name ?? "Unavailable item"} {l.variant_label}</span>
                    <span>{formatPrice(l.line_total_cents)}</span>
                  </li>
                ))}
              </ul>
              <OrderTotals
                subtotal={quote.subtotal_cents}
                shipping={quote.shipping_cents}
                total={quote.total_cents}
                gst={quote.gst_cents}
                gstRateBp={quote.gst_rate_bp}
              />
            </>
          )}
        </section>

        {error && <p role="alert" className="rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">{error}</p>}
        {blocked && (
          <p role="alert" className="text-sm font-semibold text-bark">
            Some items are no longer available. <Link href="/cart" className="underline">Update your cart</Link> to continue.
          </p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={pay}
            disabled={pending || !quote || blocked || !selectedAddress}
            className="btn btn-primary w-full"
          >
            {pending ? "Taking you to payment..." : quote ? `Pay ${formatPrice(quote.total_cents)}` : "Pay"}
          </button>
          <p className="text-center text-sm">Pay securely by card, PayNow or GrabPay with Stripe.</p>
        </div>
      </div>
    </>
  );
}
