-- 04: Row Level Security on every table, plus explicit grants.
-- Customers never write orders or payments. Those go through 06_checkout_functions.sql,
-- which only the server's secret key can run.

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.store_settings enable row level security;

-- Grants decide which tables a role can touch at all; policies decide which rows.
grant usage on schema public, extensions to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant select on public.categories, public.products, public.product_variants,
  public.product_images, public.store_settings to anon, authenticated;
grant insert, update, delete on public.categories, public.products,
  public.product_variants, public.product_images to authenticated;
grant update on public.store_settings to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses, public.carts,
  public.cart_items to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items, public.payments to authenticated;

-- profiles
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- addresses
create policy "addresses: own" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- categories
create policy "categories: public read active" on public.categories
  for select to anon, authenticated
  using (is_active or public.is_admin());
create policy "categories: admin insert" on public.categories
  for insert to authenticated with check (public.is_admin());
create policy "categories: admin update" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories: admin delete" on public.categories
  for delete to authenticated using (public.is_admin());

-- products
create policy "products: public read active" on public.products
  for select to anon, authenticated
  using ((is_active and archived_at is null) or public.is_admin());
create policy "products: admin insert" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "products: admin update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products: admin delete" on public.products
  for delete to authenticated using (public.is_admin());

-- product_variants
create policy "variants: public read active" on public.product_variants
  for select to anon, authenticated
  using (
    public.is_admin() or (is_active and exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active and p.archived_at is null
    ))
  );
create policy "variants: admin insert" on public.product_variants
  for insert to authenticated with check (public.is_admin());
create policy "variants: admin update" on public.product_variants
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "variants: admin delete" on public.product_variants
  for delete to authenticated using (public.is_admin());

-- product_images
create policy "images: public read active" on public.product_images
  for select to anon, authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active and p.archived_at is null
    )
  );
create policy "images: admin insert" on public.product_images
  for insert to authenticated with check (public.is_admin());
create policy "images: admin update" on public.product_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "images: admin delete" on public.product_images
  for delete to authenticated using (public.is_admin());

-- carts
create policy "carts: own" on public.carts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "cart_items: own" on public.cart_items
  for all to authenticated
  using (exists (
    select 1 from public.carts c
    where c.id = cart_id and c.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.carts c
    where c.id = cart_id and c.user_id = (select auth.uid())
  ));

-- orders: customers read their own; only admins update; nobody inserts directly
create policy "orders: read own or admin" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "orders: admin update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "order_items: read own or admin" on public.order_items
  for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = (select auth.uid())
  ));

create policy "payments: read own or admin" on public.payments
  for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = (select auth.uid())
  ));

-- store_settings
create policy "settings: public read" on public.store_settings
  for select to anon, authenticated using (true);
create policy "settings: admin update" on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- webhook_events: RLS on with no policies, so only the secret key can reach it.
