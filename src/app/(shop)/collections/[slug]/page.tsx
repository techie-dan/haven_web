import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CollectionGrid } from "@/components/product/CollectionGrid";
import {
  CollectionMasthead,
  TrustStrip,
} from "@/components/layout/CollectionMasthead";
import { getProducts } from "@/lib/catalog";

const COLLECTIONS: Record<
  string,
  { title: string; blurb: string; series: string; match?: string }
> = {
  all: {
    series: "Artisanal Release",
    title: "The Complete Collection",
    blurb:
      "Every object in the studio, from kiln-tempered stoneware to hand-oiled oak. Deliberately small — we add pieces only when a workshop has something worth saying.",
  },
  furniture: {
    series: "Series 01",
    title: "Living & Furniture",
    blurb:
      "Architectural seating, blocks and plinths built from certified hardwood. Cut with hand-guided saws, finished with hardwax oil, and made to outlive us.",
    match: "living-furniture",
  },
  "ceramics-tableware": {
    series: "Series 02",
    title: "Ceramics & Tableware",
    blurb:
      "Wild stoneware clay, thrown on kick wheels and finished in natural mineral glazes. Each piece is unique, kiln-tempered in Kyoto and rural Småland.",
    match: "ceramics-tableware",
  },
  lighting: {
    series: "Series 03",
    title: "Sculptural Lighting",
    blurb:
      "Fixtures that shape light rather than emit it — fluted ceramic, patinated brass, and hand-blown glass shading a warm, downward glow.",
    match: "lighting",
  },
  textiles: {
    series: "Series 05",
    title: "Scents & Textiles",
    blurb:
      "European flax woven on shuttle looms, stone-washed for a lived-in hand, and cast bronze to anchor a room.",
    match: "scents-textiles",
  },
  "new-arrivals": {
    series: "Just Landed",
    title: "New Arrivals",
    blurb:
      "The most recent additions to the studio, shown in the order they arrived from the workshops.",
  },
};

export function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = COLLECTIONS[slug];
  if (!collection) return { title: "Collection not found" };

  return {
    title: collection.title,
    description: collection.blurb,
    openGraph: { title: collection.title, description: collection.blurb },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = COLLECTIONS[slug];
  if (!collection) notFound();

  const all = await getProducts();
  const products = collection.match
    ? all.filter((product) => product.categorySlug === collection.match)
    : all;

  return (
    <>
      <CollectionMasthead
        series={collection.series}
        title={collection.title}
        blurb={collection.blurb}
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Collections", href: "/collections/all" },
          { label: collection.title, href: `/collections/${slug}` },
        ]}
        count={products.length}
      />

      <CollectionGrid products={products} initialPageSize={9} />

      <div className="mt-20">
        <TrustStrip />
      </div>
    </>
  );
}
