import "server-only";
import { site } from "@/config/site";
import { formatPrice, formatRate } from "./format";
import { createAdminClient } from "./supabase/admin";
import type { Order, OrderItem } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The link a customer, signed in or not, uses to see their order. */
export function orderLink(order: Pick<Order, "id" | "access_token">) {
  return `${site.url}/orders/${order.id}/confirmation?token=${order.access_token}`;
}

function orderLines(order: Order, items: OrderItem[]) {
  const a = order.shipping_address;
  return {
    items: items.map(
      (i) => `${i.quantity} x ${i.product_name} (${i.variant_label}): ${formatPrice(i.line_total_cents)}`,
    ),
    totals: [
      `Subtotal: ${formatPrice(order.subtotal_cents)}`,
      `Shipping: ${order.shipping_cents === 0 ? "Free" : formatPrice(order.shipping_cents)}`,
      `Total: ${formatPrice(order.total_cents)}`,
      ...(order.gst_rate_bp > 0 ? [`Includes ${formatRate(order.gst_rate_bp)} GST: ${formatPrice(order.gst_cents)}`] : []),
    ],
    address: [
      a.recipient_name,
      a.street + (a.unit ? `, ${a.unit}` : ""),
      a.building,
      `Singapore ${a.postal_code}`,
      a.phone,
    ].filter((line): line is string => Boolean(line)),
  };
}

// Addresses and names are typed by customers, so everything is escaped.
const htmlLines = (lines: string[]) => lines.map((l) => escapeHtml(l)).join("<br>");

export function buildOrderEmail(order: Order, items: OrderItem[]) {
  const adminUrl = `${site.url}/admin/orders/${order.id}`;
  const payLater = order.payment_method === "pay_later";
  const lines = orderLines(order, items);

  const subject = order.needs_review
    ? `Review needed: order ${order.order_number}`
    : payLater
      ? `New pay-later order ${order.order_number}: ${formatPrice(order.total_cents)}`
      : `New order ${order.order_number}: ${formatPrice(order.total_cents)}`;

  const payment = payLater
    ? "Payment: PAY LATER, not paid yet. Contact the customer to arrange payment, then mark the order paid in admin."
    : "Payment: paid online";

  const review = order.needs_review ? order.review_note ?? "This order needs review." : null;
  const customer = `Customer: ${order.email} (${order.user_id ? "account" : "guest"})`;

  const text = [
    ...(review ? [`REVIEW NEEDED: ${review}`, ""] : []),
    `Order ${order.order_number}`,
    customer,
    payment,
    "",
    "Items",
    ...lines.items,
    "",
    ...lines.totals,
    "",
    "Deliver to",
    ...lines.address,
    "",
    `Open in admin: ${adminUrl}`,
  ].join("\n");

  const html = [
    review ? `<p><strong>Review needed:</strong> ${escapeHtml(review)}</p>` : "",
    `<h2>Order ${escapeHtml(order.order_number)}</h2>`,
    `<p>${escapeHtml(customer)}<br>${payLater ? `<strong>${escapeHtml(payment)}</strong>` : escapeHtml(payment)}</p>`,
    `<h3>Items</h3><p>${htmlLines(lines.items)}</p>`,
    `<p>${htmlLines(lines.totals)}</p>`,
    `<h3>Deliver to</h3><p>${htmlLines(lines.address)}</p>`,
    `<p><a href="${escapeHtml(adminUrl)}">Open in admin</a></p>`,
  ].join("");

  return { subject, text, html };
}

export function buildCustomerEmail(order: Order, items: OrderItem[]) {
  const payLater = order.payment_method === "pay_later";
  const lines = orderLines(order, items);
  const link = orderLink(order);

  const subject = `Your ${site.name} order ${order.order_number}`;
  const intro = payLater
    ? `Thank you for your order. You chose to pay later: we'll contact you to arrange payment and delivery.`
    : `Thank you for your order. Your payment has been received and we're preparing your order.`;
  const contact = `Questions? Reply to this email, or call ${site.phone} (${site.supportHours}).`;

  const text = [
    intro,
    "",
    `Order ${order.order_number}`,
    "",
    "Items",
    ...lines.items,
    "",
    ...lines.totals,
    "",
    "Delivering to",
    ...lines.address,
    "",
    `View your order: ${link}`,
    "",
    contact,
    site.legalName,
  ].join("\n");

  const html = [
    `<p>${escapeHtml(intro)}</p>`,
    `<h2>Order ${escapeHtml(order.order_number)}</h2>`,
    `<h3>Items</h3><p>${htmlLines(lines.items)}</p>`,
    `<p>${htmlLines(lines.totals)}</p>`,
    `<h3>Delivering to</h3><p>${htmlLines(lines.address)}</p>`,
    `<p><a href="${escapeHtml(link)}">View your order</a></p>`,
    `<p>${escapeHtml(contact)}<br>${escapeHtml(site.legalName)}</p>`,
  ].join("");

  return { subject, text, html };
}

// Each email has its own claim column and its own rule for when it's ready to send.
// Pay-later orders are emailed as soon as they're placed; online orders once paid.
const EMAILS = {
  admin: {
    column: "admin_notified_at",
    ready: "paid_at.not.is.null,needs_review.eq.true,payment_method.eq.pay_later",
    idempotencyKey: (id: string) => `order-${id}`,
  },
  customer: {
    column: "customer_notified_at",
    ready: "payment_method.eq.pay_later,and(paid_at.not.is.null,needs_review.is.false)",
    idempotencyKey: (id: string) => `customer-order-${id}`,
  },
} as const;

async function sendOne(recipient: keyof typeof EMAILS, orderId: string, apiKey: string, from: string) {
  const { column, ready, idempotencyKey } = EMAILS[recipient];
  const admin = createAdminClient();

  // Claim first: whichever caller sets the column sends, so nothing is sent twice.
  const { data } = await admin
    .from("orders")
    .update({ [column]: new Date().toISOString() })
    .eq("id", orderId)
    .is(column, null)
    .or(ready)
    .select("*, order_items (*)")
    .maybeSingle();
  if (!data) return;

  const { order_items: items, ...rest } = data;
  const order = rest as Order;
  const email = recipient === "admin"
    ? { to: process.env.ADMIN_ORDER_EMAIL || site.email, reply_to: order.email, ...buildOrderEmail(order, items) }
    : { to: order.email, reply_to: site.email, ...buildCustomerEmail(order, items) };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey(orderId),
      },
      body: JSON.stringify({ from, ...email }),
    });
    if (!response.ok) throw new Error(`Resend replied ${response.status}: ${await response.text()}`);
  } catch (e) {
    // Release the claim so the next caller can try again.
    await admin.from("orders").update({ [column]: null }).eq("id", orderId);
    throw e;
  }
}

/**
 * Emails the store and the customer once per order: pay-later orders when placed,
 * online orders after payment. Called from checkout, the webhook and the confirmation
 * page, in any order. Never throws: a mail problem must not affect the order itself.
 */
export async function sendOrderEmails(orderId: string | null | undefined) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!orderId) return;
  if (!apiKey || !from) {
    console.warn("Order emails skipped: RESEND_API_KEY or EMAIL_FROM is not set");
    return;
  }

  for (const recipient of ["admin", "customer"] as const) {
    try {
      await sendOne(recipient, orderId, apiKey, from);
    } catch (e) {
      console.error(`Order email to ${recipient} failed for ${orderId}`, e);
    }
  }
}
