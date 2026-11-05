-- 09: Home page slides ("banners") managed in Admin > Home slides. Run after 08.
-- Safe to run on a store that already has orders.

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  eyebrow text check (eyebrow is null or length(eyebrow) <= 40),
  title text not null check (length(title) between 1 and 120),
  body text check (body is null or length(body) <= 240),
  image_path text,
  button_label text check (button_label is null or length(button_label) <= 30),
  -- Only links inside the shop ("/c/snacks") or to secure sites.
  button_link text check (button_link is null or button_link ~ '^(/[^/]|/$|https://)'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists banners_sort_idx on public.banners (sort_order, created_at);

drop trigger if exists banners_updated_at on public.banners;
create trigger banners_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

alter table public.banners enable row level security;
grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;
grant all on public.banners to service_role;

-- Shoppers see slides that are switched on and within their dates; admins see all.
drop policy if exists "banners: public read live" on public.banners;
create policy "banners: public read live" on public.banners
  for select to anon, authenticated
  using (
    public.is_admin() or (
      is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
  );

drop policy if exists "banners: admin insert" on public.banners;
create policy "banners: admin insert" on public.banners
  for insert to authenticated with check (public.is_admin());
drop policy if exists "banners: admin update" on public.banners;
create policy "banners: admin update" on public.banners
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "banners: admin delete" on public.banners;
create policy "banners: admin delete" on public.banners
  for delete to authenticated using (public.is_admin());
