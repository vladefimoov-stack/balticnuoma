"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type CatalogCar = { id: string; categorySlug: string; price: number | null; sort: number };
export type CatalogCategory = { slug: string; name: string; count: number };

type Sort = "recommended" | "price_asc" | "price_desc";
type Filters = { category: string; from: string; to: string; maxPrice: number | null; sort: Sort };

const DEFAULT_FILTERS: Filters = { category: "all", from: "", to: "", maxPrice: null, sort: "recommended" };
const SORTS: Sort[] = ["recommended", "price_asc", "price_desc"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

type Props = {
  cars: CatalogCar[];
  categories: CatalogCategory[];
  /** Server-rendered <CarCard /> for every car, keyed by id. */
  cards: Record<string, ReactNode>;
  today: string;
};

function readFiltersFromUrl(categories: CatalogCategory[]): Filters {
  const p = new URLSearchParams(window.location.search);
  const category = p.get("category") ?? "all";
  const from = p.get("from") ?? "";
  const to = p.get("to") ?? "";
  const maxPrice = Number(p.get("maxPrice"));
  const sort = p.get("sort") as Sort | null;
  return {
    category: categories.some((c) => c.slug === category) ? category : "all",
    from: ISO.test(from) ? from : "",
    to: ISO.test(to) ? to : "",
    maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : null,
    sort: sort && SORTS.includes(sort) ? sort : "recommended",
  };
}

function writeFiltersToUrl(f: Filters) {
  const p = new URLSearchParams();
  if (f.category !== "all") p.set("category", f.category);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.maxPrice !== null) p.set("maxPrice", String(f.maxPrice));
  if (f.sort !== "recommended") p.set("sort", f.sort);
  const qs = p.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg [color-scheme:dark] transition-colors hover:border-line-strong focus:border-amber focus:outline-none";

export function Catalog({ cars, categories, cards, today }: Props) {
  const t = useTranslations("catalog");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState<Set<string> | null>(null);
  const [availability, setAvailability] = useState<"idle" | "loading" | "error">("idle");

  const prices = cars.map((c) => c.price).filter((p): p is number => p !== null);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  // Restore filters from the URL once on the client (keeps the page statically rendered).
  useEffect(() => {
    setFilters(readFiltersFromUrl(categories));
    setReady(true);
  }, [categories]);

  useEffect(() => {
    if (ready) writeFiltersToUrl(filters);
  }, [filters, ready]);

  // Date filter → ask the server which cars are free for the whole range.
  useEffect(() => {
    if (!filters.from || !filters.to) {
      setAvailable(null);
      setAvailability("idle");
      return;
    }
    const controller = new AbortController();
    setAvailability("loading");
    fetch(`/api/availability?from=${filters.from}&to=${filters.to}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { carIds?: unknown };
        const ids = Array.isArray(body.carIds) ? body.carIds.filter((x): x is string => typeof x === "string") : [];
        setAvailable(new Set(ids));
        setAvailability("idle");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailable(null);
        setAvailability("error");
      });
    return () => controller.abort();
  }, [filters.from, filters.to]);

  const visible = useMemo(() => {
    const list = cars.filter(
      (c) =>
        (filters.category === "all" || c.categorySlug === filters.category) &&
        (filters.maxPrice === null || (c.price !== null && c.price <= filters.maxPrice)) &&
        (available === null || available.has(c.id)),
    );
    const byPrice = (a: CatalogCar, b: CatalogCar, dir: 1 | -1) =>
      a.price === null ? 1 : b.price === null ? -1 : (a.price - b.price) * dir;
    return list.sort((a, b) =>
      filters.sort === "price_asc"
        ? byPrice(a, b, 1)
        : filters.sort === "price_desc"
          ? byPrice(a, b, -1)
          : a.sort - b.sort,
    );
  }, [cars, filters, available]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="flex flex-col gap-8">
      <form
        role="search"
        aria-label={t("filters")}
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-6 rounded-card border border-line bg-surface p-5 md:p-6 lg:grid-cols-[1.3fr_1.4fr_1fr_0.9fr]"
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{t("category")}</legend>
          <div className="flex flex-wrap gap-2">
            {[{ slug: "all", name: t("allCategories"), count: cars.length }, ...categories].map((c) => (
              <label
                key={c.slug}
                className={cn(
                  "cursor-pointer rounded-pill border px-3.5 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber",
                  filters.category === c.slug
                    ? "border-amber bg-amber text-on-amber"
                    : "border-line text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={c.slug}
                  checked={filters.category === c.slug}
                  onChange={() => update({ category: c.slug })}
                  className="sr-only"
                />
                {c.name} <span className="opacity-70">({c.count})</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{t("dates")}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              {t("from")}
              <input
                type="date"
                min={today}
                value={filters.from}
                onChange={(e) => {
                  const from = e.target.value;
                  update({ from, to: filters.to && filters.to < from ? from : filters.to });
                }}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              {t("to")}
              <input
                type="date"
                min={filters.from || today}
                value={filters.to}
                onChange={(e) => update({ to: e.target.value })}
                className={fieldClass}
              />
            </label>
          </div>
        </fieldset>

        {maxPrice > minPrice ? (
          <label className="flex flex-col gap-2">
            <span className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{t("price")}</span>
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              step={1}
              value={filters.maxPrice ?? maxPrice}
              onChange={(e) => {
                const value = Number(e.target.value);
                update({ maxPrice: value >= maxPrice ? null : value });
              }}
              className="h-11 accent-amber"
            />
            <span className="text-sm text-muted">{t("upTo", { price: filters.maxPrice ?? maxPrice })}</span>
          </label>
        ) : (
          <div className="hidden lg:block" />
        )}

        <label className="flex flex-col gap-2">
          <span className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{t("sort")}</span>
          <select
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as Sort })}
            className={fieldClass}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`sorts.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted" aria-live="polite">
          {availability === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("checking")}
            </span>
          ) : availability === "error" ? (
            t("availabilityError")
          ) : (
            t("found", { count: visible.length })
          )}
        </p>
        {isFiltered && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-amber"
          >
            <RotateCcw className="size-4" aria-hidden />
            {t("reset")}
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((car) => (
            <li key={car.id}>{cards[car.id]}</li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-8">
          <p className="font-display text-lg font-semibold">{t("emptyTitle")}</p>
          <p className="text-muted">{cars.length === 0 ? t("emptyFleet") : t("emptyText")}</p>
        </div>
      )}
    </div>
  );
}
