import Link from "next/link";
import type { ProductCardData } from "@/lib/types";
import { CardBuyBox } from "./buy-box";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <li className="card flex flex-col overflow-hidden">
      <Link href={`/p/${product.slug}`} className="block">
        <ProductImage path={product.image_path} alt={product.name} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" />
        <h3 className="px-3 pt-2 font-sans text-sm leading-snug font-medium">{product.name}</h3>
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <CardBuyBox name={product.name} variants={product.variants} />
      </div>
    </li>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}
