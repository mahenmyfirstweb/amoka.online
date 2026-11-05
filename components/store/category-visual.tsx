import Image from "next/image";
import {
  Amphora, Bean, Candy, Coffee, CookingPot, Cookie, CupSoda, Dessert, Droplets, Flame, Leaf, Nut,
  Popcorn, ShoppingBasket, Soup, Sprout, Torus, Wheat, type LucideIcon,
} from "lucide-react";
import { imageUrl } from "@/lib/supabase/config";
import type { Category } from "@/lib/types";

// Shown when a category has no photo yet. Upload one in Admin > Categories to replace it.
const ICONS: Record<string, LucideIcon> = {
  beverages: CupSoda,
  candy: Candy,
  groceries: ShoppingBasket,
  spices: Flame,
  nuts: Nut,
  pickles: Amphora,
  snacks: Cookie,
  "appalam-vadagam": Torus,
  "lays-kurkure": Popcorn,
  rice: Wheat,
  semiya: Soup,
  "aachi-masala": CookingPot,
  paakku: Leaf,
  biscuits: Cookie,
  oil: Droplets,
  dhall: Bean,
  chocolate: Dessert,
  chips: Popcorn,
  "coffee-tea": Coffee,
  millets: Sprout,
};

/** A round picture for a category: its photo if it has one, otherwise a matching icon. */
export function CategoryVisual({ category, sizes = "80px", active = false }: {
  category: Pick<Category, "slug" | "image_path">;
  sizes?: string;
  active?: boolean;
}) {
  const src = imageUrl(category.image_path);
  const Icon = ICONS[category.slug] ?? ShoppingBasket;

  return (
    <span
      className={`relative block aspect-square w-full overflow-hidden rounded-full bg-white ring-1 transition duration-300 group-hover:ring-2 group-hover:ring-yellow ${
        active ? "ring-2 ring-brown" : "ring-beige"
      }`}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="object-contain p-[14%] transition duration-500 motion-safe:group-hover:scale-110"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-beige-tint via-white to-beige-tint">
          <Icon aria-hidden="true" strokeWidth={1.5} className="h-[44%] w-[44%] text-brown transition duration-500 motion-safe:group-hover:scale-110" />
        </span>
      )}
    </span>
  );
}
