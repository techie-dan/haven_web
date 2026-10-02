import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { CollectionGrid } from "@/components/product/CollectionGrid";
import { CollectionMasthead } from "@/components/layout/CollectionMasthead";
import { getProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const all = await getProducts();

  const needle = query.toLowerCase();
  const results = needle
    ? all.filter((product) =>
        [
          product.name,
          product.material,
          product.tagline,
          product.description,
          product.artisanNote,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : [];

  return (
    <>
      <CollectionMasthead
        series="Search"
        title={query ? `Results for “${query}”` : "Search the Studio"}
        blurb={
          query
            ? `${results.length} ${results.length === 1 ? "piece matches" : "pieces match"} your search across names, materials, and provenance.`
            : "Search by object, material, or workshop — try “stoneware”, “linen”, or “Kyoto”."
        }
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Search", href: "/search" },
        ]}
        count={results.length}
      />

      {results.length === 0 ? (
        <div className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8">
          <div className="flex flex-col items-center gap-4 border border-line bg-surface py-24 text-center">
            <SearchX size={26} strokeWidth={1.2} className="text-line-strong" />
            <p className="font-display text-[22px] text-ink">
              {query ? "No pieces found" : "Begin your search"}
            </p>
            <p className="max-w-sm text-[12.5px] leading-relaxed text-muted">
              {query
                ? "Our catalogue is deliberately small. Try a broader term, or browse the full collection."
                : "Use the search field in the header to look across the studio."}
            </p>
          </div>
        </div>
      ) : (
        <CollectionGrid products={results} initialPageSize={9} />
      )}
    </>
  );
}
