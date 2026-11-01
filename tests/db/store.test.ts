import { beforeAll, describe, expect, it } from "vitest";
import { as, createAddress, createDb, createProduct, createUser, stockOf, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let admin: string;
let aliceAddress: string;
let bobAddress: string;
let counter = 0;

const items = (variantId: string, quantity = 1) =>
  JSON.stringify([{ variant_id: variantId, quantity }]);

function product(priceCents: number, stock: number, extra: { active?: boolean } = {}) {
  counter += 1;
  return createProduct(db, { name: `Product ${counter}`, slug: `product-${counter}`, priceCents, stock, ...extra });
}

async function placeOrder(userId: string, addressId: string, variantId: string, quantity = 1) {
  const { rows } = await as<{ place_order: { order_id: string; total_cents: number; shipping_cents: number } }>(
    db,
    "service_role",
    null,
    "select public.place_order($1, $2, $3, $4::jsonb)",
    [userId, "x@example.com", addressId, items(variantId, quantity)],
  );
  return rows[0].place_order;
}

async function attachSession(orderId: string, session: string, amount: number) {
  await as(db, "service_role", null,
    "insert into public.payments (order_id, stripe_session_id, amount_cents) values ($1, $2, $3)",
    [orderId, session, amount]);
}

async function markPaid(session: string, amount: number, currency = "sgd") {
  const { rows } = await as<{ mark_order_paid: string }>(db, "service_role", null,
    "select public.mark_order_paid($1, 'pi_test', 'paynow', $2, $3)", [session, amount, currency]);
  return rows[0].mark_order_paid;
}

async function order(orderId: string) {
  const { rows } = await db.query<Record<string, unknown>>("select * from public.orders where id = $1", [orderId]);
  return rows[0];
}

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com");
  bob = await createUser(db, "bob@example.com");
  admin = await createUser(db, "admin@example.com");
  await db.query("update public.profiles set role = 'admin' where id = $1", [admin]);
  aliceAddress = await createAddress(db, alice);
  bobAddress = await createAddress(db, bob);
}, 60_000);

describe("schema", () => {
  it("seeds 20 categories and one settings row", async () => {
    const { rows } = await db.query<{ n: number }>("select count(*)::int n from public.categories");
    expect(rows[0].n).toBe(20);
    const settings = await db.query<{ shipping_fee_cents: number; gst_rate_bp: number }>(
      "select * from public.store_settings");
    expect(settings.rows).toHaveLength(1);
    expect(settings.rows[0].shipping_fee_cents).toBe(600);
    expect(settings.rows[0].gst_rate_bp).toBe(900);
  });

  it("has RLS enabled on every public table", async () => {
    const { rows } = await db.query<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(rows).toEqual([]);
  });

  it("creates a profile on signup with the customer role", async () => {
    const { rows } = await db.query<{ role: string; email: string }>(
      "select role, email from public.profiles where id = $1", [alice]);
    expect(rows[0]).toEqual({ role: "customer", email: "alice@example.com" });
  });
});

