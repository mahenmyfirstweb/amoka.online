import Link from "next/link";
import type { ProductCardData } from "@/lib/types";
import { CardBuyBox } from "./buy-box";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <li className="group card flex flex-col overflow-hidden transition duration-300 hover:shadow-[0_14px_32px_-14px_rgb(59_28_21/0.3)] motion-safe:hover:-translate-y-0.5">
      <Link href={`/p/${product.slug}`} className="block">
        <div className="overflow-hidden border-b border-beige/60">
          <div className="transition duration-500 motion-safe:group-hover:scale-105">
            <ProductImage path={product.image_path} alt={product.name} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" />
          </div>
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

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}
