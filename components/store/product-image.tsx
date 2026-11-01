import Image from "next/image";
import { ShoppingBasket } from "lucide-react";
import { imageUrl } from "@/lib/supabase/config";

export function ProductImage({
  path,
  alt,
  sizes,
  priority,
}: {
  path: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const src = imageUrl(path);

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-white">
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} preload={priority} className="object-contain p-2" />
      ) : (
        <div className="flex h-full items-center justify-center bg-beige-tint">
          <ShoppingBasket aria-hidden="true" size={40} />
          <span className="sr-only">No photo available</span>
        </div>
      )}
    </div>
  );
}
