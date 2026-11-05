"use client";

import { useActionState, useState } from "react";
import { deleteCategory, saveCategory, type ActionState } from "@/app/admin/actions";
import type { Category } from "@/lib/types";
import { CategoryVisual } from "@/components/store/category-visual";
import { ImageUpload } from "./image-upload";

export function CategoryForm({ category, nextSort }: { category?: Category; nextSort?: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCategory, {});
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(deleteCategory, {});
  const [imagePath, setImagePath] = useState(category?.image_path ?? "");
  const prefix = category?.id ?? "new";

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        {category && <input type="hidden" name="id" value={category.id} />}
        <input type="hidden" name="image_path" value={imagePath} />
        {state.error && <p role="alert" className="rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">{state.error}</p>}
        {state.saved && <p role="status" className="rounded-lg bg-beige-tint p-3 text-sm">Saved.</p>}

        <div>
          <label htmlFor={`${prefix}-name`} className="mb-1 block text-sm font-medium">Name</label>
          <input id={`${prefix}-name`} name="name" required defaultValue={category?.name} className="input" />
        </div>
        <div>
          <label htmlFor={`${prefix}-slug`} className="mb-1 block text-sm font-medium">Web address (blank to create from the name)</label>
          <input id={`${prefix}-slug`} name="slug" defaultValue={category?.slug} className="input" />
        </div>
        <div>
          <label htmlFor={`${prefix}-description`} className="mb-1 block text-sm font-medium">Description</label>
          <textarea id={`${prefix}-description`} name="description" rows={2} defaultValue={category?.description ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor={`${prefix}-sort`} className="mb-1 block text-sm font-medium">Sort order (lower shows first)</label>
          <input id={`${prefix}-sort`} name="sort_order" type="number" min={0} required defaultValue={category?.sort_order ?? nextSort ?? 0} className="input" />
        </div>
        <label className="flex min-h-12 items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={category?.is_active ?? true} className="h-5 w-5 accent-brown" />
          Show in the store
        </label>
        <div className="flex items-center gap-4">
          <span className="block w-20 shrink-0">
            <CategoryVisual category={{ slug: category?.slug ?? "", image_path: imagePath || null }} sizes="80px" />
          </span>
          <div className="min-w-0 flex-1">
            <ImageUpload
              folder={`categories/${prefix}`}
              label={imagePath ? "Replace the photo (JPG, PNG or WebP, up to 5 MB)" : "Category photo (JPG, PNG or WebP, up to 5 MB)"}
              onUploaded={setImagePath}
            />
            {imagePath && (
              <button type="button" onClick={() => setImagePath("")} className="mt-1 min-h-11 text-sm underline">
                Remove photo
              </button>
            )}
          </div>
        </div>
        {imagePath !== (category?.image_path ?? "") && <p className="text-sm font-medium">Photo changed. Click Save to apply it.</p>}
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving..." : "Save category"}</button>
      </form>

      {category && (
        <form action={deleteAction}>
          <input type="hidden" name="id" value={category.id} />
          {deleteState.error && <p role="alert" className="mb-2 text-sm font-medium text-bark">{deleteState.error}</p>}
          <button type="submit" className="btn btn-outline">Delete category</button>
        </form>
      )}
    </div>
  );
}
