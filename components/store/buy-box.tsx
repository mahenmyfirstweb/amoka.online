"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { formatPrice, percentOff } from "@/lib/format";
import type { Variant } from "@/lib/types";
import { useCart } from "./cart-context";

function Price({ variant }: { variant: Variant }) {
  const off = percentOff(variant.price_cents, variant.mrp_cents);

  return (
    <p className="flex flex-wrap items-center gap-x-2">
      <span className="font-semibold text-bark">{formatPrice(variant.price_cents)}</span>
      {off && variant.mrp_cents && (
        <>
          <span className="text-sm line-through">
            <span className="sr-only">Was </span>
            {formatPrice(variant.mrp_cents)}
          </span>
          <span className="badge">{off}% off</span>
        </>
      )}
    </p>
  );
}

function AddButton({ variant, className }: { variant: Variant; className?: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [added]);

  const soldOut = variant.stock < 1;

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => {
        add(variant.id);
        setAdded(true);
      }}
      className={`btn btn-primary ${className ?? ""}`}
    >
      {soldOut ? "Sold out" : added ? <><Check aria-hidden="true" size={18} /> Added</> : "Add to cart"}
    </button>
  );
}

function SizePicker({
  name,
  variants,
  selected,
  onSelect,
}: {
  name: string;
  variants: Variant[];
  selected: Variant;
  onSelect: (v: Variant) => void;
}) {
  if (variants.length < 2) {
    return <p className="text-sm">{selected.label}</p>;
  }

  return (
    <fieldset>
      <legend className="sr-only">Size of {name}</legend>
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => (
          <label
            key={v.id}
            className={`flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-md border border-brown px-2 text-sm has-focus-visible:outline-3 has-focus-visible:outline-bark ${
              v.id === selected.id ? "bg-yellow font-semibold" : "bg-white"
            }`}
          >
            <input
              type="radio"
              name={`size-${name}`}
              className="sr-only"
              checked={v.id === selected.id}
              onChange={() => onSelect(v)}
            />
            {v.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Compact size, price and add button for product cards. */
export function CardBuyBox({ name, variants }: { name: string; variants: Variant[] }) {
  const [selected, setSelected] = useState(variants[0]);

  return (
    <div className="mt-auto flex flex-col gap-2">
      <SizePicker name={name} variants={variants} selected={selected} onSelect={setSelected} />
      <Price variant={selected} />
      <AddButton variant={selected} className="w-full" />
    </div>
  );
}

/** Product page version, with an Add to cart bar fixed to the bottom on phones. */
export function ProductBuyBox({ name, variants, taxNote }: { name: string; variants: Variant[]; taxNote: string }) {
  const [selected, setSelected] = useState(variants[0]);
  const stockNote = selected.stock < 1 ? "Sold out" : selected.stock <= 5 ? `Only ${selected.stock} left` : "In stock";

  return (
    <div className="mt-4 space-y-3">
      <SizePicker name={name} variants={variants} selected={selected} onSelect={setSelected} />
      <div className="text-xl"><Price variant={selected} /></div>
      <p className="text-sm">{taxNote}</p>
      <p className="text-sm font-medium">{stockNote}</p>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-beige bg-white p-3 md:static md:border-0 md:p-0">
        <AddButton variant={selected} className="w-full md:w-auto md:min-w-56" />
      </div>
    </div>
  );
}
