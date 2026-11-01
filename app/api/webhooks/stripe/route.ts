import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { notifyAdminOfOrder } from "@/lib/notify";
import { createStripe, recordPaidSession } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe's own record of what happened, so a customer closing their browser after
// paying can't lose the order. Any non-2xx reply makes Stripe retry later.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // The signature covers the exact raw bytes, so read text and never re-serialise.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = createStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: seen } = await admin.from("webhook_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        // Delayed payment methods complete first and are paid later.
        if (event.data.object.payment_status === "paid") {
          await recordPaidSession(admin, event.data.object);
          await notifyAdminOfOrder(event.data.object.metadata?.order_id);
        }
        break;
      case "checkout.session.async_payment_succeeded":
        await recordPaidSession(admin, event.data.object);
        await notifyAdminOfOrder(event.data.object.metadata?.order_id);
        break;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const status = event.type === "checkout.session.expired" ? "expired" : "failed";
        const { error } = await admin.rpc("close_unpaid_session", {
          p_session_id: event.data.object.id,
          p_status: status,
        });
        if (error) throw new Error(error.message);
        break;
      }
    }
  } catch (e) {
    console.error(`Stripe webhook ${event.type} failed`, e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  // Recorded last: a failure above must stay retryable, and the handlers are safe to repeat.
  await admin.from("webhook_events").upsert({ id: event.id, type: event.type });
  return NextResponse.json({ received: true });
}
