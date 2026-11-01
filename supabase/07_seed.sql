-- 07: Starting data: store settings and the 20 categories.
-- Safe to run again. Products come from `npm run seed:products`.

insert into public.store_settings (id) values (1)
on conflict (id) do nothing;

insert into public.categories (name, slug, sort_order) values
  ('Beverages', 'beverages', 10),
  ('Candy', 'candy', 20),
  ('Groceries', 'groceries', 30),
  ('Spices', 'spices', 40),
  ('Nuts', 'nuts', 50),
  ('Pickles', 'pickles', 60),
  ('Snacks', 'snacks', 70),
  ('Appalam & Vadagam', 'appalam-vadagam', 80),
  ('Lays & Kurkure', 'lays-kurkure', 90),
  ('Rice', 'rice', 100),
  ('Semiya', 'semiya', 110),
  ('Aachi Masala', 'aachi-masala', 120),
  ('Paakku', 'paakku', 130),
  ('Biscuits', 'biscuits', 140),
  ('Oil', 'oil', 150),
  ('Dhall', 'dhall', 160),
  ('Chocolate', 'chocolate', 170),
  ('Chips', 'chips', 180),
  ('Coffee & Tea', 'coffee-tea', 190),
  ('Millets', 'millets', 200)
on conflict (slug) do nothing;
