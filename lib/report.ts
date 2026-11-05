// Date ranges and search for the admin orders list and sales report. All days are
// Singapore days (UTC+8, no daylight saving), and weeks start on Monday.

const DAY_MS = 24 * 60 * 60 * 1000;
const SG_OFFSET_MS = 8 * 60 * 60 * 1000;

export const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom dates" },
] as const;
export type RangeName = (typeof RANGES)[number]["value"];

/** The Singapore calendar date (YYYY-MM-DD) of a moment. */
export function sgDate(moment: Date | string): string {
  return new Date(new Date(moment).getTime() + SG_OFFSET_MS).toISOString().slice(0, 10);
}

const sgDayStart = (date: string) => new Date(`${date}T00:00:00+08:00`);
const addDays = (date: string, days: number) => sgDate(new Date(sgDayStart(date).getTime() + days * DAY_MS));
const isDate = (value: string | undefined): value is string =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(sgDayStart(value).getTime()));

export type ReportRange = {
  range: RangeName;
  from: string; // first day, inclusive
  to: string; // last day, inclusive
  start: Date; // start of the first day
  end: Date; // start of the day after the last
  days: number;
  error?: string;
};

export function reportRange(range: string | undefined, from?: string, to?: string, now = new Date()): ReportRange {
  const today = sgDate(now);
  const build = (name: RangeName, first: string, last: string, error?: string): ReportRange => {
    const start = sgDayStart(first);
    const end = sgDayStart(addDays(last, 1));
    return { range: name, from: first, to: last, start, end, days: Math.round((end.getTime() - start.getTime()) / DAY_MS), error };
  };

  if (range === "week") {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 Sunday
    return build("week", addDays(today, -((weekday + 6) % 7)), today);
  }
  if (range === "month") return build("month", `${today.slice(0, 8)}01`, today);
  if (range === "custom") {
    if (!isDate(from) || !isDate(to)) return build("today", today, today, "Choose both a start and an end date.");
    if (to < from) return build("custom", to, from, "The end date was before the start date, so they've been swapped.");
    if ((sgDayStart(to).getTime() - sgDayStart(from).getTime()) / DAY_MS > 366) {
      return build("custom", addDays(to, -366), to, "Reports cover up to a year, so the start date has been moved.");
    }
    return build("custom", from, to);
  }
  return build("today", today, today);
}

/**
 * A PostgREST "or" filter matching a customer name, email or order number. Characters
 * with meaning in the filter syntax are dropped, so input can't change the query.
 */
export function customerSearchFilter(query: string | undefined): string | null {
  const term = (query ?? "").replace(/[^\p{L}\p{M}\p{N}@._+\- ]/gu, "").trim().slice(0, 60);
  if (!term) return null;
  return [
    `shipping_address->>recipient_name.ilike.*${term}*`,
    `email.ilike.*${term}*`,
    `order_number.ilike.*${term}*`,
  ].join(",");
}
