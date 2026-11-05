import Image from "next/image";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { formatDate } from "@/lib/format";
import { imageUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Banner } from "@/lib/types";

export const metadata = { title: "Home slides" };

function currentTime() {
  return Date.now();
}

function status(b: Banner, now: number) {
  if (!b.is_active) return "Switched off";
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return `Starts ${formatDate(b.starts_at)}`;
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return "Finished";
  return "Live";
}

export default async function AdminBannersPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("banners").select("*").order("sort_order").order("created_at");
  const banners = (data ?? []) as Banner[];
  const now = currentTime();

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Home slides</h1>
        <Link href="/admin/banners/new" className="btn btn-primary"><ImagePlus aria-hidden="true" size={18} /> Add new slide</Link>
      </div>
      <p className="mb-5 max-w-3xl text-sm">
        These rotate at the top of the home page, for offers, new arrivals or announcements. While you have no live
        slides, the home page shows automatic ones built from your products.
      </p>

      {error && (
        <p role="alert" className="mb-4 max-w-3xl rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">
          Home slides aren&apos;t set up yet. Run <code>supabase/09_banners.sql</code> in the Supabase SQL Editor, then reload this page.
        </p>
      )}
      {created && (
        <p role="status" className="mb-4 max-w-3xl rounded-lg bg-yellow p-3 text-sm font-medium text-brown">
          Slide &ldquo;{created}&rdquo; added.
        </p>
      )}

      {!error && banners.length === 0 ? (
        <p>No slides yet. The home page is showing the automatic ones.</p>
      ) : (
        <ul className="max-w-4xl space-y-3">
          {banners.map((b) => {
            const photo = imageUrl(b.image_path);
            const label = status(b, now);
            return (
              <li key={b.id}>
                <Link href={`/admin/banners/${b.id}`} className="card flex items-center gap-4 p-3 hover:bg-beige-tint">
                  <span className="relative block h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-bark">
                    {photo && <Image src={photo} alt="" fill sizes="112px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-bark">{b.title}</span>
                    {b.eyebrow && <span className="block truncate text-sm">{b.eyebrow}</span>}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${label === "Live" ? "bg-yellow text-brown" : "bg-beige-tint text-bark"}`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
