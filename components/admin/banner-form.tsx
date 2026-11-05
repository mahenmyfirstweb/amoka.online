"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { saveBanner, type ActionState } from "@/app/admin/actions";
import { imageUrl } from "@/lib/supabase/config";
import type { Banner } from "@/lib/types";
import { ImageUpload } from "./image-upload";

/** Singapore calendar date (YYYY-MM-DD) for a stored timestamp. */
function sgDate(timestamp: string | null, endOfRange = false) {
  if (!timestamp) return "";
  const ms = new Date(timestamp).getTime() - (endOfRange ? 1 : 0) + 8 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

const TEXT_FIELDS = [
  { name: "eyebrow", label: "Small heading above the title (optional)", placeholder: "e.g. Deepavali special", max: 40 },
  { name: "title", label: "Title", placeholder: "e.g. 20% off all pickles this week", max: 120, required: true },
  { name: "body", label: "Text (optional)", placeholder: "e.g. While stocks last. Free delivery over S$60.", max: 240 },
  { name: "button_label", label: "Button text (optional)", placeholder: "e.g. Shop pickles", max: 30 },
  { name: "button_link", label: "Button link (optional)", placeholder: "e.g. /c/pickles or /p/amoka-lemon-pickle", max: 300 },
] as const;

export function BannerForm({ banner, nextSort }: { banner?: Banner; nextSort?: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBanner, {});
  const [imagePath, setImagePath] = useState(banner?.image_path ?? "");
  const [values, setValues] = useState({
    eyebrow: banner?.eyebrow ?? "",
    title: banner?.title ?? "",
    body: banner?.body ?? "",
    button_label: banner?.button_label ?? "",
    button_link: banner?.button_link ?? "",
  });
  const photo = imageUrl(imagePath || null);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {banner && <input type="hidden" name="id" value={banner.id} />}
        <input type="hidden" name="image_path" value={imagePath} />
        {state.error && <p role="alert" className="rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">{state.error}</p>}
        {state.saved && <p role="status" className="rounded-lg bg-yellow p-3 text-sm font-medium text-brown">Saved. It&apos;s on the home page now if it&apos;s switched on.</p>}

        <div>
          <ImageUpload
            folder={`banners/${banner?.id ?? "new"}`}
            label="Photo (JPG, PNG or WebP, up to 5 MB). A wide photo works best, at least 1600 × 600 pixels."
            onUploaded={setImagePath}
          />
          {imagePath && (
            <button type="button" onClick={() => setImagePath("")} className="mt-1 min-h-11 text-sm underline">Remove photo</button>
          )}
        </div>

        {TEXT_FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={`banner-${f.name}`} className="mb-1 block text-sm font-medium">{f.label}</label>
            {f.name === "body" ? (
              <textarea
                id={`banner-${f.name}`}
                name={f.name}
                rows={2}
                maxLength={f.max}
                placeholder={f.placeholder}
                value={values[f.name]}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                className="input"
              />
            ) : (
              <input
                id={`banner-${f.name}`}
                name={f.name}
                maxLength={f.max}
                required={"required" in f}
                placeholder={f.placeholder}
                value={values[f.name]}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                className="input"
              />
            )}
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="banner-starts" className="mb-1 block text-sm font-medium">Show from (optional)</label>
            <input id="banner-starts" name="starts_on" type="date" defaultValue={sgDate(banner?.starts_at ?? null)} className="input" />
          </div>
          <div>
            <label htmlFor="banner-ends" className="mb-1 block text-sm font-medium">Show until (optional)</label>
            <input id="banner-ends" name="ends_on" type="date" defaultValue={sgDate(banner?.ends_at ?? null, true)} className="input" />
          </div>
          <div>
            <label htmlFor="banner-sort" className="mb-1 block text-sm font-medium">Order (lower first)</label>
            <input id="banner-sort" name="sort_order" type="number" min={0} required defaultValue={banner?.sort_order ?? nextSort ?? 0} className="input" />
          </div>
        </div>

        <label className="flex min-h-12 items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked={banner?.is_active ?? true} className="h-5 w-5 accent-brown" />
          Show on the home page
        </label>

        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving..." : "Save slide"}</button>
      </div>

      <div>
        <p className="eyebrow mb-2">Preview</p>
        <div aria-hidden="true" className="relative flex min-h-[220px] items-center overflow-hidden rounded-2xl bg-bark px-6 py-8">
          {photo && (
            <>
              <Image src={photo} alt="" fill sizes="600px" className="object-cover" />
              <div className="absolute inset-0 bg-linear-to-r from-bark via-bark/80 to-bark/10" />
            </>
          )}
          <div className="relative max-w-sm">
            {values.eyebrow && <span className="eyebrow text-yellow">{values.eyebrow}</span>}
            <p className="mt-2 font-heading text-2xl leading-tight font-bold text-white">{values.title || "Your title"}</p>
            {values.body && <p className="mt-2 text-sm text-beige-tint">{values.body}</p>}
            {values.button_label && <span className="btn btn-primary mt-4 px-5">{values.button_label}</span>}
          </div>
        </div>
        <p className="mt-2 text-sm">
          The photo is darkened on the left so the text stays readable. Keep the important part of the photo on the right.
        </p>
      </div>
    </form>
  );
}
