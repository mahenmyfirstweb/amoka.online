import Link from "next/link";
import { PAGE_SIZE, SORT_OPTIONS, type ListFilters } from "@/lib/catalog";
import { dollarsToCents } from "@/lib/validation";

export type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function cents(value: string): number | undefined {
  return /^\d+(\.\d{1,2})?$/.test(value) ? dollarsToCents(value) : undefined;
}

export function parseFilters(params: SearchParams): ListFilters {
  const sort = one(params.sort);
  return {
    minCents: cents(one(params.min)),
    maxCents: cents(one(params.max)),
    inStock: one(params.stock) === "1",
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : undefined,
    page: Number.parseInt(one(params.page), 10) || 1,
  };
}

/** A plain GET form, so filtering works before any JavaScript has loaded. */
export function FilterBar({ params, query }: { params: SearchParams; query?: string }) {
  return (
    <form className="mb-5 grid grid-cols-2 items-end gap-3 rounded-xl bg-beige-tint p-3 sm:flex sm:flex-wrap">
      {query !== undefined && <input type="hidden" name="q" value={query} />}
      <div>
        <label htmlFor="min" className="mb-1 block text-sm">Min price (S$)</label>
        <input id="min" name="min" inputMode="decimal" defaultValue={one(params.min)} className="input sm:w-28" />
      </div>
      <div>
        <label htmlFor="max" className="mb-1 block text-sm">Max price (S$)</label>
        <input id="max" name="max" inputMode="decimal" defaultValue={one(params.max)} className="input sm:w-28" />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label htmlFor="sort" className="mb-1 block text-sm">Sort by</label>
        <select id="sort" name="sort" defaultValue={one(params.sort) || "newest"} className="input sm:w-48">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <label className="flex min-h-12 items-center gap-2 text-sm">
        <input type="checkbox" name="stock" value="1" defaultChecked={one(params.stock) === "1"} className="h-5 w-5 accent-brown" />
        In stock only
      </label>
      <button type="submit" className="btn btn-outline">Apply</button>
    </form>
  );
}

export function Pagination({ total, page, params, basePath }: {
  total: number;
  page: number;
  params: SearchParams;
  basePath: string;
}) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key !== "page" && one(value)) search.set(key, one(value));
    }
    search.set("page", String(target));
    return `${basePath}?${search}`;
  };

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
      {page > 1 && <Link href={href(page - 1)} className="btn btn-outline">Previous</Link>}
      <span className="text-sm">Page {page} of {pages}</span>
      {page < pages && <Link href={href(page + 1)} className="btn btn-outline">Next</Link>}
    </nav>
  );
}
