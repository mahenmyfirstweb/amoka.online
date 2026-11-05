import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteBanner } from "@/app/admin/actions";
import { BannerForm } from "@/components/admin/banner-form";
import { createClient } from "@/lib/supabase/server";
import type { Banner } from "@/lib/types";

export const metadata = { title: "Edit slide" };

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("banners").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const banner = data as Banner;

  return (
    <>
      <Link href="/admin/banners" className="text-sm underline underline-offset-2">Back to home slides</Link>
      <h1 className="mt-2 mb-5 text-3xl">Edit slide</h1>
      <BannerForm banner={banner} />
      <form action={deleteBanner} className="mt-8 border-t border-beige pt-4">
        <input type="hidden" name="id" value={banner.id} />
        <button type="submit" className="btn btn-outline">Delete slide</button>
        <p className="mt-2 text-sm">To hide it for now without deleting it, untick <strong>Show on the home page</strong> instead.</p>
      </form>
    </>
  );
}
