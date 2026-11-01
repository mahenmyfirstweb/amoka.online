import "server-only";
import Stripe from "stripe";

export function createStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

/** Records a paid Checkout Session. Safe to call repeatedly. */
export async function recordPaidSession(
  admin: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }> },
  session: Stripe.Checkout.Session,
) {
  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  const { error } = await admin.rpc("mark_order_paid", {
    p_session_id: session.id,
    p_payment_intent_id: paymentIntent ?? null,
    p_method: null,
    p_amount_cents: session.amount_total ?? 0,
    p_currency: session.currency ?? "",
  });
  if (error) throw new Error(error.message);
}
