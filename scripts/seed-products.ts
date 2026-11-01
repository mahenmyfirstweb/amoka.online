// Uploads the sample images and creates products from scripts/seed/products.csv.
// Run with `npm run seed:products`. Safe to run again: products are matched by their
// slug, prices and details update from the CSV, and stock is only set for new sizes
// so a re-run never overwrites real stock levels.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import sharp from "sharp";
import { slugify } from "../lib/format";
import { dollarsToCents } from "../lib/validation";

config({ path: ".env.local" });

const BUCKET = "product-images";
const FEATURED_COUNT = 8;
const CSV_PATH = join("scripts", "seed", "products.csv");

type Row = {
  image: string;
  name: string;
  brand: string;
  category: string;
  sizes: string;
  prices: string;
  stock: string;
  active: string;
  note: string;
};

function fail(message: string): never {
  console.error(`\nStopped: ${message}`);
  process.exit(1);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) fail("set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: categories, error: categoryError } = await supabase.from("categories").select("id, slug, image_path");
  if (categoryError) fail(`couldn't read categories (${categoryError.message}). Did you run the SQL files?`);
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const rows: Row[] = parse(readFileSync(CSV_PATH), { columns: true, skip_empty_lines: true, trim: true });

  // Check the whole file first, so a typo can't leave the store half-seeded.
  for (const [index, row] of rows.entries()) {
    const where = `row ${index + 2} of ${CSV_PATH} (${row.name})`;
    if (!categoryBySlug.has(row.category)) fail(`${where}: unknown category "${row.category}".`);
    if (!existsSync(join("images", row.image))) fail(`${where}: image not found: images/${row.image}`);
    const sizes = row.sizes.split("|");
    const prices = row.prices.split("|");
    if (sizes.length !== prices.length) fail(`${where}: sizes and prices must have the same number of entries.`);
    if (prices.some((p) => !/^\d+(\.\d{1,2})?$/.test(p.trim()) || dollarsToCents(p.trim()) <= 0)) {
      fail(`${where}: prices must look like 5.00`);
    }
  }

  let live = 0;
  let hidden = 0;

  for (const row of rows) {
    const slug = slugify(row.name);
    const isActive = row.active.toLowerCase() === "yes";
    const category = categoryBySlug.get(row.category)!;

    const image = await sharp(join("images", row.image))
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .webp({ quality: 82 })
      .toBuffer();

    const storagePath = `seed/${slug}.webp`;
    const upload = await supabase.storage.from(BUCKET).upload(storagePath, image, {
      contentType: "image/webp",
      upsert: true,
    });
    if (upload.error) fail(`upload failed for ${row.name}: ${upload.error.message}`);

    const { data: product, error } = await supabase
      .from("products")
      .upsert(
        {
          slug,
          name: row.name,
          brand: row.brand || null,
          category_id: category.id,
          is_active: isActive,
          is_featured: isActive && live < FEATURED_COUNT,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) fail(`couldn't save ${row.name}: ${error.message}`);

    const { data: existing } = await supabase.from("product_variants").select("id, label").eq("product_id", product.id);
    const sizes = row.sizes.split("|").map((s) => s.trim());
    const prices = row.prices.split("|").map((p) => dollarsToCents(p.trim()));

    for (const [index, label] of sizes.entries()) {
      const match = existing?.find((v) => v.label === label);
      const { error: variantError } = match
        ? await supabase.from("product_variants").update({ price_cents: prices[index], sort_order: index }).eq("id", match.id)
        : await supabase.from("product_variants").insert({
            product_id: product.id,
            label,
            price_cents: prices[index],
            stock: Number(row.stock),
            sort_order: index,
          });
      if (variantError) fail(`couldn't save a size of ${row.name}: ${variantError.message}`);
    }

    const { data: images } = await supabase.from("product_images").select("id").eq("product_id", product.id);
    if (!images?.length) {
      await supabase.from("product_images").insert({ product_id: product.id, storage_path: storagePath, alt: row.name });
    }

    if (isActive && !category.image_path) {
      category.image_path = storagePath;
      await supabase.from("categories").update({ image_path: storagePath }).eq("id", category.id);
    }

    if (isActive) live += 1;
    else hidden += 1;
    console.log(`${isActive ? "live  " : "hidden"}  ${row.name}`);
  }

  console.log(`\nDone: ${live} live, ${hidden} hidden. Live prices are placeholders until you change them.`);
}

main();
