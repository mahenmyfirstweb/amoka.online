/** Accepts "amoka.online", "https://amoka.online/" and so on, and returns "https://amoka.online". */
export function normalizeSiteUrl(value: string | undefined): string {
  const url = (value ?? "").trim().replace(/\/+$/, "");
  if (!url) return "http://localhost:3000";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// Every store detail lives here. Changes appear in the footer, policy pages and invoices.
export const site = {
  name: "amoka.online",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  tagline: "Indian groceries delivered across Singapore",
  description:
    "Shop Indian groceries, spices, snacks, pickles and more online. Delivered across Singapore.",
  legalName: "AMOKA TRADING PTE LTD",
  uen: "201905220M",
  address: "11 Tuas Bay Close, #08-04, West Star, Singapore 636996",
  email: "order@starlucents.com",
  phone: "+65 8600 3499",
  supportHours: "8.30am to 6.30pm",
  deliveryTime: "2 to 4 working days",
  returnWindow: "7 days",
  sfaLicence: "IP20G2257",
} as const;
