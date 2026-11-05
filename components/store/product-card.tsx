import Link from "next/link";
import { percentOff } from "@/lib/format";
import type { ProductCardData } from "@/lib/types";
import { CardBuyBox } from "./buy-box";
import { ProductImage } from "./product-image";

/** The biggest saving across a product's sizes, or null if none is discounted. */
export function bestSaving(product: Pick<ProductCardData, "variants">): number | null {
  const savings = product.variants.map((v) => percentOff(v.price_cents, v.mrp_cents) ?? 0);
  const best = Math.max(0, ...savings);
  return best > 0 ? best : null;
}

export function ProductCard({ product, label }: { product: ProductCardData; label?: string }) {
  const saving = bestSaving(product);
  const soldOut = product.variants.every((v) => v.stock < 1);

  return (
    <li className="group card flex flex-col overflow-hidden transition duration-300 hover:shadow-[0_14px_32px_-14px_rgb(59_28_21/0.3)] motion-safe:hover:-translate-y-0.5">
      <Link href={`/p/${product.slug}`} className="block">
        <div className="relative overflow-hidden border-b border-beige/60">
          <div className="transition duration-500 motion-safe:group-hover:scale-105">
            <ProductImage path={product.image_path} alt={product.name} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" />
          </div>
          <span className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {saving && <span className="badge">Save {saving}%</span>}
            {label && <span className="rounded-full bg-bark px-2.5 py-0.5 text-xs font-semibold text-white">{label}</span>}
            {soldOut && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-bark ring-1 ring-beige">Out of stock</span>}
          </span>
        </div>
        <h3 className="line-clamp-2 min-h-[2.75rem] px-3 pt-3 font-sans text-sm leading-snug font-semibold text-bark sm:px-4">
          {product.name}
        </h3>
      </Link>
      <div className="flex flex-1 flex-col p-3 pt-2 sm:px-4 sm:pb-4">
        <CardBuyBox name={product.name} variants={product.variants} />
      </div>
    </li>
  );
}

export function ProductGrid({ products, label }: { products: ProductCardData[]; label?: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} label={label} />
      ))}
    </ul>
  );
}
