import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, OrderItem } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  updates: [] as unknown[],
}));

// A chainable stand-in for the admin client's orders table.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (row: unknown) => {
        mocks.updates.push(row);
        const chain = {
          eq: () => chain,
          is: () => chain,
          or: () => chain,
          select: () => chain,
          maybeSingle: mocks.claim,
          then: (resolve: (v: unknown) => void) => resolve({ error: null }),
        };
        return chain;
      },
    }),
  }),
}));

const { buildCustomerEmail, buildOrderEmail, sendOrderEmails } = await import("@/lib/notify");

const order = {
  id: "order-1",
  order_number: "AM-10001",
  user_id: "user-1",
  email: "customer@example.com",
  status: "paid",
  payment_method: "online",
  access_token: "4a7b1e2c-8d3f-4c6a-9b1e-2f3a4b5c6d7e",
  subtotal_cents: 1000,
  shipping_cents: 600,
  total_cents: 1600,
  gst_rate_bp: 900,
  gst_cents: 132,
  gst_reg_no: null,
  shipping_address: {
    recipient_name: "Test Customer",
    phone: "91234567",
    street: "1 Serangoon Road",
    unit: "#08-03",
    building: null,
    postal_code: "218227",
  },
  needs_review: false,
  review_note: null,
  paid_at: "2026-11-01T02:00:00Z",
  shipped_at: null,
  delivered_at: null,
  created_at: "2026-11-01T01:00:00Z",
} as Order;

const items = [{
  id: "i1",
  product_name: "Toor Dhall",
  variant_label: "500g",
  image_path: null,
  unit_price_cents: 500,
  quantity: 2,
  line_total_cents: 1000,
}] as OrderItem[];

describe("buildOrderEmail", () => {
  it("includes what's needed to pack and ship the order", () => {
    const { subject, text } = buildOrderEmail(order, items);
    expect(subject).toBe("New order AM-10001: S$16.00");
    for (const part of ["2 x Toor Dhall (500g): S$10.00", "Total: S$16.00", "Includes 9% GST: S$1.32",
      "1 Serangoon Road, #08-03", "Singapore 218227", "91234567", "customer@example.com", "/admin/orders/order-1"]) {
      expect(text).toContain(part);
    }
  });

  it("escapes anything a customer typed", () => {
    const hostile = {
      ...order,
      shipping_address: { ...order.shipping_address, recipient_name: '<img src=x onerror="alert(1)">' },
    };
    const { html } = buildOrderEmail(hostile, items);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("flags orders needing review in the subject and body", () => {
    const { subject, text } = buildOrderEmail({ ...order, needs_review: true, review_note: "Stock ran out." }, items);
    expect(subject).toBe("Review needed: order AM-10001");
    expect(text).toContain("REVIEW NEEDED: Stock ran out.");
  });

  it("makes clear a pay-later order hasn't been paid, and who placed it", () => {
    const { subject, text } = buildOrderEmail({ ...order, payment_method: "pay_later", status: "pending", paid_at: null, user_id: null }, items);
    expect(subject).toBe("New pay-later order AM-10001: S$16.00");
    expect(text).toContain("PAY LATER, not paid yet");
    expect(text).toContain("customer@example.com (guest)");
  });
});

describe("buildCustomerEmail", () => {
  it("gives the customer their order and a link to view it", () => {
    const { subject, text } = buildCustomerEmail(order, items);
    expect(subject).toBe("Your amoka.online order AM-10001");
    expect(text).toContain("payment has been received");
    expect(text).toContain("2 x Toor Dhall (500g): S$10.00");
    expect(text).toContain(`/orders/order-1/confirmation?token=${order.access_token}`);
  });

  it("tells pay-later customers they'll be contacted about payment", () => {
    const { text } = buildCustomerEmail({ ...order, payment_method: "pay_later" }, items);
    expect(text).toContain("You chose to pay later: we'll contact you to arrange payment");
    expect(text).not.toContain("payment has been received");
  });
});

describe("sendOrderEmails", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updates.length = 0;
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "amoka.online <orders@amoka.online>";
    process.env.ADMIN_ORDER_EMAIL = "owner@example.com";
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetchMock.mockResolvedValue({ ok: true });
    mocks.claim.mockResolvedValue({ data: { ...order, order_items: items } });
  });

  afterEach(() => vi.unstubAllGlobals());

  const sent = () => fetchMock.mock.calls.map(([, init]) => ({ headers: init.headers, body: JSON.parse(init.body) }));

  it("emails the admin and the customer once each claim succeeds", async () => {
    await sendOrderEmails("order-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.resend.com/emails");

    const [toAdmin, toCustomer] = sent();
    expect(toAdmin.headers["Idempotency-Key"]).toBe("order-order-1");
    expect(toAdmin.body).toMatchObject({ to: "owner@example.com", reply_to: "customer@example.com" });
    expect(toCustomer.headers["Idempotency-Key"]).toBe("customer-order-order-1");
    expect(toCustomer.body).toMatchObject({ to: "customer@example.com", reply_to: "order@starlucents.com" });
  });

  it("claims each email separately", async () => {
    await sendOrderEmails("order-1");
    expect(mocks.updates.map((row) => Object.keys(row as object)[0])).toEqual([
      "admin_notified_at",
      "customer_notified_at",
    ]);
  });

  it("sends nothing if another request already claimed the order", async () => {
    mocks.claim.mockResolvedValue({ data: null });
    await sendOrderEmails("order-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing, without error, when email isn't set up", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendOrderEmails("order-1")).resolves.toBeUndefined();
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("releases the claim and doesn't throw when sending fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => "down" });
    await expect(sendOrderEmails("order-1")).resolves.toBeUndefined();
    expect(mocks.updates).toContainEqual({ admin_notified_at: null });
    expect(mocks.updates).toContainEqual({ customer_notified_at: null });
  });

  it("still emails the customer when the admin email fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    await sendOrderEmails("order-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mocks.updates).toContainEqual({ admin_notified_at: null });
    expect(mocks.updates).not.toContainEqual({ customer_notified_at: null });
  });

  it("doesn't throw when the database fails", async () => {
    mocks.claim.mockRejectedValue(new Error("database down"));
    await expect(sendOrderEmails("order-1")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
