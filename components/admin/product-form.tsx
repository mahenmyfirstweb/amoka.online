"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { saveProduct, type ActionState } from "@/app/admin/actions";
import type { Category } from "@/lib/types";

type VariantRow = {
  key: string;
  id: string | null;
  label: string;
  price: string;
  mrp: string;
  stock: string;
  sku: string;
};

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  category_id: string;
  brand: string;
  description: string;
  ingredients: string;
  allergens: string;
  country_of_origin: string;
  shelf_life: string;
  manufacturer: string;
  is_active: boolean;
  is_featured: boolean;
  variants: VariantRow[];
};

const TEXT_FIELDS = [
  ["brand", "Brand"],
  ["country_of_origin", "Country of origin"],
  ["shelf_life", "Shelf life"],
  ["manufacturer", "Manufacturer"],
] as const;

const LONG_FIELDS = [
  ["description", "Description"],
  ["ingredients", "Ingredients"],
  ["allergens", "Allergens"],
] as const;

const VARIANT_FIELDS = [
  ["label", "Size", "e.g. 500g"],
  ["price", "Price (S$)", "e.g. 5.50"],
  ["mrp", "Was price (S$)", "Optional"],
  ["stock", "Stock", ""],
  ["sku", "SKU", "Optional"],
] as const;

export function ProductForm({ initial, categories }: { initial: ProductFormValues; categories: Category[] }) {
  const [values, setValues] = useState(initial);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProduct, {});

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const setVariant = (key: string, field: keyof VariantRow, value: string) =>
    set("variants", values.variants.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  const addVariant = () =>
    set("variants", [
      ...values.variants,
      { key: crypto.randomUUID(), id: null, label: "", price: "", mrp: "", stock: "0", sku: "" },
    ]);

  const { id, ...rest } = values;
  const payload = JSON.stringify({
    ...rest,
    variants: values.variants.map((v) => ({
      id: v.id, label: v.label, price: v.price, mrp: v.mrp, stock: v.stock, sku: v.sku,
    })),
  });

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="payload" value={payload} />

      {state.error && <p role="alert" className="rounded-lg bg-beige-tint p-3 text-sm font-medium text-bark">{state.error}</p>}
      {state.saved && <p role="status" className="rounded-lg bg-beige-tint p-3 text-sm">Saved.</p>}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">Product name</label>
        <input id="name" required value={values.name} onChange={(e) => set("name", e.target.value)} className="input" />
      </div>

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium">Category</label>
        <select id="category" required value={values.category_id} onChange={(e) => set("category_id", e.target.value)} className="input">
          <option value="">Choose a category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="slug" className="mb-1 block text-sm font-medium">Web address (leave blank to create one from the name)</label>
        <input id="slug" value={values.slug} onChange={(e) => set("slug", e.target.value)} className="input" />
      </div>

      <fieldset className="card space-y-3 p-4">
        <legend className="px-1 font-semibold">Sizes, prices and stock</legend>
        {values.variants.map((v, index) => (
          <div key={v.key} className="grid grid-cols-2 gap-2 border-b border-beige pb-3 sm:grid-cols-6">
            {VARIANT_FIELDS.map(([field, label, placeholder]) => (
              <div key={field}>
                <label htmlFor={`${field}-${index}`} className="mb-1 block text-xs font-medium">{label}</label>
                <input
                  id={`${field}-${index}`}
                  value={v[field]}
                  placeholder={placeholder}
                  inputMode={field === "price" || field === "mrp" ? "decimal" : field === "stock" ? "numeric" : undefined}
                  required={field === "label" || field === "price" || field === "stock"}
                  onChange={(e) => setVariant(v.key, field, e.target.value)}
                  className="input"
                />
              </div>
            ))}
            <button
              type="button"
              aria-label={`Remove size ${v.label || index + 1}`}
              disabled={values.variants.length === 1}
              onClick={() => set("variants", values.variants.filter((row) => row.key !== v.key))}
              className="btn btn-outline self-end p-0"
            >
              <Trash2 aria-hidden="true" size={18} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addVariant} className="btn btn-outline">Add another size</button>
      </fieldset>

      {LONG_FIELDS.map(([field, label]) => (
        <div key={field}>
          <label htmlFor={field} className="mb-1 block text-sm font-medium">{label}</label>
          <textarea id={field} rows={3} value={values[field]} onChange={(e) => set(field, e.target.value)} className="input" />
        </div>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        {TEXT_FIELDS.map(([field, label]) => (
          <div key={field}>
            <label htmlFor={field} className="mb-1 block text-sm font-medium">{label}</label>
            <input id={field} value={values[field]} onChange={(e) => set(field, e.target.value)} className="input" />
          </div>
        ))}
      </div>

      <label className="flex min-h-12 items-center gap-2">
        <input type="checkbox" checked={values.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-5 w-5 accent-brown" />
        Show in the store
      </label>
      <label className="flex min-h-12 items-center gap-2">
        <input type="checkbox" checked={values.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="h-5 w-5 accent-brown" />
        Feature on the home page
      </label>

      <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving..." : "Save product"}</button>
    </form>
  );
}
