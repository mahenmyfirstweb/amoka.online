"use client";

import { useActionState } from "react";
import { updateVariant, type ActionState } from "@/app/admin/actions";

const centsToDollars = (cents: number) => (cents / 100).toFixed(2);

/** One size's price and stock, editable in place, with a one-click "Out of stock". */
export function VariantQuickEdit({ productName, variant, threshold }: {
  productName: string;
  variant: { id: string; label: string; price_cents: number; stock: number };
  threshold: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateVariant, {});
  const id = variant.id;
  const outOfStock = variant.stock === 0;

  return (
    <form action={action} className="grid grid-cols-2 items-end gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_auto_auto]">
      <input type="hidden" name="id" value={id} />
      <p className="col-span-2 text-sm font-medium sm:col-span-1 sm:self-center">
        {variant.label}
        {outOfStock ? (
          <span className="ml-2 rounded-full bg-bark px-2.5 py-0.5 text-xs font-semibold text-white">Out of stock</span>
        ) : variant.stock <= threshold ? (
          <span className="badge ml-2">Low stock</span>
        ) : null}
      </p>
      <div>
        <label htmlFor={`price-${id}`} className="mb-1 block text-xs font-medium">
          Price (S$)<span className="sr-only"> of {productName} {variant.label}</span>
        </label>
        <input key={variant.price_cents} id={`price-${id}`} name="price" inputMode="decimal" required defaultValue={centsToDollars(variant.price_cents)} className="input" />
      </div>
      <div>
        <label htmlFor={`stock-${id}`} className="mb-1 block text-xs font-medium">
          Stock<span className="sr-only"> of {productName} {variant.label}</span>
        </label>
        <input key={variant.stock} id={`stock-${id}`} name="stock" type="number" min={0} required defaultValue={variant.stock} className="input" />
      </div>
      <button type="submit" name="intent" value="save" disabled={pending} className="btn btn-primary">
        {pending ? "Saving..." : "Save"}
      </button>
      <button
        type="submit"
        name="intent"
        value="out_of_stock"
        disabled={pending || outOfStock}
        formNoValidate
        className="btn btn-outline"
      >
        Out of stock
      </button>
      {(state.error || state.saved) && (
        <p role={state.error ? "alert" : "status"} className={`col-span-2 text-sm sm:col-span-5 ${state.error ? "font-medium text-bark" : ""}`}>
          {state.error ?? `Saved ${variant.label}.`}
        </p>
      )}
    </form>
  );
}
