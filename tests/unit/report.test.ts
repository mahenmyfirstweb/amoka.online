import { describe, expect, it } from "vitest";
import { customerSearchFilter, reportRange, sgDate } from "@/lib/report";

// Wednesday 5 November 2026, 00:30 in Singapore (still 4 November in UTC).
const now = new Date("2026-11-04T16:30:00Z");

describe("report date ranges", () => {
  it("uses the Singapore date, not UTC", () => {
    expect(sgDate(now)).toBe("2026-11-05");
    const today = reportRange("today", undefined, undefined, now);
    expect(today.start.toISOString()).toBe("2026-11-04T16:00:00.000Z");
    expect(today.end.toISOString()).toBe("2026-11-05T16:00:00.000Z");
    expect(today.days).toBe(1);
  });

  it("starts the week on Monday and the month on the 1st", () => {
    expect(reportRange("week", undefined, undefined, now)).toMatchObject({ from: "2026-11-02", to: "2026-11-05", days: 4 });
    expect(reportRange("month", undefined, undefined, now)).toMatchObject({ from: "2026-11-01", to: "2026-11-05", days: 5 });
    // A Sunday belongs to the week that started the Monday before.
    expect(reportRange("week", undefined, undefined, new Date("2026-11-08T04:00:00Z")).from).toBe("2026-11-02");
  });

  it("includes the whole of both custom dates", () => {
    const r = reportRange("custom", "2026-10-01", "2026-10-31", now);
    expect(r.start.toISOString()).toBe("2026-09-30T16:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-10-31T16:00:00.000Z");
    expect(r.days).toBe(31);
    expect(r.error).toBeUndefined();
  });

  it("copes with missing, reversed or very long custom dates", () => {
    expect(reportRange("custom", "", "2026-10-31", now)).toMatchObject({ range: "today", error: expect.any(String) });
    expect(reportRange("custom", "2026-10-31", "2026-10-01", now)).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
    expect(reportRange("custom", "2020-01-01", "2026-10-31", now).days).toBe(367);
    expect(reportRange("nonsense", undefined, undefined, now).range).toBe("today");
  });
});

describe("customer search", () => {
  it("searches name, email and order number", () => {
    expect(customerSearchFilter("  Nithya ")).toBe(
      "shipping_address->>recipient_name.ilike.*Nithya*,email.ilike.*Nithya*,order_number.ilike.*Nithya*",
    );
  });

  it("drops characters that could change the filter", () => {
    expect(customerSearchFilter("a,b)(*%\\'\"")).toBe(
      "shipping_address->>recipient_name.ilike.*ab*,email.ilike.*ab*,order_number.ilike.*ab*",
    );
    expect(customerSearchFilter(",,,")).toBeNull();
    expect(customerSearchFilter(undefined)).toBeNull();
  });

  it("keeps names in other scripts", () => {
    expect(customerSearchFilter("நித்யா")).toContain("நித்யா");
  });
});
