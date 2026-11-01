-- 06: Catalogue, cart and checkout functions. All money logic lives here.

-- Shipping and GST for a subtotal. GST is inclusive: gst = total * rate / (100% + rate).
create function public.compute_totals(p_subtotal_cents integer)
returns table (
  shipping_cents integer,
  total_cents integer,
  gst_rate_bp integer,
  gst_cents integer,
  gst_reg_no text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.store_settings;
begin
  select * into strict s from public.store_settings where id = 1;

  shipping_cents := case
    when p_subtotal_cents = 0 or p_subtotal_cents >= s.free_shipping_threshold_cents then 0
    else s.shipping_fee_cents
  end;
  total_cents := p_subtotal_cents + shipping_cents;

  if s.gst_registered then
    gst_rate_bp := s.gst_rate_bp;
    gst_cents := round(total_cents * s.gst_rate_bp::numeric / (10000 + s.gst_rate_bp))::integer;
    gst_reg_no := s.gst_reg_no;
  else
    gst_rate_bp := 0;
    gst_cents := 0;
    gst_reg_no := null;
  end if;

  return next;
end;
$$;

-- Live prices and totals for a cart. Runs as the caller, so hidden products drop out.
-- p_items: [{"variant_id": "...", "quantity": 2}, ...]
create function public.quote_cart(p_items jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_lines jsonb;
  v_subtotal integer;
  t record;
  v_threshold integer;
begin
  with wanted as (
    select (e ->> 'variant_id')::uuid as variant_id,
           least(greatest((e ->> 'quantity')::integer, 1), 99) as quantity
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as e
  ),
  lines as (
    select
      w.variant_id,
      w.quantity,
      v.id is not null and v.stock >= w.quantity as available,
      coalesce(v.stock, 0) as stock,
      v.label as variant_label,
      v.price_cents as unit_price_cents,
      p.name as product_name,
      p.slug as product_slug,
      (select i.storage_path from public.product_images i
       where i.product_id = p.id
       order by i.sort_order, i.created_at limit 1) as image_path
    from wanted w
    left join public.product_variants v on v.id = w.variant_id and v.is_active
    left join public.products p on p.id = v.product_id
  )
  select
    coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object(
      'line_total_cents', case when l.available then l.unit_price_cents * l.quantity else 0 end
    ) order by l.product_name), '[]'::jsonb),
    coalesce(sum(l.unit_price_cents * l.quantity) filter (where l.available), 0)::integer
  into v_lines, v_subtotal
  from lines l;

  select * into t from public.compute_totals(v_subtotal);
  select free_shipping_threshold_cents into v_threshold
  from public.store_settings where id = 1;

  return jsonb_build_object(
    'lines', v_lines,
    'subtotal_cents', v_subtotal,
    'shipping_cents', t.shipping_cents,
    'total_cents', t.total_cents,
    'gst_rate_bp', t.gst_rate_bp,
    'gst_cents', t.gst_cents,
    'free_shipping_threshold_cents', v_threshold
  );
end;
$$;