describe("access control", () => {
  it("blocks customers from making themselves admin", async () => {
    await expect(
      as(db, "authenticated", alice, "update public.profiles set role = 'admin' where id = $1", [alice]),
    ).rejects.toThrow(/ROLE_CHANGE_NOT_ALLOWED/);
  });

  it("lets customers edit their own name, but not someone else's", async () => {
    await as(db, "authenticated", alice, "update public.profiles set full_name = 'Alice' where id = $1", [alice]);
    await as(db, "authenticated", alice, "update public.profiles set full_name = 'Hacked' where id = $1", [bob]);
    const { rows } = await db.query<{ id: string; full_name: string | null }>(
      "select id, full_name from public.profiles where id in ($1, $2)", [alice, bob]);
    expect(rows.find((r) => r.id === alice)?.full_name).toBe("Alice");
    expect(rows.find((r) => r.id === bob)?.full_name).toBeNull();
  });

  it("hides one customer's addresses from another", async () => {
    const { rows } = await as(db, "authenticated", alice, "select * from public.addresses where id = $1", [bobAddress]);
    expect(rows).toEqual([]);
  });

  it("hides one customer's orders, items and payments from another", async () => {
    const { variantId } = await product(1000, 10);
    const placed = await placeOrder(bob, bobAddress, variantId);
    await attachSession(placed.order_id, `sess-private-${placed.order_id}`, placed.total_cents);

    for (const table of ["orders", "order_items", "payments"]) {
      const column = table === "orders" ? "id" : "order_id";
      const other = await as(db, "authenticated", alice,
        `select * from public.${table} where ${column} = $1`, [placed.order_id]);
      expect(other.rows).toEqual([]);
      const owner = await as(db, "authenticated", bob,
        `select * from public.${table} where ${column} = $1`, [placed.order_id]);
      expect(owner.rows).toHaveLength(1);
      const staff = await as(db, "authenticated", admin,
        `select * from public.${table} where ${column} = $1`, [placed.order_id]);
      expect(staff.rows).toHaveLength(1);
    }
  });

  it("stops customers writing orders or payments directly", async () => {
    const { variantId } = await product(1000, 10);
    const placed = await placeOrder(alice, aliceAddress, variantId);

    await expect(as(db, "authenticated", alice,
      `insert into public.orders (user_id, email, subtotal_cents, shipping_cents, total_cents, shipping_address)
       values ($1, 'a@b.c', 1, 0, 1, '{}')`, [alice])).rejects.toThrow(/row-level security|permission denied/);

    const updated = await as(db, "authenticated", alice,
      "update public.orders set status = 'paid' where id = $1 returning id", [placed.order_id]);
    expect(updated.rows).toEqual([]);
    expect((await order(placed.order_id)).status).toBe("pending");

    await expect(as(db, "authenticated", alice,
      "insert into public.payments (order_id, stripe_session_id, amount_cents, status) values ($1, 'x', 1, 'paid')",
      [placed.order_id])).rejects.toThrow(/permission denied/);
  });

  it("stops customers and guests running server-only functions", async () => {
    const { variantId } = await product(1000, 10);
    await expect(as(db, "authenticated", alice, "select public.place_order($1, 'a', $2, $3::jsonb)",
      [alice, aliceAddress, items(variantId)])).rejects.toThrow(/permission denied/);
    await expect(as(db, "authenticated", alice,
      "select public.mark_order_paid('s', 'p', 'card', 1, 'sgd')")).rejects.toThrow(/permission denied/);
    await expect(as(db, "anon", null,
      "select public.release_expired_orders()")).rejects.toThrow(/permission denied/);
    await expect(as(db, "authenticated", alice,
      "select public.close_unpaid_session('s', 'expired')")).rejects.toThrow(/permission denied/);
  });

  it("stops non-admins changing the catalogue or settings", async () => {
    await expect(as(db, "anon", null, "update public.products set name = 'x'")).rejects.toThrow(/permission denied/);
    await expect(as(db, "authenticated", alice,
      "insert into public.categories (name, slug) values ('x', 'x')")).rejects.toThrow(/row-level security/);
    const prices = await as(db, "authenticated", alice,
      "update public.product_variants set price_cents = 1 returning id");
    expect(prices.rows).toEqual([]);
    const settings = await as(db, "authenticated", alice,
      "update public.store_settings set shipping_fee_cents = 0 returning id");
    expect(settings.rows).toEqual([]);
  });

  it("keeps webhook events private", async () => {
    await expect(as(db, "authenticated", alice, "select * from public.webhook_events")).rejects.toThrow(/permission denied/);
    await expect(as(db, "anon", null, "select * from public.webhook_events")).rejects.toThrow(/permission denied/);
  });

  it("hides inactive products and their variants from the public", async () => {
    const { productId, variantId } = await product(1000, 10, { active: false });
    expect((await as(db, "anon", null, "select id from public.products where id = $1", [productId])).rows).toEqual([]);
    expect((await as(db, "anon", null, "select id from public.product_variants where id = $1", [variantId])).rows).toEqual([]);
    expect((await as(db, "authenticated", admin, "select id from public.products where id = $1", [productId])).rows).toHaveLength(1);
  });

  it("lets admins manage the catalogue", async () => {
    const { rows } = await as(db, "authenticated", admin,
      "insert into public.categories (name, slug) values ('Admin Test', 'admin-test') returning id");
    expect(rows).toHaveLength(1);
    await db.query("delete from public.categories where slug = 'admin-test'");
  });

  it("refuses to delete a category that still has products", async () => {
    await product(1000, 1);
    await expect(as(db, "authenticated", admin,
      "delete from public.categories where slug = 'groceries'")).rejects.toThrow(/foreign key/);
  });
});

