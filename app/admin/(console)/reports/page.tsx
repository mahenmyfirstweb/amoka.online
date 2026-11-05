import Link from "next/link";
import { PAYMENT_LABELS, StatusBadge } from "@/components/store/order-view";
import { PrintButton } from "@/components/store/print-button";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { customerSearchFilter, RANGES, reportRange, sgDate } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export const metadata = { title: "Sales report" };

const MAX_ROWS = 2000;
const SOLD = new Set(["paid", "shipped", "delivered"]);

type Row = Pick<
  Order,
  "id" | "order_number" | "user_id" | "email" | "status" | "payment_method" | "total_cents" | "created_at" | "shipping_address"
> & { order_items: { product_name: string; variant_label: string; quantity: number; line_total_cents: number }[] };

type Params = { range?: string; from?: string; to?: string; q?: string };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const period = reportRange(params.range, params.from, params.to);
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, order_number, user_id, email, status, payment_method, total_cents, created_at, shipping_address, order_items (product_name, variant_label, quantity, line_total_cents)")
    .gte("created_at", period.start.toISOString())
    .lt("created_at", period.end.toISOString())
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  const search = customerSearchFilter(params.q);
  if (search) query = query.or(search);

  const { data, error } = await query;
  const orders = (data ?? []) as unknown as Row[];

  const sold = orders.filter((o) => SOLD.has(o.status));
  const sales = sold.reduce((sum, o) => sum + o.total_cents, 0);
  const awaitingPayLater = orders.filter((o) => o.status === "pending" && o.payment_method === "pay_later");
  const unfinished = orders.filter((o) => o.status === "pending" && o.payment_method === "online");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const customers = new Set(orders.map((o) => o.email.toLowerCase()));

  const tiles = [
    { label: "Orders placed", value: String(orders.length - unfinished.length), note: `${customers.size} ${customers.size === 1 ? "customer" : "customers"}` },
    { label: "Sales (paid orders)", value: formatPrice(sales), note: `${sold.length} paid ${sold.length === 1 ? "order" : "orders"}` },
    { label: "Average order", value: sold.length ? formatPrice(Math.round(sales / sold.length)) : "–", note: "Paid orders only" },
    { label: "Pay later, awaiting payment", value: String(awaitingPayLater.length), note: formatPrice(awaitingPayLater.reduce((s, o) => s + o.total_cents, 0)) },
    { label: "Cancelled", value: String(cancelled.length), note: unfinished.length ? `${unfinished.length} unfinished online checkout${unfinished.length === 1 ? "" : "s"}` : "" },
  ];

  // Day by day, oldest first, for ranges longer than a day.
  const byDay = new Map<string, { orders: number; sales: number }>();
  if (period.days > 1) {
    for (let d = 0; d < period.days; d++) {
      byDay.set(sgDate(new Date(period.start.getTime() + d * 86_400_000 + 3_600_000)), { orders: 0, sales: 0 });
    }
    for (const o of orders) {
      if (o.status === "pending" && o.payment_method === "online") continue;
      const day = byDay.get(sgDate(o.created_at));
      if (!day) continue;
      day.orders += 1;
      if (SOLD.has(o.status)) day.sales += o.total_cents;
    }
  }

  // Best sellers by quantity in paid orders.
  const products = new Map<string, { name: string; quantity: number; sales: number }>();
  for (const o of sold) {
    for (const i of o.order_items) {
      const key = `${i.product_name} (${i.variant_label})`;
      const p = products.get(key) ?? { name: key, quantity: 0, sales: 0 };
      p.quantity += i.quantity;
      p.sales += i.line_total_cents;
      products.set(key, p);
    }
  }
  const bestSellers = [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const periodLabel = period.from === period.to ? formatDate(period.from) : `${formatDate(period.from)} to ${formatDate(period.to)}`;

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Sales report</h1>
        <PrintButton label="Print report" />
      </div>
      <p className="mb-5 text-sm">
        {periodLabel}{params.q ? `, customers matching “${params.q}”` : ""}. Times are Singapore time. Sales count orders that are paid, shipped or delivered.
      </p>

      <div className="no-print card mb-6 space-y-5 p-4">
        <nav aria-label="Report period" className="flex flex-wrap items-center gap-2">
          {RANGES.filter((r) => r.value !== "custom").map((r) => {
            const search = new URLSearchParams({ range: r.value, ...(params.q ? { q: params.q } : {}) });
            const current = period.range === r.value;
            return (
              <Link
                key={r.value}
                href={`/admin/reports?${search}`}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-full border border-brown px-5 text-sm font-medium ${current ? "bg-brown text-white" : "bg-white hover:bg-beige-tint"}`}
              >
                {r.label}
              </Link>
            );
          })}
        </nav>

        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="range" value="custom" />
          {params.q && <input type="hidden" name="q" value={params.q} />}
          <div>
            <label htmlFor="from" className="mb-1 block text-sm">From</label>
            <input id="from" name="from" type="date" required defaultValue={period.from} className="input w-44" />
          </div>
          <div>
            <label htmlFor="to" className="mb-1 block text-sm">To</label>
            <input id="to" name="to" type="date" required defaultValue={period.to} className="input w-44" />
          </div>
          <button type="submit" className={`btn ${period.range === "custom" ? "btn-primary" : "btn-outline"}`}>Apply dates</button>
        </form>

        <form className="flex flex-wrap items-end gap-3 border-t border-beige pt-4">
          <input type="hidden" name="range" value={period.range} />
          {period.range === "custom" && (
            <>
              <input type="hidden" name="from" value={period.from} />
              <input type="hidden" name="to" value={period.to} />
            </>
          )}
          <div className="min-w-56 flex-1">
            <label htmlFor="q" className="mb-1 block text-sm">Search by customer name, email or order number</label>
            <input id="q" name="q" type="search" defaultValue={params.q} placeholder="e.g. Nithya" className="input" />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
          {params.q && (
            <Link
              href={`/admin/reports?${new URLSearchParams({ range: period.range, ...(period.range === "custom" ? { from: period.from, to: period.to } : {}) })}`}
              className="btn btn-outline"
            >
              Clear search
            </Link>
          )}
        </form>
      </div>

      {period.error && <p role="status" className="mb-4 rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">{period.error}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">We couldn&apos;t load the report. Please try again.</p>}
      {orders.length === MAX_ROWS && (
        <p role="status" className="mb-4 rounded-lg bg-beige-tint p-3 text-sm">Showing the latest {MAX_ROWS} orders. Choose a shorter period for exact totals.</p>
      )}

      <ul className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label} className="card p-4">
            <span className="block font-heading text-2xl font-bold text-bark">{t.value}</span>
            <span className="block text-sm font-medium">{t.label}</span>
            {t.note && <span className="block text-xs">{t.note}</span>}
          </li>
        ))}
      </ul>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {period.days > 1 && (
          <section aria-labelledby="days-heading">
            <h2 id="days-heading" className="mb-3 text-xl">Day by day</h2>
            <div tabIndex={0} role="region" aria-labelledby="days-heading" className="card max-h-96 overflow-y-auto print:max-h-none">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-beige-tint">
                  <tr>
                    <th scope="col" className="px-4 py-2">Date</th>
                    <th scope="col" className="px-4 py-2 text-right">Orders</th>
                    <th scope="col" className="px-4 py-2 text-right">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {[...byDay.entries()].map(([day, v]) => (
                    <tr key={day} className="border-t border-beige">
                      <td className="px-4 py-2">{formatDate(day)}</td>
                      <td className="px-4 py-2 text-right">{v.orders}</td>
                      <td className="px-4 py-2 text-right">{formatPrice(v.sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <section aria-labelledby="best-heading">
          <h2 id="best-heading" className="mb-3 text-xl">Best sellers</h2>
          {bestSellers.length === 0 ? (
            <p className="text-sm">No paid orders in this period yet.</p>
          ) : (
            <ol className="card divide-y divide-beige text-sm">
              {bestSellers.map((p, n) => (
                <li key={p.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span><span className="mr-2 font-bold">{n + 1}.</span>{p.name}</span>
                  <span className="shrink-0 text-right">{p.quantity} sold · {formatPrice(p.sales)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="mb-3 text-xl">Orders in this period ({orders.length})</h2>
        {orders.length === 0 ? (
          <p className="text-sm">No orders found.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-beige-tint">
                <tr>
                  <th scope="col" className="px-4 py-2">Order</th>
                  <th scope="col" className="px-4 py-2">Date</th>
                  <th scope="col" className="px-4 py-2">Customer</th>
                  <th scope="col" className="px-4 py-2">Payment</th>
                  <th scope="col" className="px-4 py-2">Status</th>
                  <th scope="col" className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-beige">
                    <td className="px-4 py-2"><Link href={`/admin/orders/${o.id}`} className="font-semibold underline underline-offset-2">{o.order_number}</Link></td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-2">
                      <span className="block font-medium text-bark">{o.shipping_address?.recipient_name}</span>
                      <span className="block text-xs">{o.email}{o.user_id ? "" : " · guest"}</span>
                    </td>
                    <td className="px-4 py-2">{PAYMENT_LABELS[o.payment_method]}</td>
                    <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-2 text-right font-semibold text-bark">{formatPrice(o.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
