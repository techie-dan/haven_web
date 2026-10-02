"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, LayoutGrid, Rows3, SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ProductCard } from "@/components/product/ProductCard";

type SortKey = "curated" | "newest" | "price-asc" | "price-desc" | "rating";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "curated", label: "Curated & Featured" },
  { key: "newest", label: "Newest Arrivals" },
  { key: "price-asc", label: "Price · Low to High" },
  { key: "price-desc", label: "Price · High to Low" },
  { key: "rating", label: "Highest Rated" },
];

const PRICE_BANDS = [
  { key: "under-100", label: "Under $100", test: (c: number) => c < 10000 },
  { key: "100-250", label: "$100 – $250", test: (c: number) => c >= 10000 && c < 25000 },
  { key: "250-500", label: "$250 – $500", test: (c: number) => c >= 25000 && c < 50000 },
  { key: "500-plus", label: "$500+", test: (c: number) => c >= 50000 },
];

const SWATCHES = [
  { key: "terracotta", label: "Terracotta", hex: "#c1613c" },
  { key: "clay", label: "Clay", hex: "#a8846a" },
  { key: "stone", label: "Stone", hex: "#b8b2a7" },
  { key: "sage", label: "Sage", hex: "#6b7a5e" },
  { key: "oak", label: "Oak", hex: "#d9c3a5" },
  { key: "bronze", label: "Bronze", hex: "#7a5c3e" },
];

interface FilterState {
  materials: string[];
  bands: string[];
  swatches: string[];
  inStockOnly: boolean;
}

const EMPTY_FILTERS: FilterState = {
  materials: [],
  bands: [],
  swatches: [],
  inStockOnly: false,
};

