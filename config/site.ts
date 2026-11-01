// Every store detail lives here. Replace each value marked REPLACE before going live.
export const site = {
  name: "amoka.online",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Indian groceries delivered across Singapore",
  description:
    "Shop Indian groceries, spices, snacks, pickles and more online. Delivered across Singapore.",
  legalName: "AMOKA TRADING PTE LTD",
  uen: "201905220M",
  address: "11 Tuas Bay Close, #08-04, West Star, Singapore 636996",
  email: "REPLACE: support email",
  phone: "+65 8600 3499",
  supportHours: "8.30am to 6.30pm",
  deliveryTime: "2 to 4 working days",
  returnWindow: "7 days",
  sfaLicence: "IP20G2257",
} as const;
