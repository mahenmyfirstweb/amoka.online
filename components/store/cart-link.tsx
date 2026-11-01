"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-context";

export function CartLink() {
  const { count } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart, empty"}
      className="relative flex h-12 w-12 items-center justify-center"
    >
      <ShoppingCart aria-hidden="true" size={22} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1 text-xs font-semibold text-bark"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
