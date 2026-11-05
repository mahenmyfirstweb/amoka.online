"use client";

import { useEffect, useState } from "react";
import { Check, Minus, PackageX, Plus, ShoppingBag } from "lucide-react";
import { formatPrice, percentOff } from "@/lib/format";
import type { Variant } from "@/lib/types";
import { useCart } from "./cart-context";

const maxQuantity = (variant: Variant) => Math.max(1, Math.min(variant.stock, 99));

function Price({ variant, large = false }: { variant: Variant; large?: boolean }) {
  const off = percentOff(variant.price_cents, variant.mrp_cents);

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`font-bold text-bark ${large ? "font-heading text-3xl" : "text-lg"}`}>{formatPrice(variant.price_cents)}</span>
      {off && variant.mrp_cents && (
        <>
          <span className="text-sm line-through">
            <span className="sr-only">Was </span>
            {formatPrice(variant.mrp_cents)}
          </span>
          <span className="badge">Save {off}%</span>
        </>
      )}
    </p>
  );
}

function QuantityStepper({ name, value, max, onChange, large = false }: {
  name: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  large?: boolean;
}) {
  const size = large ? "h-12 w-12" : "h-10 w-10";
  const button = `flex ${size} shrink-0 items-center justify-center rounded-full transition hover:bg-beige-tint disabled:cursor-not-allowed disabled:opacity-40`;

  return (
    <div role="group" aria-label={`Quantity of ${name}`} className="flex items-center justify-between rounded-full border border-brown bg-white">
      <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)} className={button}>
        <Minus aria-hidden="true" size={16} />
      </button>
      <output aria-live="polite" className={`min-w-8 text-center font-semibold text-bark ${large ? "text-lg" : ""}`}>
        <span className="sr-only">Quantity </span>
        {value}
      </output>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)} className={button}>
        <Plus aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

function AddButton({ variant, quantity, className, showTotal = false }: {
  variant: Variant;
  quantity: number;
  className?: string;
  showTotal?: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [added]);

  const soldOut = variant.stock < 1;

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => {
        add(variant.id, quantity);
        setAdded(true);
      }}
      className={`btn btn-primary ${className ?? ""}`}
    >
      {soldOut ? (
        "Out of stock"
      ) : added ? (
        <><Check aria-hidden="true" size={18} /> {showTotal ? `Added ${quantity} to cart` : "Added"}</>
      ) : (
        <>
          <ShoppingBag aria-hidden="true" size={18} className="hidden sm:block" />
          Add to cart{showTotal && ` · ${formatPrice(variant.price_cents * quantity)}`}
        </>
      )}
    </button>
  );
}

function OutOfStockNotice({ multipleSizes }: { multipleSizes: boolean }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-lg bg-beige-tint px-3 py-2 text-sm font-semibold text-bark">
      <PackageX aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
      <span>
        Out of stock
        <span className="block font-normal">{multipleSizes ? "Try another size, or check back soon." : "Check back soon."}</span>
      </span>
    </p>
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
            className={`flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-brown px-3 text-sm has-focus-visible:outline-3 has-focus-visible:outline-bark ${
              v.id === selected.id ? "bg-brown font-semibold text-white" : "bg-white"
            }`}
          >
            <input
              type="radio"
              name={`size-${name}`}
              className="sr-only"
              checked={v.id === selected.id}
              onChange={() => onSelect(v)}
            />
            <span className={v.stock < 1 && v.id !== selected.id ? "line-through" : undefined}>{v.label}</span>
            {v.stock < 1 && <span className="sr-only"> (out of stock)</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Size, price and quantity state shared by both buy boxes. Quantity resets when the size changes. */
function useBuyState(variants: Variant[]) {
  const [selected, setSelected] = useState(variants[0]);
  const [quantity, setQuantity] = useState(1);
  const select = (v: Variant) => {
    setSelected(v);
    setQuantity(1);
  };
  const max = maxQuantity(selected);
  return { selected, select, quantity: Math.min(quantity, max), setQuantity, max };
}

/** Compact size, price, quantity and add button for product cards. */
export function CardBuyBox({ name, variants }: { name: string; variants: Variant[] }) {
  const { selected, select, quantity, setQuantity, max } = useBuyState(variants);
  const soldOut = selected.stock < 1;

  return (
    <div className="mt-auto flex flex-col gap-2.5">
      <SizePicker name={name} variants={variants} selected={selected} onSelect={select} />
      <Price variant={selected} />
      {soldOut ? (
        <OutOfStockNotice multipleSizes={variants.length > 1} />
      ) : (
        <QuantityStepper name={name} value={quantity} max={max} onChange={setQuantity} />
      )}
      <AddButton variant={selected} quantity={quantity} className="w-full" />
    </div>
  );
}

/** Product page version, with the quantity and Add to cart bar fixed to the bottom on phones. */
export function ProductBuyBox({ name, variants, taxNote }: { name: string; variants: Variant[]; taxNote: string }) {
  const { selected, select, quantity, setQuantity, max } = useBuyState(variants);
  const soldOut = selected.stock < 1;
  const stockNote = soldOut ? "Out of stock" : selected.stock <= 5 ? `Only ${selected.stock} left` : "In stock";

  return (
    <div className="mt-5 space-y-5">
      <div>
        <Price variant={selected} large />
        <p className="mt-1 text-sm">{taxNote}</p>
      </div>
      {variants.length > 1 && (
        <div>
          <p className="eyebrow mb-2">Choose size</p>
          <SizePicker name={name} variants={variants} selected={selected} onSelect={select} />
        </div>
      )}
      {variants.length === 1 && <p className="text-sm"><span className="font-semibold">Size:</span> {selected.label}</p>}
      {soldOut ? (
        <OutOfStockNotice multipleSizes={variants.length > 1} />
      ) : (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-brown" />
          {stockNote}
        </p>
      )}
      {!soldOut && <p aria-hidden="true" className="eyebrow hidden md:block">Quantity</p>}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-beige bg-white p-3 shadow-[0_-8px_24px_-12px_rgb(59_28_21/0.25)] md:static md:border-0 md:p-0 md:shadow-none">
        {!soldOut && (
          <div className="w-32 shrink-0 sm:w-36">
            <QuantityStepper name={name} value={quantity} max={max} onChange={setQuantity} large />
          </div>
        )}
        <AddButton variant={selected} quantity={quantity} showTotal className="min-h-12 flex-1 px-3 whitespace-nowrap md:max-w-sm" />
      </div>
    </div>
  );
}
