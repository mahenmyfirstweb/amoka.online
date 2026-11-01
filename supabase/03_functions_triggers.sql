-- 03: Helper functions and triggers. Run before the RLS policies, which use is_admin().

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Create a profile whenever someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();
create trigger cart_items_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- Stop customers making themselves admin. RLS lets them update their own row,
-- so the role column needs its own guard. auth.uid() is null for the SQL editor
-- and the server's secret key, which are allowed to set roles.
create function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception 'ROLE_CHANGE_NOT_ALLOWED';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Order status changes:
--   Admin dashboard users may only move an order forward (see allowed list).
--   Server functions run with no auth.uid() and can apply late-payment recovery.
--   Any cancellation returns reserved stock, whoever did it.
create function public.handle_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if (select auth.uid()) is not null and not (
    (old.status = 'pending' and new.status in ('paid', 'cancelled'))
    or (old.status = 'paid' and new.status in ('shipped', 'cancelled'))
    or (old.status = 'shipped' and new.status = 'delivered')
  ) then
    raise exception 'INVALID_STATUS_CHANGE: % to %', old.status, new.status;
  end if;

  if new.status = 'cancelled' then
    new.cancelled_at = now();
    if old.stock_reserved then
      update public.product_variants v
      set stock = v.stock + i.quantity
      from public.order_items i
      where i.order_id = new.id and i.variant_id = v.id;
      new.stock_reserved = false;
    end if;
  elsif new.status = 'paid' then
    new.paid_at = coalesce(new.paid_at, now());
    new.expires_at = null;
  elsif new.status = 'shipped' then
    new.shipped_at = now();
  elsif new.status = 'delivered' then
    new.delivered_at = now();
  end if;

  return new;
end;
$$;

create trigger orders_status_change before update on public.orders
  for each row execute function public.handle_order_status_change();