describe("totals", () => {
  const totals = async (subtotal: number) => (await db.query<Record<string, number | null>>(
    "select * from public.compute_totals($1)", [subtotal])).rows[0];

  it("charges shipping below the threshold and not at or above it", async () => {
    expect((await totals(5999)).shipping_cents).toBe(600);
    expect((await totals(6000)).shipping_cents).toBe(0);
    expect((await totals(0)).shipping_cents).toBe(0);
  });

  it("works out the GST included in the total, shipping included", async () => {
    const t = await totals(10900);
    expect(t.total_cents).toBe(10900);
    expect(t.gst_cents).toBe(900);
    const withShipping = await totals(1000);
    expect(withShipping.total_cents).toBe(1600);
    expect(withShipping.gst_cents).toBe(132); // 1600 * 9 / 109 = 132.1
  });

  it("drops GST when the store isn't registered", async () => {
    await db.query("update public.store_settings set gst_registered = false");
    const t = await totals(10900);
    expect(t.gst_cents).toBe(0);
    expect(t.gst_rate_bp).toBe(0);
    await db.query("update public.store_settings set gst_registered = true");
  });
});

describe("place_order", () => {
  it("uses database prices, reserves stock and snapshots the order", async () => {
    await db.query("update public.store_settings set gst_reg_no = 'M9-1234567-X'");
    const { variantId } = await product(2500, 10);
    const placed = await placeOrder(alice, aliceAddress, variantId, 2);

    expect(placed.total_cents).toBe(5600);
    expect(placed.shipping_cents).toBe(600);
    expect(await stockOf(db, variantId)).toBe(8);

    const row = await order(placed.order_id);
    expect(row.status).toBe("pending");
    expect(row.gst_cents).toBe(462); // 5600 * 9 / 109
    expect(row.gst_reg_no).toBe("M9-1234567-X");
    expect((row.shipping_address as { postal_code: string }).postal_code).toBe("218227");
    expect(row.order_number).toMatch(/^AM-\d+$/);

    await db.query("update public.product_variants set price_cents = 1 where id = $1", [variantId]);
    const lines = await db.query<{ unit_price_cents: number }>(
      "select unit_price_cents from public.order_items where order_id = $1", [placed.order_id]);
    expect(lines.rows[0].unit_price_cents).toBe(2500);
  });

  it("refuses more than the available stock and keeps stock unchanged", async () => {
    const { variantId } = await product(1000, 2);
    await expect(placeOrder(alice, aliceAddress, variantId, 3)).rejects.toThrow(/INSUFFICIENT_STOCK/);
    expect(await stockOf(db, variantId)).toBe(2);
  });

  it("adds up the same variant listed twice", async () => {
    const { variantId } = await product(1000, 3);
    await expect(as(db, "service_role", null, "select public.place_order($1, 'a@b.c', $2, $3::jsonb)", [
      alice, aliceAddress,
      JSON.stringify([{ variant_id: variantId, quantity: 2 }, { variant_id: variantId, quantity: 2 }]),
    ])).rejects.toThrow(/INSUFFICIENT_STOCK/);
  });

  it("refuses hidden products, unknown items, empty carts and bad quantities", async () => {
    const hidden = await product(1000, 5, { active: false });
    await expect(placeOrder(alice, aliceAddress, hidden.variantId)).rejects.toThrow(/ITEM_UNAVAILABLE/);
    await expect(placeOrder(alice, aliceAddress, "00000000-0000-0000-0000-000000000000")).rejects.toThrow(/ITEM_UNAVAILABLE/);
    await expect(as(db, "service_role", null, "select public.place_order($1, 'a@b.c', $2, '[]'::jsonb)",
      [alice, aliceAddress])).rejects.toThrow(/EMPTY_CART/);
    const { variantId } = await product(1000, 5);
    await expect(placeOrder(alice, aliceAddress, variantId, -1)).rejects.toThrow(/INVALID_QUANTITY/);
    await expect(placeOrder(alice, aliceAddress, variantId, 0)).rejects.toThrow(/INVALID_QUANTITY/);
  });

  it("refuses another customer's address", async () => {
    const { variantId } = await product(1000, 5);
    await expect(placeOrder(alice, bobAddress, variantId)).rejects.toThrow(/ADDRESS_NOT_FOUND/);
  });

  it("cancels the customer's earlier unpaid order on retry, returning its stock", async () => {
    const { variantId } = await product(1000, 5);
    const first = await placeOrder(alice, aliceAddress, variantId, 2);
    expect(await stockOf(db, variantId)).toBe(3);
    await placeOrder(alice, aliceAddress, variantId, 1);
    expect((await order(first.order_id)).status).toBe("cancelled");
    expect(await stockOf(db, variantId)).toBe(4);
  });
});

