import Link from "next/link";
import { getStoreSettings } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const settings = await getStoreSettings();
  const threshold = settings?.low_stock_threshold ?? 5;
  const monthAgo = daysAgo(30);

  const [toShip, payLater, review, lowStock, recent] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("orders").select("id", { count: "exact", head: true })
      .eq("status", "pending").eq("payment_method", "pay_later"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("needs_review", true),
    supabase.from("product_variants").select("id", { count: "exact", head: true }).lte("stock", threshold),
    supabase.from("orders").select("total_cents").not("paid_at", "is", null).neq("status", "cancelled").gte("paid_at", monthAgo),
  ]);

  const revenue = (recent.data ?? []).reduce((sum, o) => sum + o.total_cents, 0);

  const tiles = [
    { label: "Orders to ship", value: String(toShip.count ?? 0), href: "/admin/orders?status=paid" },
    {
      label: "Pay-later orders awaiting payment",
      value: String(payLater.count ?? 0),
      href: "/admin/orders?status=pending&payment=pay_later",
    },
    { label: "Orders needing review", value: String(review.count ?? 0), href: "/admin/orders?review=1" },
    { label: `Sizes with ${threshold} or fewer in stock`, value: String(lowStock.count ?? 0), href: "/admin/products?low=1" },
    { label: "Sales, last 30 days", value: formatPrice(revenue), href: "/admin/orders" },
  ];

  return (
    <>
      <h1 className="mb-4 text-2xl">Dashboard</h1>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="card block h-full p-4 hover:bg-beige-tint">
              <span className="block font-heading text-2xl font-bold">{t.value}</span>
              <span className="text-sm">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
