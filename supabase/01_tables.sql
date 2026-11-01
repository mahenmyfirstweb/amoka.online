-- 01: Tables. Run first.
-- All money is stored as integer SGD cents (S$12.50 = 1250).

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text not null check (phone ~ '^[3689][0-9]{7}$'),
  street text not null,
  unit text,
  building text,
  postal_code text not null check (postal_code ~ '^[0-9]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  brand text,
  ingredients text,
  allergens text,
  country_of_origin text,
  shelf_life text,
  manufacturer text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  price_cents integer not null check (price_cents > 0),
  mrp_cents integer check (mrp_cents is null or mrp_cents >= price_cents),
  stock integer not null default 0 check (stock >= 0),
  sku text unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, label)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create sequence public.order_number_seq start 10001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default 'AM-' || nextval('public.order_number_seq'),
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  currency text not null default 'SGD' check (currency = 'SGD'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  total_cents integer not null check (total_cents = subtotal_cents + shipping_cents),
  -- GST is already inside the total. These record the included portion at time of sale.
  gst_rate_bp integer not null default 0,
  gst_cents integer not null default 0,
  gst_reg_no text,
  shipping_address jsonb not null,
  stock_reserved boolean not null default true,
  needs_review boolean not null default false,
  review_note text,
  admin_notified_at timestamptz,
  expires_at timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  variant_label text not null,
  image_path text,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'stripe',
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  method text,
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed', 'expired')),
  amount_cents integer not null,
  currency text not null default 'SGD',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  shipping_fee_cents integer not null default 600 check (shipping_fee_cents >= 0),
  free_shipping_threshold_cents integer not null default 6000
    check (free_shipping_threshold_cents >= 0),
  gst_registered boolean not null default true,
  gst_rate_bp integer not null default 900 check (gst_rate_bp between 0 and 5000),
  gst_reg_no text,
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);
