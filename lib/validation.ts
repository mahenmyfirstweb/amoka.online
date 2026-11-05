import { z } from "zod";

const trimmed = (max: number) => z.string().trim().min(1, "This field is required").max(max);
const optional = (max: number) =>
  z.string().trim().max(max).transform((v) => v || null).nullable().optional();

export const cartItemsSchema = z
  .array(
    z.object({
      variant_id: z.uuid(),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .min(1, "Your cart is empty")
  .max(100);

export const addressSchema = z.object({
  label: optional(40),
  recipient_name: trimmed(100),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/^\+?65/, "").replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^[3689]\d{7}$/, "Enter an 8-digit Singapore phone number")),
  street: trimmed(160),
  unit: optional(20),
  building: optional(100),
  postal_code: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit postal code"),
});

export const PAYMENT_METHODS = ["online", "pay_later"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** What a guest types at checkout. Signed-in customers pick a saved address instead. */
export const guestDetailsSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address").max(254)),
  address: addressSchema.omit({ label: true }),
});

export const checkoutSchema = z.object({
  items: cartItemsSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  addressId: z.uuid().optional(),
  guest: guestDetailsSchema.optional(),
});

export const profileSchema = z.object({
  full_name: trimmed(100),
  phone: optional(20),
});

export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72);

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount such as 12.50");

/** Converts a dollars string to cents without floating-point rounding errors. */
export function dollarsToCents(value: string): number {
  const [dollars, cents = ""] = value.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

export const dollars = moneyString.transform(dollarsToCents);

export const variantSchema = z
  .object({
    id: z.uuid().nullable().optional(),
    label: trimmed(40),
    price: dollars.refine((v) => v > 0, "Price must be above zero"),
    mrp: z.union([z.literal("").transform(() => null), dollars]),
    stock: z.coerce.number().int().min(0).max(1_000_000),
    sku: optional(60),
  })
  .refine((v) => v.mrp === null || v.mrp >= v.price, {
    message: "The \"was\" price can't be below the selling price",
    path: ["mrp"],
  });

export const productSchema = z.object({
  name: trimmed(160),
  slug: z.string().trim().regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and hyphens").max(180),
  category_id: z.uuid("Choose a category"),
  brand: optional(100),
  description: optional(4000),
  ingredients: optional(2000),
  allergens: optional(500),
  country_of_origin: optional(80),
  shelf_life: optional(120),
  manufacturer: optional(200),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  variants: z.array(variantSchema).min(1, "Add at least one size"),
});

export const categorySchema = z.object({
  name: trimmed(80),
  slug: z.string().trim().regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and hyphens").max(100),
  description: optional(1000),
  sort_order: z.coerce.number().int().min(0).max(100000),
  is_active: z.boolean(),
});

export const settingsSchema = z.object({
  shipping_fee: dollars,
  free_shipping_threshold: dollars,
  gst_registered: z.boolean(),
  gst_rate: dollars.refine((v) => v <= 5000, "Rate looks too high"),
  gst_reg_no: optional(30),
  low_stock_threshold: z.coerce.number().int().min(0).max(100000),
});

export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const orderStatusSchema = z.enum(ORDER_STATUSES);

/** Next statuses an admin may choose. Mirrors the rule in handle_order_status_change. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