-- Add guest items to the signed-in user's cart, or replace it. Caps at available stock.
create function public.sync_cart(p_items jsonb, p_replace boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_cart uuid;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  insert into public.carts (user_id) values (v_user)
  on conflict (user_id) do update set updated_at = now()
  returning id into v_cart;

  if p_replace then
    delete from public.cart_items where cart_id = v_cart;
  end if;

  insert into public.cart_items (cart_id, variant_id, quantity)
  select v_cart, v.id, least(sum(greatest((e ->> 'quantity')::integer, 1)), 99, v.stock)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as e
  join public.product_variants v on v.id = (e ->> 'variant_id')::uuid
  where v.is_active and v.stock > 0
  group by v.id, v.stock
  on conflict (cart_id, variant_id) do update
    set quantity = least(
      public.cart_items.quantity + excluded.quantity, 99,
      (select stock from public.product_variants where id = excluded.variant_id)
    );

  return coalesce((
    select jsonb_agg(jsonb_build_object('variant_id', variant_id, 'quantity', quantity))
    from public.cart_items where cart_id = v_cart
  ), '[]'::jsonb);
end;
$$;

-- Create a pending order from variant IDs and quantities. Prices come only from the
-- database. Locks each variant row, reserves stock and snapshots the sale.
create function public.place_order(
  p_user_id uuid,
  p_email text,
  p_address_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_address public.addresses;
  v_item record;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_totals record;
  v_order public.orders;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  select * into v_address from public.addresses
  where id = p_address_id and user_id = p_user_id;
  if not found then
    raise exception 'ADDRESS_NOT_FOUND';
  end if;

  -- A customer retrying checkout replaces their earlier unpaid order, releasing its stock.
  update public.orders set status = 'cancelled'
  where user_id = p_user_id and status = 'pending';

  -- Lock in a fixed order so two checkouts can't deadlock each other. This has to be
  -- its own statement: the loop query below then reads the post-lock stock values.
  perform 1 from public.product_variants v
  where v.id in (
    select (e ->> 'variant_id')::uuid from jsonb_array_elements(p_items) as e
  )
  order by v.id
  for update;

  for v_item in
    with wanted as (
      select (e ->> 'variant_id')::uuid as variant_id,
             sum((e ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) as e
      group by 1
    )
    select
      w.variant_id,
      w.quantity,
      v.id as found_id,
      v.stock,
      v.label,
      v.price_cents,
      v.is_active as variant_active,
      p.id as product_id,
      p.name as product_name,
      p.is_active and p.archived_at is null as product_active,
      (select i.storage_path from public.product_images i
       where i.product_id = p.id
       order by i.sort_order, i.created_at limit 1) as image_path
    from wanted w
    left join public.product_variants v on v.id = w.variant_id
    left join public.products p on p.id = v.product_id
    order by w.variant_id
  loop
    if v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if v_item.found_id is null or not v_item.variant_active or not v_item.product_active then
      raise exception 'ITEM_UNAVAILABLE:%', v_item.variant_id;
    end if;
    if v_item.stock < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_item.variant_id;
    end if;

    update public.product_variants
    set stock = stock - v_item.quantity
    where id = v_item.variant_id;

    v_subtotal := v_subtotal + v_item.price_cents * v_item.quantity;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_item.product_id,
      'variant_id', v_item.variant_id,
      'product_name', v_item.product_name,
      'variant_label', v_item.label,
      'image_path', v_item.image_path,
      'unit_price_cents', v_item.price_cents,
      'quantity', v_item.quantity,
      'line_total_cents', v_item.price_cents * v_item.quantity
    );
  end loop;

  select * into v_totals from public.compute_totals(v_subtotal);

  insert into public.orders (
    user_id, email, subtotal_cents, shipping_cents, total_cents,
    gst_rate_bp, gst_cents, gst_reg_no, shipping_address, expires_at
  ) values (
    p_user_id, p_email, v_subtotal, v_totals.shipping_cents, v_totals.total_cents,
    v_totals.gst_rate_bp, v_totals.gst_cents, v_totals.gst_reg_no,
    jsonb_build_object(
      'recipient_name', v_address.recipient_name,
      'phone', v_address.phone,
      'street', v_address.street,
      'unit', v_address.unit,
      'building', v_address.building,
      'postal_code', v_address.postal_code
    ),
    now() + interval '35 minutes'
  )
  returning * into v_order;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label,
    image_path, unit_price_cents, quantity, line_total_cents
  )
  select v_order.id, (l ->> 'product_id')::uuid, (l ->> 'variant_id')::uuid,
    l ->> 'product_name', l ->> 'variant_label', l ->> 'image_path',
    (l ->> 'unit_price_cents')::integer, (l ->> 'quantity')::integer,
    (l ->> 'line_total_cents')::integer
  from jsonb_array_elements(v_lines) as l;

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'shipping_cents', v_order.shipping_cents,
    'total_cents', v_order.total_cents,
    'lines', v_lines
  );
end;
$$;

