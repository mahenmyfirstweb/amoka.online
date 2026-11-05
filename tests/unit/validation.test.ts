import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "@/config/site";

describe("site address", () => {
  it("accepts the address with or without https:// and a trailing slash", () => {
    expect(normalizeSiteUrl("amoka-online.vercel.app")).toBe("https://amoka-online.vercel.app");
    expect(normalizeSiteUrl(" https://amoka.online/ ")).toBe("https://amoka.online");
    expect(normalizeSiteUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeSiteUrl(undefined)).toBe("http://localhost:3000");
    expect(normalizeSiteUrl("")).toBe("http://localhost:3000");
  });
});
import { formatPrice, percentOff, safeRedirectPath, slugify } from "@/lib/format";
import { addressSchema, cartItemsSchema, dollarsToCents, variantSchema } from "@/lib/validation";

const address = {
  recipient_name: "Test",
  phone: "91234567",
  street: "1 Serangoon Road",
  postal_code: "218227",
};

describe("addresses", () => {
  it("accepts a Singapore address and normalises the phone number", () => {
    expect(addressSchema.parse({ ...address, phone: "+65 9123 4567" }).phone).toBe("91234567");
  });

  it("rejects bad postal codes and phone numbers", () => {
    expect(addressSchema.safeParse({ ...address, postal_code: "63996" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, phone: "1234567" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, phone: "9876543210" }).success).toBe(false);
  });
});

describe("money", () => {
  it("converts dollars to cents without floating-point errors", () => {
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents("1.1")).toBe(110);
    expect(dollarsToCents("5")).toBe(500);
    expect(dollarsToCents("1.15")).toBe(115);
  });

  it("formats prices in Singapore dollars", () => {
    expect(formatPrice(1250)).toBe("S$12.50");
    expect(formatPrice(5)).toBe("S$0.05");
  });

  it("works out the discount only when the was price is higher", () => {
    expect(percentOff(750, 1000)).toBe(25);
    expect(percentOff(1000, 1000)).toBeNull();
    expect(percentOff(1000, null)).toBeNull();
  });

  it("rejects a was price below the selling price", () => {
    const variant = { label: "500g", price: "5.00", stock: "1" };
    expect(variantSchema.safeParse({ ...variant, mrp: "4.00" }).success).toBe(false);
    expect(variantSchema.safeParse({ ...variant, mrp: "6.00" }).success).toBe(true);
    expect(variantSchema.safeParse({ ...variant, mrp: "" }).success).toBe(true);
  });

  it("rejects zero, negative and malformed prices", () => {
    const variant = { label: "500g", mrp: "", stock: "1" };
    for (const price of ["0", "-1", "abc", "1.234"]) {
      expect(variantSchema.safeParse({ ...variant, price }).success).toBe(false);
    }
  });
});

describe("cart items", () => {
  const variant_id = "4a7b1e2c-8d3f-4c6a-9b1e-2f3a4b5c6d7e";

  it("strips anything the client adds, such as a price", () => {
    const parsed = cartItemsSchema.parse([{ variant_id, quantity: 1, price_cents: 1 }]);
    expect(parsed[0]).toEqual({ variant_id, quantity: 1 });
  });

  it("rejects bad quantities, bad IDs and empty carts", () => {
    expect(cartItemsSchema.safeParse([{ variant_id, quantity: 0 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ variant_id, quantity: 100 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ variant_id, quantity: 1.5 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ variant_id: "x", quantity: 1 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([]).success).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("keeps same-site paths and rejects links to other sites", () => {
    expect(safeRedirectPath("/checkout")).toBe("/checkout");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("https://evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    expect(safeRedirectPath(null, "/account")).toBe("/account");
  });
});

describe("slugify", () => {
  it("makes readable web addresses", () => {
    expect(slugify("Lay's American Style Cream & Onion")).toBe("lay-s-american-style-cream-and-onion");
    expect(slugify("  Appalam & Vadagam ")).toBe("appalam-and-vadagam");
  });
});