describe("payments", () => {
  it("marks an order paid once, however many times it's called", async () => {
    const { variantId } = await product(1000, 5);
    const placed = await placeOrder(alice, aliceAddress, variantId);
    const session = `sess-${placed.order_id}`;
    await attachSession(placed.order_id, session, placed.total_cents);

    expect(await markPaid(session, placed.total_cents)).toBe("paid");
    expect(await markPaid(session, placed.total_cents)).toBe("already_paid");

    const row = await order(placed.order_id);
    expect(row.status).toBe("paid");
    expect(row.expires_at).toBeNull();
    expect(row.paid_at).not.toBeNull();
    expect(await stockOf(db, variantId)).toBe(4);
  });

  it("flags a wrong amount or currency and doesn't mark the order paid", async () => {
    const { variantId } = await product(1000, 5);
    const placed = await placeOrder(alice, aliceAddress, variantId);
    const session = `sess-${placed.order_id}`;
    await attachSession(placed.order_id, session, placed.total_cents);

    expect(await markPaid(session, 1)).toBe("amount_mismatch");
    const row = await order(placed.order_id);
    expect(row.status).toBe("pending");
    expect(row.needs_review).toBe(true);

    const second = await placeOrder(bob, bobAddress, variantId);
    const secondSession = `sess-${second.order_id}`;
    await attachSession(second.order_id, secondSession, second.total_cents);
    expect(await markPaid(secondSession, second.total_cents, "usd")).toBe("amount_mismatch");
  });

  it("rejects a session it doesn't know", async () => {
    await expect(markPaid("nope", 100)).rejects.toThrow(/PAYMENT_NOT_FOUND/);
  });

  it("clears paid items from the customer's cart", async () => {
    const { variantId } = await product(1000, 5);
    await as(db, "authenticated", bob, "select public.sync_cart($1::jsonb, true)", [items(variantId, 2)]);
    const placed = await placeOrder(bob, bobAddress, variantId, 2);
    const session = `sess-${placed.order_id}`;
    await attachSession(placed.order_id, session, placed.total_cents);
    await markPaid(session, placed.total_cents);
    const { rows } = await as(db, "authenticated", bob,
      "select * from public.cart_items where variant_id = $1", [variantId]);
    expect(rows).toEqual([]);
  });

  it("recovers a late payment when stock is still available", async () => {
    const { variantId } = await product(1000, 5);
    const placed = await placeOrder(alice, aliceAddress, variantId, 2);
    const session = `sess-${placed.order_id}`;
    await attachSession(placed.order_id, session, placed.total_cents);

    await as(db, "service_role", null, "select public.close_unpaid_session($1, 'expired')", [session]);
    expect(await stockOf(db, variantId)).toBe(5);

    await db.query("update public.payments set status = 'created' where stripe_session_id = $1", [session]);
    expect(await markPaid(session, placed.total_cents)).toBe("paid");
    const row = await order(placed.order_id);
    expect(row.status).toBe("paid");
    expect(row.stock_reserved).toBe(true);
    expect(await stockOf(db, variantId)).toBe(3);
  });

  it("flags a late payment for review when stock has gone", async () => {
    const { variantId } = await product(1000, 2);
    const placed = await placeOrder(alice, aliceAddress, variantId, 2);
    const session = `sess-${placed.order_id}`;
    await attachSession(placed.order_id, session, placed.total_cents);
    await db.query("update public.orders set status = 'cancelled' where id = $1", [placed.order_id]);
    await db.query("update public.product_variants set stock = 0 where id = $1", [variantId]);

    expect(await markPaid(session, placed.total_cents)).toBe("late_needs_review");
    const row = await order(placed.order_id);
    expect(row.status).toBe("cancelled");
    expect(row.needs_review).toBe(true);
    expect(await stockOf(db, variantId)).toBe(0);
  });

  it("returns stock when a session expires, once only", async () => {
    const { variantId } = await product(1000, 5);
    const placed = await placeOrder(alice, aliceAddress, variantId, 3);
    const session = `sess-${placed.order_id}`;
    await attachSession(placed.order_id, session, placed.total_cents);

    await as(db, "service_role", null, "select public.close_unpaid_session($1, 'expired')", [session]);
    await as(db, "service_role", null, "select public.close_unpaid_session($1, 'expired')", [session]);
    expect((await order(placed.order_id)).status).toBe("cancelled");
    expect(await stockOf(db, variantId)).toBe(5);
  });

  it("doesn't let a late expiry event cancel a paid order", async () => {
    const { variantId } = await product(1000, 5);
    const placed = await placeOrder(alice, aliceAddress, variantId);
    const session = `sess-${placed.order_id}`;
    await attachSession(placed.order_id, session, placed.total_cents);
    await markPaid(session, placed.total_cents);
    await as(db, "service_role", null, "select public.close_unpaid_session($1, 'expired')", [session]);
    expect((await order(placed.order_id)).status).toBe("paid");
  });

  it("releases only orders past their expiry", async () => {
    const { variantId } = await product(1000, 5);
    const expired = await placeOrder(alice, aliceAddress, variantId, 2);
    const live = await placeOrder(bob, bobAddress, variantId, 1);
    await db.query("update public.orders set expires_at = now() - interval '1 minute' where id = $1", [expired.order_id]);

    await as(db, "service_role", null, "select public.release_expired_orders()");
    expect((await order(expired.order_id)).status).toBe("cancelled");
    expect((await order(live.order_id)).status).toBe("pending");
    expect(await stockOf(db, variantId)).toBe(4);
  });
});