-- Record a successful payment. Called by the webhook and the confirmation page, in
-- either order, any number of times.
create function public.mark_order_paid(
  p_session_id text,
  p_payment_intent_id text,
  p_method text,
  p_amount_cents integer,
  p_currency text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_order public.orders;
  v_short integer;
begin
  select * into v_payment from public.payments
  where stripe_session_id = p_session_id for update;
  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  if v_payment.status = 'paid' then
    return 'already_paid';
  end if;

  select * into v_order from public.orders where id = v_payment.order_id for update;

  update public.payments set
    status = 'paid',
    stripe_payment_intent_id = p_payment_intent_id,
    method = p_method,
    amount_cents = p_amount_cents,
    currency = upper(p_currency),
    paid_at = now()
  where id = v_payment.id;

  if p_amount_cents <> v_order.total_cents or upper(p_currency) <> v_order.currency then
    update public.orders set
      needs_review = true,
      review_note = format('Paid %s %s but order total is %s %s. Check before shipping.',
        p_amount_cents, upper(p_currency), v_order.total_cents, v_order.currency)
    where id = v_order.id;
    return 'amount_mismatch';
  end if;

  if v_order.status = 'pending' then
    update public.orders set status = 'paid', paid_at = now() where id = v_order.id;
  elsif v_order.status = 'cancelled' then
    -- Paid after the order expired: take the stock back if it's still there.
    perform 1 from public.product_variants v
    join public.order_items i on i.variant_id = v.id
    where i.order_id = v_order.id
    order by v.id
    for update of v;

    select count(*) into v_short
    from public.order_items i
    left join public.product_variants v on v.id = i.variant_id
    where i.order_id = v_order.id and (v.id is null or v.stock < i.quantity);

    if v_short > 0 then
      update public.orders set
        needs_review = true,
        review_note = 'Paid after the order expired and stock has run out. Refund in Stripe or restock.',
        paid_at = now()
      where id = v_order.id;
      return 'late_needs_review';
    end if;

    update public.product_variants v
    set stock = v.stock - i.quantity
    from public.order_items i
    where i.order_id = v_order.id and i.variant_id = v.id;

    update public.orders set
      status = 'paid', paid_at = now(), stock_reserved = true, cancelled_at = null
    where id = v_order.id;
  end if;

  -- The order is paid, so these items leave the customer's cart.
  delete from public.cart_items ci
  using public.carts c, public.order_items i
  where ci.cart_id = c.id
    and c.user_id = v_order.user_id
    and i.order_id = v_order.id
    and i.variant_id = ci.variant_id;

  return 'paid';
end;
$$;

-- A Stripe session expired or an async payment failed.
create function public.close_unpaid_session(p_session_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  if p_status not in ('failed', 'expired') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.payments set status = p_status
  where stripe_session_id = p_session_id and status = 'created'
  returning order_id into v_order_id;

  if v_order_id is not null then
    update public.orders set status = 'cancelled'
    where id = v_order_id and status = 'pending';
  end if;
end;
$$;

-- Cancel unpaid orders past their expiry, returning their stock. Scheduled below.
create function public.release_expired_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.orders set status = 'cancelled'
    where status = 'pending' and expires_at < now()
    returning id
  )
  select count(*) into v_count from expired;
  return v_count;
end;
$$;

-- Product listing used by category pages, search and the home page.
create function public.list_products(
  p_category_slug text default null,
  p_query text default null,
  p_min_cents integer default null,
  p_max_cents integer default null,
  p_in_stock boolean default false,
  p_featured boolean default false,
  p_sort text default 'newest',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  category_slug text,
  image_path text,
  min_price_cents integer,
  variants jsonb,
  total_count bigint
)
language sql
stable
set search_path = public, extensions
as $$
  with q as (
    select nullif(trim(p_query), '') as term
  ),
  base as (
    select
      p.id, p.slug, p.name, p.created_at, c.slug as category_slug,
      (select i.storage_path from public.product_images i
       where i.product_id = p.id
       order by i.sort_order, i.created_at limit 1) as image_path,
      vs.min_price_cents, vs.variants, vs.has_stock,
      case when q.term is null then 0
           else greatest(word_similarity(q.term, p.name),
                         word_similarity(q.term, coalesce(p.brand, '')))
      end as score
    from public.products p
    cross join q
    join public.categories c on c.id = p.category_id and c.is_active
    join lateral (
      select
        min(v.price_cents)::integer as min_price_cents,
        bool_or(v.stock > 0) as has_stock,
        jsonb_agg(jsonb_build_object(
          'id', v.id, 'label', v.label, 'price_cents', v.price_cents,
          'mrp_cents', v.mrp_cents, 'stock', v.stock
        ) order by v.sort_order, v.price_cents) as variants
      from public.product_variants v
      where v.product_id = p.id and v.is_active
    ) vs on vs.variants is not null
    where p.is_active and p.archived_at is null
      and (p_category_slug is null or c.slug = p_category_slug)
      and (not p_featured or p.is_featured)
      and (p_min_cents is null or vs.min_price_cents >= p_min_cents)
      and (p_max_cents is null or vs.min_price_cents <= p_max_cents)
      and (not p_in_stock or vs.has_stock)
      and (
        q.term is null
        or p.name ilike '%' || q.term || '%'
        or p.brand ilike '%' || q.term || '%'
        or p.description ilike '%' || q.term || '%'
        or word_similarity(q.term, p.name) > 0.3
      )
  )
  select b.id, b.slug, b.name, b.category_slug, b.image_path,
         b.min_price_cents, b.variants, count(*) over () as total_count
  from base b
  order by
    case when p_sort = 'price_asc' then b.min_price_cents end asc,
    case when p_sort = 'price_desc' then b.min_price_cents end desc,
    case when p_sort = 'name' then b.name end asc,
    case when p_sort = 'relevance' then b.score end desc,
    b.created_at desc,
    b.id
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

-- Who can run what. Functions default to PUBLIC, so start by removing that.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.quote_cart(jsonb) to anon, authenticated, service_role;
grant execute on function public.list_products(text, text, integer, integer, boolean, boolean, text, integer, integer)
  to anon, authenticated, service_role;
grant execute on function public.compute_totals(integer) to anon, authenticated, service_role;
grant execute on function public.sync_cart(jsonb, boolean) to authenticated;

grant execute on function public.place_order(uuid, text, uuid, jsonb) to service_role;
grant execute on function public.mark_order_paid(text, text, text, integer, text) to service_role;
grant execute on function public.close_unpaid_session(text, text) to service_role;
grant execute on function public.release_expired_orders() to service_role;

-- BEGIN CRON
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'release-expired-orders',
  '*/10 * * * *',
  'select public.release_expired_orders()'
);
-- END CRON
