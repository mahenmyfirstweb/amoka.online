import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

// Minimal stand-ins for what Supabase provides, so the real SQL files run unchanged.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant anon, authenticated, service_role to postgres;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

  create schema storage;
  grant usage on schema storage to anon, authenticated;
  create table storage.buckets (
    id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
`;

const SUPABASE_DIR = join(process.cwd(), "supabase");

export async function createDb() {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(SUPABASE_STUB);

  const files = readdirSync(SUPABASE_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = readFileSync(join(SUPABASE_DIR, file), "utf8")
      // pg_cron isn't available locally; everything else runs exactly as written.
      .replace(/-- BEGIN CRON[\s\S]*?-- END CRON/, "");
    await db.exec(sql);
  }
  return db;
}

export type Db = Awaited<ReturnType<typeof createDb>>;

/** Runs a query as a Supabase role, always resetting afterwards. */
export async function as<T = Record<string, unknown>>(
  db: Db,
  role: "anon" | "authenticated" | "service_role",
  uid: string | null,
  query: string,
  params: unknown[] = [],
) {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${role};`);
  try {
    return await db.query<T>(query, params);
  } finally {
    await db.exec(`reset role; set test.uid = '';`);
  }
}

export async function createUser(db: Db, email: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email) values ($1) returning id",
    [email],
  );
  return rows[0].id;
}

export async function createAddress(db: Db, userId: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.addresses (user_id, recipient_name, phone, street, postal_code)
     values ($1, 'Test', '91234567', '1 Serangoon Road', '218227') returning id`,
    [userId],
  );
  return rows[0].id;
}

export async function createProduct(
  db: Db,
  opts: { name: string; slug: string; priceCents: number; stock: number; active?: boolean; category?: string },
): Promise<{ productId: string; variantId: string }> {
  const product = await db.query<{ id: string }>(
    `insert into public.products (category_id, name, slug, is_active)
     select id, $1, $2, $3 from public.categories where slug = $4 returning id`,
    [opts.name, opts.slug, opts.active ?? true, opts.category ?? "groceries"],
  );
  const variant = await db.query<{ id: string }>(
    `insert into public.product_variants (product_id, label, price_cents, stock)
     values ($1, '500g', $2, $3) returning id`,
    [product.rows[0].id, opts.priceCents, opts.stock],
  );
  return { productId: product.rows[0].id, variantId: variant.rows[0].id };
}

export async function stockOf(db: Db, variantId: string): Promise<number> {
  const { rows } = await db.query<{ stock: number }>(
    "select stock from public.product_variants where id = $1",
    [variantId],
  );
  return rows[0].stock;
}
