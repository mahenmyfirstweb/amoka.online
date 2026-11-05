import Link from "next/link";
import { BannerForm } from "@/components/admin/banner-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Add slide" };

export default async function NewBannerPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("banners").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextSort = (data?.[0]?.sort_order ?? 0) + 10;

  return (
    <>
      <Link href="/admin/banners" className="text-sm underline underline-offset-2">Back to home slides</Link>
      <h1 className="mt-2 mb-1 text-3xl">Add slide</h1>
      <p className="mb-5 text-sm">Upload a photo, write the offer, and choose where the button goes. The preview shows how it will look.</p>
      <BannerForm nextSort={nextSort} />
    </>
  );
}
