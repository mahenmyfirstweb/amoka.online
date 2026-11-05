"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart, useQuote } from "@/components/store/cart-context";
import { formatPrice } from "@/lib/format";
import type { Address } from "@/lib/types";
import { guestDetailsSchema, type PaymentMethod } from "@/lib/validation";
import { AddressForm } from "./address-form";
import { MemberPrompt } from "./member-prompt";
import { OrderTotals } from "./order-totals";

const GUEST_FORM = "guest-details";

const GUEST_FIELDS = [
  { name: "email", label: "Email, for your order confirmation", type: "email", autoComplete: "email", required: true },
  { name: "recipient_name", label: "Recipient name", autoComplete: "name", required: true },
  { name: "phone", label: "Phone (8 digits)", type: "tel", autoComplete: "tel-national", inputMode: "tel", required: true },
  { name: "street", label: "Block and street", autoComplete: "street-address", required: true },
  { name: "unit", label: "Unit number, e.g. #08-03 (if any)", autoComplete: "address-line2" },
  { name: "building", label: "Building name (if any)", autoComplete: "off" },
  { name: "postal_code", label: "Postal code", autoComplete: "postal-code", inputMode: "numeric", required: true },
] as const;

const PAYMENT_OPTIONS: { value: PaymentMethod; title: string; detail: string }[] = [
  { value: "online", title: "Pay online", detail: "Pay securely now by card, PayNow or GrabPay with Stripe." },
  {
    value: "pay_later",
    title: "Place order & pay later",
    detail: "Submit your order now without paying. We'll contact you to arrange payment.",
  },
];

function formatAddress(a: Address) {
  return [a.street, a.unit, a.building, `Singapore ${a.postal_code}`].filter(Boolean).join(", ");
}

export function CheckoutForm({ account, addresses, cancelled }: {
  account: { email: string } | null;
  addresses: Address[];
  cancelled: boolean;
}) {
  const { items } = useCart();
  const { quote, loading, error: quoteError } = useQuote();
  const [addressId, setAddressId] = useState(
    (addresses.find((a) => a.is_default) ?? addresses[0])?.id ?? "",
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
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
  const payLater = paymentMethod === "pay_later";

  async function submit(guestForm: HTMLFormElement | null) {
    setError(null);

    let guest: unknown;
    if (guestForm) {
      const { email, ...address } = Object.fromEntries(new FormData(guestForm));
      const parsed = guestDetailsSchema.safeParse({ email, address });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      guest = parsed.data;
    }

    setPending(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, paymentMethod, ...(account ? { addressId: selectedAddress } : { guest }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.href = result.url;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  }

  const label = pending
    ? payLater ? "Placing your order..." : "Taking you to payment..."
    : payLater
      ? quote ? `Place order (${formatPrice(quote.total_cents)})` : "Place order"
      : quote ? `Pay ${formatPrice(quote.total_cents)}` : "Pay";

  return (
    <>
      {!account && <MemberPrompt />}
      <h1 className="mb-4 text-2xl">Checkout</h1>
      {cancelled && <p role="status" className="mb-4 rounded-lg bg-beige-tint p-3 text-sm">Payment cancelled. You haven&apos;t been charged.</p>}

      <div className="mx-auto max-w-xl space-y-6">
        <section aria-labelledby="address-heading">
          <h2 id="address-heading" className="mb-2 text-lg">{account ? "Delivery address" : "Your details"}</h2>
          <p className="mb-3 text-sm">We deliver within Singapore only.</p>

          {account ? (
            <>
              <p className="mb-3 text-sm">Ordering as <span className="font-semibold">{account.email}</span></p>
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
            </>
          ) : (
            <>
              <p className="mb-3 text-sm">
                Checking out as a guest.{" "}
                <Link href="/login?next=/checkout" className="underline underline-offset-2">Sign in or register</Link>
              </p>
              <form
                id={GUEST_FORM}
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(event.currentTarget);
                }}
                className="space-y-3"
              >
                {GUEST_FIELDS.map((f) => (
                  <div key={f.name}>
                    <label htmlFor={`guest-${f.name}`} className="mb-1 block text-sm font-medium">{f.label}</label>
                    <input
                      id={`guest-${f.name}`}
                      name={f.name}
                      type={"type" in f ? f.type : "text"}
                      required={"required" in f}
                      autoComplete={f.autoComplete}
                      inputMode={"inputMode" in f ? f.inputMode : undefined}
                      className="input"
                    />
                  </div>
                ))}
              </form>
            </>
          )}
        </section>

        <section aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="mb-2 text-lg">Payment</h2>
          <div role="radiogroup" aria-labelledby="payment-heading" className="space-y-2">
            {PAYMENT_OPTIONS.map((option) => (
              <label key={option.value} className="card flex cursor-pointer gap-3 p-3 has-checked:border-brown has-checked:bg-beige-tint">
                <input
                  type="radio"
                  name="payment_method"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => setPaymentMethod(option.value)}
                  className="mt-1 h-5 w-5 accent-brown"
                />
                <span className="text-sm">
                  <span className="block font-semibold">{option.title}</span>
                  {option.detail}
                </span>
              </label>
            ))}
          </div>
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
          {account ? (
            <button
              type="button"
              onClick={() => void submit(null)}
              disabled={pending || !quote || blocked || !selectedAddress}
              className="btn btn-primary w-full"
            >
              {label}
            </button>
          ) : (
            <button type="submit" form={GUEST_FORM} disabled={pending || !quote || blocked} className="btn btn-primary w-full">
              {label}
            </button>
          )}
          <p className="text-center text-sm">
            {payLater
              ? "You won't be charged now. We'll email your order details and contact you about payment."
              : "Pay securely by card, PayNow or GrabPay with Stripe."}
          </p>
        </div>
      </div>
    </>
  );
}