export function CollectionGrid({
  products,
  initialPageSize = 9,
}: {
  products: Product[];
  initialPageSize?: number;
}) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("curated");
  const [density, setDensity] = useState<"grid" | "list">("grid");
  const [visible, setVisible] = useState(initialPageSize);
  const [sortOpen, setSortOpen] = useState(false);

  // Distinct materials, in catalogue order — no need for a Set since there are
  // only a handful and order matters for the rail.
  const materials = useMemo(
    () => Array.from(new Set(products.map((p) => p.material).filter(Boolean))),
    [products],
  );

  const activeCount =
    filters.materials.length +
    filters.bands.length +
    filters.swatches.length +
    (filters.inStockOnly ? 1 : 0);

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      if (filters.materials.length && !filters.materials.includes(product.material)) {
        return false;
      }
      if (filters.inStockOnly && !product.inStock) return false;

      if (filters.bands.length) {
        const matchesBand = filters.bands.some((key) => {
          const band = PRICE_BANDS.find((b) => b.key === key);
          return band?.test(product.priceCents) ?? false;
        });
        if (!matchesBand) return false;
      }

      // Swatches are a merchandising lens, matched against the material copy —
      // there is no colour column in the schema.
      if (filters.swatches.length) {
        const haystack = `${product.material} ${product.tagline}`.toLowerCase();
        const matchesSwatch = filters.swatches.some((key) => {
          const swatch = SWATCHES.find((s) => s.key === key);
          const label = swatch?.label.toLowerCase() ?? key;
          return haystack.includes(label);
        });
        if (!matchesSwatch) return false;
      }

      return true;
    });

    switch (sort) {
      case "price-asc":
        return [...result].sort((a, b) => a.priceCents - b.priceCents);
      case "price-desc":
        return [...result].sort((a, b) => b.priceCents - a.priceCents);
      case "rating":
        return [...result].sort((a, b) => b.rating - a.rating);
      case "newest":
        // Seed data carries no created_at; badges are our recency signal.
        return [...result].sort(
          (a, b) => Number(Boolean(b.badge)) - Number(Boolean(a.badge)),
        );
      case "curated":
      default:
        return result;
    }
  }, [products, filters, sort]);

  const shown = filtered.slice(0, visible);

  function toggle<K extends keyof FilterState>(key: K, value: string) {
    setFilters((prev) => {
      const list = prev[key] as string[];
      const next = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
      return { ...prev, [key]: next };
    });
    setVisible(initialPageSize);
  }

  return (
    <>
      {/* -------- Filter rail -------- */}
      <div className="sticky top-[68px] z-30 border-y border-line bg-canvas/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-5 py-3 sm:px-8">
          <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto">
            <span className="eyebrow flex shrink-0 items-center gap-1.5 pr-1 text-ink">
              <SlidersHorizontal size={12} />
              Filter
            </span>

            <FilterMenu
              label="Material"
              options={materials.map((m) => ({ key: m, label: m }))}
              selected={filters.materials}
              onToggle={(value) => toggle("materials", value)}
            />
            <FilterMenu
              label="Price Range"
              options={PRICE_BANDS.map((b) => ({ key: b.key, label: b.label }))}
              selected={filters.bands}
              onToggle={(value) => toggle("bands", value)}
            />
            <FilterMenu
              label="Palette"
              options={SWATCHES.map((s) => ({ key: s.key, label: s.label }))}
              selected={filters.swatches}
              onToggle={(value) => toggle("swatches", value)}
              swatches
            />

            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({ ...prev, inStockOnly: !prev.inStockOnly }));
                setVisible(initialPageSize);
              }}
              aria-pressed={filters.inStockOnly}
              className={cn(
                "eyebrow flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 transition-colors",
                filters.inStockOnly
                  ? "border-terracotta bg-terracotta text-white"
                  : "border-line text-ink-soft hover:border-ink",
              )}
            >
              {filters.inStockOnly && <Check size={11} />}
              In Stock
            </button>
          </div>

          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="eyebrow flex items-center gap-1 text-terracotta"
              >
                Clear all <X size={11} />
              </button>
            )}
            <span className="h-5 w-px bg-line" />
            <span className="eyebrow text-muted">
              Showing {shown.length} of {filtered.length}
            </span>
          </div>
        </div>
      </div>

      {/* -------- Sort / layout bar -------- */}
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 sm:px-8">
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((open) => !open)}
            className="eyebrow flex items-center gap-2 text-ink-soft transition-colors hover:text-ink"
            aria-expanded={sortOpen}
          >
            Sort by
            <span className="text-ink">{SORTS.find((s) => s.key === sort)?.label}</span>
            <ChevronDown
              size={13}
              className={cn("transition-transform", sortOpen && "rotate-180")}
            />
          </button>

          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSortOpen(false)}
                aria-hidden="true"
              />
              <ul className="animate-rise absolute left-0 top-full z-20 mt-2 w-56 border border-line bg-surface py-1 shadow-[0_12px_40px_-12px_rgba(28,26,23,0.18)]">
                {SORTS.map((option) => (
                  <li key={option.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setSort(option.key);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-2.5 text-left text-[12.5px] transition-colors hover:bg-canvas",
                        sort === option.key ? "text-terracotta" : "text-ink-soft",
                      )}
                    >
                      {option.label}
                      {sort === option.key && <Check size={13} />}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDensity("grid")}
            aria-label="Grid view"
            aria-pressed={density === "grid"}
            className={cn(
              "p-1.5 transition-colors",
              density === "grid" ? "text-ink" : "text-muted hover:text-ink-soft",
            )}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDensity("list")}
            aria-label="List view"
            aria-pressed={density === "list"}
            className={cn(
              "p-1.5 transition-colors",
              density === "list" ? "text-ink" : "text-muted hover:text-ink-soft",
            )}
          >
            <Rows3 size={16} />
          </button>
        </div>
      </div>

      {/* -------- Grid -------- */}
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-4 border border-line py-24 text-center">
            <p className="font-display text-[22px] text-ink">
              Nothing matches those filters
            </p>
            <p className="max-w-sm text-[13px] leading-relaxed text-muted">
              Our catalogue is deliberately small. Try widening the price range
              or clearing the palette.
            </p>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="eyebrow mt-1 border border-ink px-6 py-3 transition-colors hover:bg-ink hover:text-white"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div
            className={cn(
              density === "grid"
                ? "grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-8",
            )}
          >
            {shown.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index === 0} />
            ))}
          </div>
        )}
      </div>

      {/* -------- Load more -------- */}
      {visible < filtered.length && (
        <div className="mx-auto mt-16 flex max-w-[1400px] flex-col items-center gap-5 px-5 sm:px-8">
          <p className="eyebrow text-muted">
            Showing {shown.length} of {filtered.length} artisan pieces
          </p>
          <button
            type="button"
            onClick={() => setVisible((n) => n + initialPageSize)}
            className="eyebrow border border-ink px-10 py-4 text-ink transition-colors hover:bg-ink hover:text-white"
          >
            Load more pieces
          </button>
        </div>
      )}
    </>
  );
}

/** A dropdown filter with multi-select checkboxes. */
function FilterMenu({
  label,
  options,
  selected,
  onToggle,
  swatches = false,
}: {
  label: string;
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  swatches?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "eyebrow flex items-center gap-1.5 rounded-full border px-3.5 py-2 transition-colors",
          selected.length
            ? "border-ink text-ink"
            : "border-line text-ink-soft hover:border-ink",
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="tabular flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[9px] text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul className="animate-rise absolute left-0 top-full z-20 mt-2 max-h-72 w-60 overflow-y-auto border border-line bg-surface py-1.5 shadow-[0_12px_40px_-12px_rgba(28,26,23,0.18)]">
            {options.map((option) => {
              const isOn = selected.includes(option.key);
              const swatch = swatches
                ? SWATCHES.find((s) => s.key === option.key)
                : undefined;

              return (
                <li key={option.key}>
                  <button
                    type="button"
                    onClick={() => onToggle(option.key)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[12.5px] text-ink-soft transition-colors hover:bg-canvas"
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center border transition-colors",
                        isOn
                          ? "border-terracotta bg-terracotta text-white"
                          : "border-line-strong",
                      )}
                    >
                      {isOn && <Check size={10} strokeWidth={3} />}
                    </span>
                    {swatch && (
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-line"
                        style={{ background: swatch.hex }}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