describe("order status changes by admins", () => {
  const setStatus = (orderId: string, status: string) =>
    as(db, "authenticated", admin, "update public.orders set status = $1 where id = $2 returning status", [status, orderId]);

  async function paidOrder(stock = 5) {
    const { variantId } = await product(1000, stock);
    const placed = await placeOrder(alice, aliceAddress, variantId);
    const session = `sess-${placed.order_id}`;
    await attachSession(placed.order_id, session, placed.total_cents);
    await markPaid(session, placed.total_cents);
    return { orderId: placed.order_id, variantId };
  }

  it("follows paid, shipped, delivered and stamps each step", async () => {
    const { orderId } = await paidOrder();
    await setStatus(orderId, "shipped");
    await setStatus(orderId, "delivered");
    const row = await order(orderId);
    expect(row.status).toBe("delivered");
    expect(row.shipped_at).not.toBeNull();
    expect(row.delivered_at).not.toBeNull();
  });

  it("refuses to move backwards or skip steps", async () => {
    const { orderId } = await paidOrder();
    await expect(setStatus(orderId, "delivered")).rejects.toThrow(/INVALID_STATUS_CHANGE/);
    await setStatus(orderId, "shipped");
    await expect(setStatus(orderId, "paid")).rejects.toThrow(/INVALID_STATUS_CHANGE/);
    await expect(setStatus(orderId, "cancelled")).rejects.toThrow(/INVALID_STATUS_CHANGE/);
  });

  it("returns stock when an admin cancels a paid order", async () => {
    const { orderId, variantId } = await paidOrder(5);
    expect(await stockOf(db, variantId)).toBe(4);
    await setStatus(orderId, "cancelled");
    expect(await stockOf(db, variantId)).toBe(5);
    await expect(setStatus(orderId, "paid")).rejects.toThrow(/INVALID_STATUS_CHANGE/);
  });
});

