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

export function buildOrderEmail(order: Order, items: OrderItem[]) {
  const a = order.shipping_address;
  const adminUrl = `${site.url}/admin/orders/${order.id}`;

  const subject = order.needs_review
    ? `Review needed: order ${order.order_number}`
    : `New order ${order.order_number}: ${formatPrice(order.total_cents)}`;

  const addressLines = [
    a.recipient_name,
    a.street + (a.unit ? `, ${a.unit}` : ""),
    a.building,
    `Singapore ${a.postal_code}`,
    a.phone,
  ].filter((line): line is string => Boolean(line));

  const itemLines = items.map(
    (i) => `${i.quantity} x ${i.product_name} (${i.variant_label}): ${formatPrice(i.line_total_cents)}`,
  );

  const totalLines = [
    `Subtotal: ${formatPrice(order.subtotal_cents)}`,
    `Shipping: ${order.shipping_cents === 0 ? "Free" : formatPrice(order.shipping_cents)}`,
    `Total: ${formatPrice(order.total_cents)}`,
    ...(order.gst_rate_bp > 0 ? [`Includes ${formatRate(order.gst_rate_bp)} GST: ${formatPrice(order.gst_cents)}`] : []),
  ];

  const review = order.needs_review ? order.review_note ?? "This order needs review." : null;

  const text = [
    ...(review ? [`REVIEW NEEDED: ${review}`, ""] : []),
    `Order ${order.order_number}`,
    `Customer: ${order.email}`,
    "",
    "Items",
    ...itemLines,
    "",
    ...totalLines,
    "",
    "Deliver to",
    ...addressLines,
    "",
    `Open in admin: ${adminUrl}`,
  ].join("\n");

  // Addresses and names are typed by customers, so everything is escaped.
  const list = (lines: string[]) => lines.map((l) => escapeHtml(l)).join("<br>");
  const html = [
    review ? `<p><strong>Review needed:</strong> ${escapeHtml(review)}</p>` : "",
    `<h2>Order ${escapeHtml(order.order_number)}</h2>`,
    `<p>Customer: ${escapeHtml(order.email)}</p>`,
    `<h3>Items</h3><p>${list(itemLines)}</p>`,
    `<p>${list(totalLines)}</p>`,
    `<h3>Deliver to</h3><p>${list(addressLines)}</p>`,
    `<p><a href="${escapeHtml(adminUrl)}">Open in admin</a></p>`,
  ].join("");

  return { subject, text, html };
}

/**
 * Emails the store once per order, after payment. Called from both the webhook and the
 * confirmation page, so it first claims the order: whichever gets there first sends.
 * Never throws: a mail problem must not affect a payment that has already succeeded.
 */
export async function notifyAdminOfOrder(orderId: string | null | undefined) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!orderId) return;
  if (!apiKey || !from) {
    console.warn("Order email skipped: RESEND_API_KEY or EMAIL_FROM is not set");
    return;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("orders")
      .update({ admin_notified_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("admin_notified_at", null)
      .or("paid_at.not.is.null,needs_review.eq.true")
      .select("*, order_items (*)")
      .maybeSingle();
    if (!data) return;

    const { order_items: items, ...order } = data;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `order-${orderId}`,
        },
        body: JSON.stringify({
          from,
          to: process.env.ADMIN_ORDER_EMAIL || site.email,
          reply_to: order.email,
          ...buildOrderEmail(order as Order, items as OrderItem[]),
        }),
      });
      if (!response.ok) throw new Error(`Resend replied ${response.status}: ${await response.text()}`);
    } catch (e) {
      // Release the claim so the next caller can try again.
      await admin.from("orders").update({ admin_notified_at: null }).eq("id", orderId);
      throw e;
    }
  } catch (e) {
    console.error(`Order email failed for ${orderId}`, e);
  }
}
