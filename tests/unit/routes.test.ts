import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const WEBHOOK_SECRET = "whsec_test_secret";
const VARIANT = "4a7b1e2c-8d3f-4c6a-9b1e-2f3a4b5c6d7e";
const ADDRESS = "5b8c2f3d-9e4a-4d7b-8c2f-3a4b5c6d7e8f";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  createSession: vi.fn(),
  expireSession: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  sendOrderEmails: mocks.notify,
  orderLink: (o: { id: string; access_token: string }) =>
    `http://localhost:3000/orders/${o.id}/confirmation?token=${o.access_token}`,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stripe")>();
  const real = new Stripe("sk_test_unused");
  return {
    ...actual,
    createStripe: () => ({
      webhooks: real.webhooks,
      checkout: { sessions: { create: mocks.createSession, expire: mocks.expireSession } },
    }),
  };
});

const { POST: webhook } = await import("@/app/api/webhooks/stripe/route");
const { POST: checkout } = await import("@/app/api/checkout/route");

// Records calls made to the fake admin client's tables.
function tables(seenEvent = false, insertError: unknown = null) {
  const calls = { upserts: [] as unknown[], updates: [] as unknown[], inserts: [] as unknown[] };
  mocks.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: seenEvent ? { id: "evt" } : null }) }) }),
    upsert: async (row: unknown) => {
      calls.upserts.push(row);
      return { error: null };
    },
    insert: async (row: unknown) => {
      calls.inserts.push(row);
      return { error: insertError };
    },
    update: (row: unknown) => {
      calls.updates.push(row);
      return { eq: async () => ({ error: null }) };
    },
  }));
  return calls;
}

function signedRequest(payload: string, secret = WEBHOOK_SECRET) {
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": header },
  });
}

const event = (type: string, object: Record<string, unknown>) =>
  JSON.stringify({ id: "evt_1", object: "event", type, data: { object } });

const paidSession = {
  id: "cs_1",
  object: "checkout.session",
  payment_status: "paid",
  payment_intent: "pi_1",
  amount_total: 1600,
  currency: "sgd",
  metadata: { order_id: "order-1" },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  mocks.rpc.mockResolvedValue({ data: null, error: null });
});

