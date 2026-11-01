// Every store detail lives here. Replace each value marked REPLACE before going live.
export const site = {
  name: "amoka.online",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Indian groceries delivered across Singapore",
  description:
    "Shop Indian groceries, spices, snacks, pickles and more online. Delivered across Singapore.",
  legalName: "REPLACE: registered company name",
  uen: "REPLACE: company UEN",
  address: "REPLACE: registered business address, Singapore",
  email: "REPLACE: support email",
  phone: "REPLACE: support phone (+65)",
  supportHours: "REPLACE: e.g. Mon to Sat, 10am to 6pm",
  deliveryTime: "REPLACE: e.g. 2 to 4 working days",
  returnWindow: "REPLACE: e.g. 7 days",
  sfaLicence: "REPLACE: SFA licence number, if you have one",
} as const;
