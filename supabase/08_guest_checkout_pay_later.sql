-- 08: Guest checkout and "pay later" orders. Run after 07.
-- Safe on a store that already has orders: existing orders become "online" orders.

alter table public.orders
  add column if not exists payment_method text not null default 'online'
    check (payment_method in ('online', 'pay_later')),
  -- A secret in the confirmation link, so guests can see their own order without an account.
  add column if not exists access_token uuid not null default gen_random_uuid(),
  add column if not exists customer_notified_at timestamptz;

create index if not exists orders_open_pay_later_idx on public.orders (lower(email))
  where payment_method = 'pay_later' and status = 'pending';

drop function if exists public.place_order(uuid, text, uuid, jsonb);

-- Create an order from variant IDs and quantities. Prices come only from the database.
-- Signed-in customers pass a saved address ID; guests (p_user_id null) pass the address.
-- Online orders hold stock until their Stripe session ends. Pay-later orders hold it
-- until an admin marks them paid or cancels them.
create function public.place_order(
  p_user_id uuid,
  p_email text,
  p_items jsonb,
  p_payment_method text default 'online',
  p_address_id uuid default null,
  p_address jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_address jsonb;
  v_item record;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_totals record;
  v_order public.orders;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if p_payment_method is null or p_payment_method not in ('online', 'pay_later') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'INVALID_EMAIL';
  end if;

  if p_address_id is not null then
    select jsonb_build_object(
      'recipient_name', a.recipient_name,
      'phone', a.phone,
      'street', a.street,
      'unit', a.unit,
      'building', a.building,
      'postal_code', a.postal_code
    ) into v_address
    from public.addresses a
    where a.id = p_address_id and a.user_id = p_user_id;
    if not found then
      raise exception 'ADDRESS_NOT_FOUND';
    end if;
  else
    v_address := jsonb_build_object(
      'recipient_name', nullif(trim(p_address ->> 'recipient_name'), ''),
      'phone', trim(p_address ->> 'phone'),
      'street', nullif(trim(p_address ->> 'street'), ''),
      'unit', nullif(trim(p_address ->> 'unit'), ''),
      'building', nullif(trim(p_address ->> 'building'), ''),
      'postal_code', trim(p_address ->> 'postal_code')
    );
    if v_address ->> 'recipient_name' is null
       or length(v_address ->> 'recipient_name') > 100
       or v_address ->> 'street' is null
       or length(v_address ->> 'street') > 160
       or length(coalesce(v_address ->> 'unit', '')) > 20
       or length(coalesce(v_address ->> 'building', '')) > 100
       or coalesce(v_address ->> 'phone', '') !~ '^[3689][0-9]{7}$'
       or coalesce(v_address ->> 'postal_code', '') !~ '^[0-9]{6}$' then
      raise exception 'INVALID_ADDRESS';
    end if;
  end if;

  -- Pay-later orders hold stock without payment, so cap how many one email can have open.
  if p_payment_method = 'pay_later' and (
    select count(*) from public.orders
    where lower(email) = v_email and payment_method = 'pay_later' and status = 'pending'
  ) >= 3 then
    raise exception 'TOO_MANY_OPEN_ORDERS';
  end if;

  -- A customer retrying online checkout replaces their earlier unpaid online order,
  -- releasing its stock. Pay-later orders are real orders and are left alone.
  if p_user_id is not null then
    update public.orders set status = 'cancelled'
    where user_id = p_user_id and status = 'pending' and payment_method = 'online';
  end if;

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
    gst_rate_bp, gst_cents, gst_reg_no, shipping_address, payment_method, expires_at
  ) values (
    p_user_id, v_email, v_subtotal, v_totals.shipping_cents, v_totals.total_cents,
    v_totals.gst_rate_bp, v_totals.gst_cents, v_totals.gst_reg_no, v_address,
    p_payment_method,
    case when p_payment_method = 'online' then now() + interval '35 minutes' end
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

  -- A pay-later order is placed now, so its items leave the customer's saved cart.
  if p_payment_method = 'pay_later' and p_user_id is not null then
    delete from public.cart_items ci
    using public.carts c
    where ci.cart_id = c.id
      and c.user_id = p_user_id
      and ci.variant_id in (select (l ->> 'variant_id')::uuid from jsonb_array_elements(v_lines) as l);
  end if;

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'access_token', v_order.access_token,
    'payment_method', v_order.payment_method,
    'shipping_cents', v_order.shipping_cents,
    'total_cents', v_order.total_cents,
    'lines', v_lines
  );
end;
$$;

revoke execute on function public.place_order(uuid, text, jsonb, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.place_order(uuid, text, jsonb, text, uuid, jsonb) to service_role;