describe("Stripe webhook", () => {
  it("records a paid session using Stripe's amount", async () => {
    const calls = tables();
    const response = await webhook(signedRequest(event("checkout.session.completed", paidSession)));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("mark_order_paid", expect.objectContaining({
      p_session_id: "cs_1",
      p_payment_intent_id: "pi_1",
      p_amount_cents: 1600,
      p_currency: "sgd",
    }));
    expect(calls.upserts).toHaveLength(1);
    expect(mocks.notify).toHaveBeenCalledWith("order-1");
  });

  it("emails the admin only after the payment is recorded", async () => {
    tables();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database down" } });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await webhook(signedRequest(event("checkout.session.completed", paidSession)));
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("doesn't email the admin about an unpaid or expired session", async () => {
    tables();
    await webhook(signedRequest(event("checkout.session.completed", { ...paidSession, payment_status: "unpaid" })));
    await webhook(signedRequest(event("checkout.session.expired", paidSession)));
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("rejects a tampered body", async () => {
    tables();
    const signed = signedRequest(event("checkout.session.completed", paidSession));
    const header = signed.headers.get("stripe-signature")!;
    const tampered = event("checkout.session.completed", { ...paidSession, amount_total: 1 });

    const response = await webhook(new Request("http://localhost/", {
      method: "POST",
      body: tampered,
      headers: { "stripe-signature": header },
    }));

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects a signature made with the wrong secret", async () => {
    tables();
    const response = await webhook(signedRequest(event("checkout.session.completed", paidSession), "whsec_wrong"));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects a request with no signature", async () => {
    const response = await webhook(new Request("http://localhost/", { method: "POST", body: "{}" }));
    expect(response.status).toBe(400);
  });

  it("does nothing for an event it has already processed", async () => {
    tables(true);
    const response = await webhook(signedRequest(event("checkout.session.completed", paidSession)));
    expect(response.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("waits when a delayed payment hasn't settled", async () => {
    tables();
    await webhook(signedRequest(event("checkout.session.completed", { ...paidSession, payment_status: "unpaid" })));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("records a delayed payment when it succeeds", async () => {
    tables();
    await webhook(signedRequest(event("checkout.session.async_payment_succeeded", paidSession)));
    expect(mocks.rpc).toHaveBeenCalledWith("mark_order_paid", expect.anything());
  });

  it("closes expired and failed sessions", async () => {
    tables();
    await webhook(signedRequest(event("checkout.session.expired", paidSession)));
    expect(mocks.rpc).toHaveBeenCalledWith("close_unpaid_session", { p_session_id: "cs_1", p_status: "expired" });

    await webhook(signedRequest(event("checkout.session.async_payment_failed", paidSession)));
    expect(mocks.rpc).toHaveBeenCalledWith("close_unpaid_session", { p_session_id: "cs_1", p_status: "failed" });
  });

  it("asks Stripe to retry when processing fails, without marking the event done", async () => {
    const calls = tables();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database down" } });

    const response = await webhook(signedRequest(event("checkout.session.completed", paidSession)));

    expect(response.status).toBe(500);
    expect(calls.upserts).toEqual([]);
  });
});

describe("checkout", () => {
  const request = (body: unknown) => new Request("http://localhost/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const valid = { addressId: ADDRESS, paymentMethod: "online", items: [{ variant_id: VARIANT, quantity: 2 }] };
  const guest = {
    email: "guest@example.com",
    address: { recipient_name: "Guest", phone: "91234567", street: "1 Serangoon Road", unit: null, building: null, postal_code: "218227" },
  };
  const asGuest = { paymentMethod: "online", items: valid.items, guest };
  const placed = {
    order_id: "order-1",
    order_number: "AM-10001",
    access_token: "tok-1",
    shipping_cents: 600,
    total_cents: 1600,
    lines: [{ product_name: "Toor Dhall", variant_label: "500g", unit_price_cents: 500, quantity: 2 }],
  };

  beforeEach(() => {
    mocks.getUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    mocks.rpc.mockResolvedValue({ data: placed, error: null });
    mocks.createSession.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/x" });
    mocks.expireSession.mockResolvedValue({});
  });

  it("lets guests check out with the details they typed", async () => {
    tables();
    mocks.getUser.mockResolvedValue(null);
    const response = await checkout(request(asGuest));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("place_order", expect.objectContaining({
      p_user_id: null,
      p_email: "guest@example.com",
      p_address_id: null,
      p_address: guest.address,
      p_payment_method: "online",
    }));
    const session = mocks.createSession.mock.calls[0][0];
    expect(session.customer_email).toBe("guest@example.com");
    expect(session.success_url).toBe(
      "http://localhost:3000/orders/order-1/confirmation?token=tok-1&session_id={CHECKOUT_SESSION_ID}");
  });

  it("asks guests for their details and signed-in customers for an address", async () => {
    mocks.getUser.mockResolvedValue(null);
    expect((await checkout(request(valid))).status).toBe(400);
    mocks.getUser.mockResolvedValue({ id: "user-1", email: "a@example.com" });
    expect((await checkout(request(asGuest))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("uses the account's email and saved address for signed-in customers", async () => {
    tables();
    await checkout(request({ ...valid, guest }));
    expect(mocks.rpc).toHaveBeenCalledWith("place_order", expect.objectContaining({
      p_user_id: "user-1",
      p_email: "a@example.com",
      p_address_id: ADDRESS,
      p_address: null,
    }));
  });

  it("rejects invalid input before touching the database", async () => {
    tables();
    expect((await checkout(request({ addressId: "x", items: [] }))).status).toBe(400);
    expect((await checkout(request({ ...valid, paymentMethod: "cash" }))).status).toBe(400);
    mocks.getUser.mockResolvedValue(null);
    expect((await checkout(request({ ...asGuest, guest: { ...guest, email: "not-an-email" } }))).status).toBe(400);
    expect((await checkout(request({ ...asGuest, guest: { ...guest, address: { ...guest.address, postal_code: "123" } } }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("places a pay-later order without Stripe and emails it straight away", async () => {
    tables();
    mocks.getUser.mockResolvedValue(null);
    const response = await checkout(request({ ...asGuest, paymentMethod: "pay_later" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "http://localhost:3000/orders/order-1/confirmation?token=tok-1" });
    expect(mocks.rpc.mock.calls[0][1].p_payment_method).toBe("pay_later");
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.notify).toHaveBeenCalledWith("order-1");
  });

  it("explains when a customer has too many unpaid pay-later orders", async () => {
    tables();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "TOO_MANY_OPEN_ORDERS" } });
    const response = await checkout(request({ ...valid, paymentMethod: "pay_later" }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/unpaid pay-later orders/);
  });

  it("charges the server's prices and ignores any price the client sends", async () => {
    const calls = tables();
    const body = { ...valid, total_cents: 1, items: [{ ...valid.items[0], price_cents: 1 }] };

    const response = await checkout(request(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/x" });

    expect(mocks.rpc.mock.calls[0][1].p_items).toEqual(valid.items);

    const session = mocks.createSession.mock.calls[0][0];
    const sum = session.line_items.reduce(
      (total: number, l: { quantity: number; price_data: { unit_amount: number; currency: string } }) => {
        expect(l.price_data.currency).toBe("sgd");
        return total + l.quantity * l.price_data.unit_amount;
      },
      0,
    );
    expect(sum).toBe(placed.total_cents);
    expect(session.metadata.order_id).toBe("order-1");
    expect(calls.inserts).toEqual([{ order_id: "order-1", stripe_session_id: "cs_1", amount_cents: 1600 }]);
    // Online orders are only emailed once Stripe confirms payment.
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("leaves out the shipping line when shipping is free", async () => {
    tables();
    mocks.rpc.mockResolvedValue({ data: { ...placed, shipping_cents: 0, total_cents: 1000 }, error: null });
    await checkout(request(valid));
    expect(mocks.createSession.mock.calls[0][0].line_items).toHaveLength(1);
  });

  it("gives customers a clear message when stock runs out", async () => {
    tables();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "INSUFFICIENT_STOCK:abc" } });
    const response = await checkout(request(valid));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/sold out/);
  });

  it("cancels the order, releasing stock, when Stripe fails", async () => {
    const calls = tables();
    mocks.createSession.mockRejectedValue(new Error("Stripe is down"));
    const response = await checkout(request(valid));
    expect(response.status).toBe(502);
    expect(calls.updates).toEqual([{ status: "cancelled" }]);
    expect(mocks.expireSession).not.toHaveBeenCalled();
  });

  it("closes the Stripe session if the payment record can't be saved", async () => {
    const calls = tables(false, { message: "insert failed" });
    const response = await checkout(request(valid));
    expect(response.status).toBe(502);
    expect(calls.updates).toEqual([{ status: "cancelled" }]);
    expect(mocks.expireSession).toHaveBeenCalledWith("cs_1");
  });
});
