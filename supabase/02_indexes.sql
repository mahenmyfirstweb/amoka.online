-- 02: Indexes.

create unique index addresses_one_default_per_user
  on public.addresses (user_id) where is_default;
create index addresses_user_id_idx on public.addresses (user_id);

create index categories_sort_idx on public.categories (sort_order);

create index products_category_id_idx on public.products (category_id);
create index products_featured_idx on public.products (is_featured) where is_featured;
create index products_created_at_idx on public.products (created_at desc);
create index products_name_trgm_idx
  on public.products using gin (name extensions.gin_trgm_ops);
create index products_description_trgm_idx
  on public.products using gin (description extensions.gin_trgm_ops);

create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_images_product_id_idx on public.product_images (product_id);

create index cart_items_cart_id_idx on public.cart_items (cart_id);
create index cart_items_variant_id_idx on public.cart_items (variant_id);

create index orders_user_id_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_expiry_idx on public.orders (expires_at) where status = 'pending';

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

create index payments_order_id_idx on public.payments (order_id);
