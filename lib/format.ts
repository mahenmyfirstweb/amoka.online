export function formatPrice(cents: number): string {
  return `S$${(cents / 100).toFixed(2)}`;
}

export function percentOff(priceCents: number, mrpCents: number | null): number | null {
  if (!mrpCents || mrpCents <= priceCents) return null;
  return Math.round(((mrpCents - priceCents) / mrpCents) * 100);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
  });
}

export function formatRate(rateBp: number): string {
  return `${rateBp / 100}%`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Only allow same-site paths, so a crafted link can't redirect users off the site. */
export function safeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
