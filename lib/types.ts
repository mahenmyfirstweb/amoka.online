import type { OrderStatus } from "./validation";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Variant = {
  id: string;
  label: string;
  price_cents: number;
  mrp_cents: number | null;
  stock: number;
};

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  image_path: string | null;
  min_price_cents: number;
  variants: Variant[];
  total_count: number;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  ingredients: string | null;
  allergens: string | null;
  country_of_origin: string | null;
  shelf_life: string | null;
  manufacturer: string | null;
  categories: { name: string; slug: string } | null;
  product_images: { id: string; storage_path: string; alt: string | null; sort_order: number }[];
  product_variants: (Variant & { sort_order: number })[];
};

export type CartItem = { variant_id: string; quantity: number };

export type QuoteLine = {
  variant_id: string;
  quantity: number;
  available: boolean;
  stock: number;
  variant_label: string | null;
  unit_price_cents: number | null;
  product_name: string | null;
  product_slug: string | null;
  image_path: string | null;
  line_total_cents: number;
};

export type Quote = {
  lines: QuoteLine[];
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  gst_rate_bp: number;
  gst_cents: number;
  free_shipping_threshold_cents: number;
};

export type Address = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  street: string;
  unit: string | null;
  building: string | null;
  postal_code: string;
  is_default: boolean;
};

export type OrderAddress = Omit<Address, "id" | "label" | "is_default">;

export type OrderItem = {
  id: string;
  product_name: string;
  variant_label: string;
  image_path: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type Order = {
  id: string;
  order_number: string;
  email: string;
  status: OrderStatus;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  gst_rate_bp: number;
  gst_cents: number;
  gst_reg_no: string | null;
  shipping_address: OrderAddress;
  needs_review: boolean;
  review_note: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
};
