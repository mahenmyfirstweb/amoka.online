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

const { buildOrderEmail, notifyAdminOfOrder } = await import("@/lib/notify");

const order = {
  id: "order-1",
  order_number: "AM-10001",
  email: "customer@example.com",
  status: "paid",
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
});

describe("notifyAdminOfOrder", () => {
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

  it("sends to the admin address once the order is claimed", async () => {
    await notifyAdminOfOrder("order-1");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers["Idempotency-Key"]).toBe("order-order-1");
    expect(JSON.parse(init.body)).toMatchObject({ to: "owner@example.com", reply_to: "customer@example.com" });
  });

  it("sends nothing if another request already claimed the order", async () => {
    mocks.claim.mockResolvedValue({ data: null });
    await notifyAdminOfOrder("order-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing, without error, when email isn't set up", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(notifyAdminOfOrder("order-1")).resolves.toBeUndefined();
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("releases the claim and doesn't throw when sending fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => "down" });
    await expect(notifyAdminOfOrder("order-1")).resolves.toBeUndefined();
    expect(mocks.updates.at(-1)).toEqual({ admin_notified_at: null });
  });

  it("releases the claim when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    await expect(notifyAdminOfOrder("order-1")).resolves.toBeUndefined();
    expect(mocks.updates.at(-1)).toEqual({ admin_notified_at: null });
  });

  it("doesn't throw when the database fails", async () => {
    mocks.claim.mockRejectedValue(new Error("database down"));
    await expect(notifyAdminOfOrder("order-1")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
