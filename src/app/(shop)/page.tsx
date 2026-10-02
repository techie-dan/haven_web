import { CollectionGrid } from "@/components/product/CollectionGrid";
import {
  CollectionMasthead,
  TrustStrip,
} from "@/components/layout/CollectionMasthead";
import { getProducts } from "@/lib/catalog";

/**
 * The default landing experience: the full curated catalogue.
 *
 * Server-rendered so the grid is in the HTML for crawlers; filtering, sorting
 * and pagination are handed to the client grid.
 */
export default async function HomePage() {
  const products = await getProducts();

  return (
    <>
      <CollectionMasthead
        series="Artisanal Release"
        title="Ceramics & Living Essentials"
        blurb="Sculptural forms crafted by master potters using wild stoneware clay, finished with natural mineral glazes. Each piece is unique, kiln-tempered in Kyoto and rural Småland."
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Living", href: "/collections/all" },
          { label: "Ceramics & Living Essentials", href: "/" },
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