describe("cart", () => {
  it("merges guest items into the saved cart and caps at stock", async () => {
    const { variantId } = await product(1000, 5);
    await as(db, "authenticated", alice, "select public.sync_cart($1::jsonb, true)", [items(variantId, 3)]);
    const { rows } = await as<{ sync_cart: { variant_id: string; quantity: number }[] }>(
      db, "authenticated", alice, "select public.sync_cart($1::jsonb)", [items(variantId, 4)]);
    expect(rows[0].sync_cart.find((l) => l.variant_id === variantId)?.quantity).toBe(5);
  });

  it("replaces the cart when asked, skipping sold-out items", async () => {
    const { variantId } = await product(1000, 5);
    const soldOut = await product(1000, 0);
    const { rows } = await as<{ sync_cart: { variant_id: string; quantity: number }[] }>(
      db, "authenticated", bob, "select public.sync_cart($1::jsonb, true)", [
        JSON.stringify([{ variant_id: variantId, quantity: 2 }, { variant_id: soldOut.variantId, quantity: 1 }]),
      ]);
    expect(rows[0].sync_cart).toEqual([{ variant_id: variantId, quantity: 2 }]);
  });

  it("refuses guests", async () => {
    await expect(as(db, "anon", null, "select public.sync_cart('[]'::jsonb)")).rejects.toThrow(/permission denied/);
  });

  it("quotes live prices for guests and flags what can't be bought", async () => {
    const { variantId } = await product(2000, 5);
    const low = await product(1000, 1);
    const { rows } = await as<{ quote_cart: {
      subtotal_cents: number; shipping_cents: number; total_cents: number;
      lines: { variant_id: string; available: boolean }[];
    } }>(db, "anon", null, "select public.quote_cart($1::jsonb)", [
      JSON.stringify([{ variant_id: variantId, quantity: 2 }, { variant_id: low.variantId, quantity: 2 }]),
    ]);
    const quote = rows[0].quote_cart;
    expect(quote.subtotal_cents).toBe(4000);
    expect(quote.shipping_cents).toBe(600);
    expect(quote.total_cents).toBe(4600);
    expect(quote.lines.find((l) => l.variant_id === low.variantId)?.available).toBe(false);
  });
});

describe("list_products", () => {
  type Row = { name: string; min_price_cents: number; total_count: number };
  const list = async (args: string) =>
    (await as<Row>(db, "anon", null, `select * from public.list_products(${args})`)).rows;

  beforeAll(async () => {
    await createProduct(db, { name: "Toor Dhall", slug: "toor-dhall", priceCents: 700, stock: 5, category: "dhall" });
    await createProduct(db, { name: "Moong Dal", slug: "moong-dal", priceCents: 300, stock: 0, category: "dhall" });
    await createProduct(db, { name: "Secret Dhall", slug: "secret-dhall", priceCents: 100, stock: 5, category: "dhall", active: false });
  });

  it("filters by category, hides inactive products and sorts by price", async () => {
    const rows = await list("p_category_slug => 'dhall', p_sort => 'price_asc'");
    expect(rows.map((r) => r.name)).toEqual(["Moong Dal", "Toor Dhall"]);
    expect(Number(rows[0].total_count)).toBe(2);
  });

  it("filters to in-stock items and by price", async () => {
    expect((await list("p_category_slug => 'dhall', p_in_stock => true")).map((r) => r.name)).toEqual(["Toor Dhall"]);
    expect((await list("p_category_slug => 'dhall', p_max_cents => 500")).map((r) => r.name)).toEqual(["Moong Dal"]);
  });

  it("finds products despite a typo", async () => {
    expect((await list("p_query => 'Toor Dhal'")).map((r) => r.name)).toContain("Toor Dhall");
    expect((await list("p_query => 'Dhaal', p_category_slug => 'dhall'")).map((r) => r.name)).toContain("Toor Dhall");
  });

  it("returns nothing for an empty category", async () => {
    expect(await list("p_category_slug => 'rice'")).toEqual([]);
  });
});
