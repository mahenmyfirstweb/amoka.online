"use client";

import Image from "next/image";
import { addProductImage, deleteProductImage } from "@/app/admin/actions";
import { imageUrl } from "@/lib/supabase/config";
import { ImageUpload } from "./image-upload";

export function ProductImages({ productId, productName, images }: {
  productId: string;
  productName: string;
  images: { id: string; storage_path: string }[];
}) {
  return (
    <section aria-labelledby="images-heading" className="mb-6 max-w-2xl">
      <h2 id="images-heading" className="mb-2 text-lg">Photos</h2>
      {images.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <li key={image.id} className="card overflow-hidden">
              <div className="relative aspect-square">
                <Image
                  src={imageUrl(image.storage_path) ?? ""}
                  alt={`${productName} photo ${index + 1}`}
                  fill
                  sizes="160px"
                  className="object-contain p-1"
                />
              </div>
              <form action={deleteProductImage}>
                <input type="hidden" name="id" value={image.id} />
                <button type="submit" aria-label={`Remove photo ${index + 1}`} className="w-full py-2.5 text-sm underline">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <ImageUpload
        folder={`products/${productId}`}
        label="Add a photo (JPG, PNG or WebP, up to 5 MB). The first photo is the main one."
        onUploaded={(path) => addProductImage(productId, path, productName)}
      />
    </section>
  );
}
