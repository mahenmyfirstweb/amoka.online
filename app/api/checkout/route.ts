import { NextResponse } from "next/server";
import { site } from "@/config/site";
import { getUser } from "@/lib/auth";
import { createStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutSchema } from "@/lib/validation";

type PlacedOrder = {
  order_id: string;
  order_number: string;
  shipping_cents: number;
  total_cents: number;
  lines: {
    product_name: string;
    variant_label: string;
    unit_price_cents: number;
    quantity: number;
  }[];
};

// Stripe requires an expiry at least 30 minutes away. Stock is held slightly longer
// (see place_order), so a session always ends before its reservation does.
const SESSION_MINUTES = 31;

const CUSTOMER_ERRORS: [RegExp, string][] = [
  [/EMPTY_CART/, "Your cart is empty."],
  [/ADDRESS_NOT_FOUND/, "Please choose a delivery address."],
  [/ITEM_UNAVAILABLE/, "An item in your cart is no longer available."],
  [/INSUFFICIENT_STOCK/, "An item in your cart has just sold out. Please check your cart."],
  [/INVALID_QUANTITY/, "Please check the quantities in your cart."],
];

export async function POST(request: Request) {
  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Please sign in to check out." }, { status: 401 });
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your order and try again." }, { status: 400 });
  }

  const admin = createAdminClient();

  // The client sends only IDs and quantities. place_order prices everything itself.
  const { data, error } = await admin.rpc("place_order", {
    p_user_id: user.id,
    p_email: user.email,
    p_address_id: parsed.data.addressId,
    p_items: parsed.data.items,
  });

  if (error) {
    const known = CUSTOMER_ERRORS.find(([pattern]) => pattern.test(error.message));
    if (known) return NextResponse.json({ error: known[1] }, { status: 409 });
    console.error("place_order failed", error);
    return NextResponse.json({ error: "We couldn't place your order. Please try again." }, { status: 500 });
  }

  const order = data as PlacedOrder;
  let sessionId: string | undefined;

  try {
    const stripe = createStripe();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: user.email,
        client_reference_id: order.order_id,
        metadata: { order_id: order.order_id, order_number: order.order_number },
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
        success_url: `${site.url}/orders/${order.order_id}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site.url}/checkout?cancelled=1`,
        line_items: [
          ...order.lines.map((line) => ({
            quantity: line.quantity,
            price_data: {
              currency: "sgd",
              unit_amount: line.unit_price_cents,
              product_data: { name: `${line.product_name} (${line.variant_label})` },
            },
          })),
          ...(order.shipping_cents > 0
            ? [{
                quantity: 1,
                price_data: {
                  currency: "sgd",
                  unit_amount: order.shipping_cents,
                  product_data: { name: "Shipping" },
                },
              }]
            : []),
        ],
      },
      { idempotencyKey: `checkout-${order.order_id}` },
    );

    sessionId = session.id;
    if (!session.url) throw new Error("Stripe returned no checkout URL");

    const { error: paymentError } = await admin.from("payments").insert({
      order_id: order.order_id,
      stripe_session_id: session.id,
      amount_cents: order.total_cents,
    });
    if (paymentError) throw new Error(paymentError.message);

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout failed", e);
    await admin.from("orders").update({ status: "cancelled" }).eq("id", order.order_id);
    // Without a saved payment record, a session paid later could never match its order.
    if (sessionId) await createStripe().checkout.sessions.expire(sessionId).catch(() => undefined);
    return NextResponse.json({ error: "We couldn't start the payment. You haven't been charged." }, { status: 502 });
  }
}
