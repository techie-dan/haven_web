import type { Category, DeliveryOption, Product } from "@/lib/types";

/**
 * The studio catalogue.
 *
 * `supabase/seed.sql` is the checked-in counterpart of this list: it inserts the
 * same categories and products into Postgres, and is what the storefront
 * actually serves once Supabase is configured. **When you change a product here,
 * change it there too** and re-apply the seed.
 *
 * This list remains the fallback so the site renders before Supabase is
 * configured — see `getProducts()` in `src/lib/catalog.ts`.
 */

export const categories: Category[] = [
  { slug: "living-furniture", name: "Living & Furniture" },
  { slug: "ceramics-tableware", name: "Ceramics & Tableware" },
  { slug: "lighting", name: "Lighting" },
  { slug: "scents-textiles", name: "Scents & Textiles" },
  { slug: "journal", name: "Journal" },
];

const IMG = "https://images.unsplash.com/photo-";

/** Build an Unsplash URL at a given width with sane cropping. */
const shot = (id: string, w = 900) =>
  `${IMG}${id}?auto=format&fit=crop&w=${w}&q=80`;

export const products: Product[] = [
  {
    id: "p_aura_terracotta_urn",
    slug: "aura-hand-thrown-terracotta-urn",
    name: "Aura Hand-Thrown Terracotta Urn",
    material: "Terracotta Clay",
    tagline: "Duo-lip hand-thrown stoneware with raw exterior and washed interior.",
    description:
      "Thrown on a kick wheel from iron-rich river clay, then left unglazed so the surface keeps the potter's fingerprint. The oxidised interior is sealed with a food-safe wash, making it as useful for branches as it is for serving.",
    artisanNote: "Made in Kyoto",
    badge: "BEST SELLER",
    priceCents: 4500000,
    imageUrl: shot("1610701596007-11502861dcfa"),
    rating: 4.6,
    reviewCount: 41,
    inStock: true,
    categorySlug: "ceramics-tableware",
  },
  {
    id: "p_komorebi_pendant",
    slug: "komorebi-fluted-ceramic-pendant",
    name: "Komorebi Fluted Ceramic Pendant",
    material: "Glazed Ceramic & Brass",
    tagline: "Concentric cast earthenware shade with solid patinated brass fittings.",
    description:
      "A trio of fluted ceramic rings diffuses the bulb into a soft, downward glow — the Japanese idea of komorebi, light filtering through leaves. Each shade is slip-cast then hand-finished, so no two flutes read alike.",
    artisanNote: "Assembled in Lisbon",
    priceCents: 7800000,
    imageUrl: shot("1513506003901-1e6a229e2d15"),
    rating: 4.4,
    reviewCount: 18,
    inStock: true,
    categorySlug: "lighting",
  },
  {
    id: "p_sora_stool",
    slug: "sora-solid-white-oak-stool",
    name: "Sora Solid White Oak Stool",
    material: "FSC White Oak",
    tagline: "Multi-purpose architectural seating block with hand-cut joinery.",
    description:
      "One solid block of European white oak, cut with a hand-guided saw and finished with hardwax oil. Sits at counter height — equally at home as a side table, a step, or a plinth for a heavy vase.",
    artisanNote: "FSC Certified · Sustainably Sourced",
    priceCents: 11000000,
    imageUrl: shot("1503602642458-232111445657"),
    rating: 4.8,
    reviewCount: 63,
    inStock: true,
    categorySlug: "living-furniture",
  },
  {
    id: "p_brutalist_platter",
    slug: "brutalist-stoneware-serving-platter",
    name: "Brutalist Stoneware Serving Platter",
    material: "Volcanic Clay",
    tagline: "Hand-pressed slab with organic deckled edges and flint speckle.",
    description:
      "Pressed by hand into a plaster mould, never trimmed square. The volcanic grog in the body shows through the matte glaze as pale flint speckle, so every platter carries a slightly different landscape.",
    artisanNote: "Food Safe · Oven Safe",
    priceCents: 3800000,
    compareAtCents: 4800000,
    imageUrl: shot("1578500494198-246f612d3b3d"),
    rating: 4.8,
    reviewCount: 27,
    inStock: true,
    categorySlug: "ceramics-tableware",
  },
  {
    id: "p_ravello_cushion",
    slug: "ravello-linen-woven-cushion-set",
    name: "Ravello Linen Woven Cushion Set",
    material: "Organic French Flax",
    tagline: "Pair of 50×50cm washed rattan covers with recycled down insert.",
    description:
      "European flax woven on shuttle looms, then stone-washed twice for a lived-in hand. The covers unzip for cleaning and soften further with every wash — the insert is recycled down, baffled so it stays plump.",
    artisanNote: "Set of Two",
    priceCents: 4200000,
    imageUrl: shot("1584100936595-c0654b55a2e2"),
    rating: 4.9,
    reviewCount: 88,
    inStock: true,
    categorySlug: "scents-textiles",
  },
  {
    id: "p_havn_candleholder",
    slug: "havn-cast-bronze-candle-holder",
    name: "Havn Cast Bronze Candle Holder",
    material: "Oxidised Bronze",
    tagline: "Heavyweight architectural vessel cast by sand-mould in small batches.",
    description:
      "Sand-cast in a foundry that has been pouring bronze since 1904, then oxidised to a deep umber. Deliberately heavy — 1.4kg — so a taper stands dead straight and the piece reads as sculpture when empty.",
    artisanNote: "1.4kg · Solid Bronze",
    priceCents: 2800000,
    imageUrl: shot("1524758631624-e2822e304c36"),
    rating: 4.5,
    reviewCount: 34,
    inStock: true,
    categorySlug: "scents-textiles",
  },
  {
    id: "p_kyoto_matcha_set",
    slug: "kyoto-matte-glaze-matcha-set",
    name: "Kyoto Matte Glaze Matcha Set",
    material: "Kyoto Stoneware",
    tagline: "Spooned preparation bowl, 100-prong bamboo chasen and scoop.",
    description:
      "A full ceremonial set: a wide-bellied matcha bowl in matte celadon, a 100-prong chasen cut from a single bamboo culm, and a hand-carved scoop. The bowl's low centre of gravity makes a proper froth easy to build.",
    artisanNote: "Uji Strain Bamboo",
    priceCents: 3200000,
    imageUrl: shot("1515823064-d6e0c04616a7"),
    rating: 4.7,
    reviewCount: 52,
    inStock: true,
    categorySlug: "ceramics-tableware",
  },
  {
    id: "p_otisford_lounge",
    slug: "otisford-wool-boucle-lounge-chair",
    name: "Otisford Wool Bouclé Lounge Chair",
    material: "Moss Bouclé & Walnut",
    tagline: "Generously proportioned cocoon seat with hand-oiled walnut legs.",
    description:
      "Wrapped in a dense New Zealand wool bouclé that hides a high-resilience foam core. The shell curves to shoulder height for a genuine reading slump; the legs are turned from solid walnut and oiled by hand.",
    artisanNote: "White Glove Available",
    badge: "RESERVE",
    priceCents: 28500000,
    imageUrl: shot("1567538096630-e0c55bd6374c"),
    rating: 4.9,
    reviewCount: 12,
    inStock: true,
    categorySlug: "living-furniture",
  },
];

export const deliveryOptions: DeliveryOption[] = [
  {
    key: "standard_ground",
    name: "Standard Insured Delivery",
    blurb: "3–5 business days · Nationwide insured courier",
    priceCents: 350000,
    freeOverCents: 15000000,
  },
  {
    key: "white_glove",
    name: "White Glove Fragile Care & Rapid Dispatch",
    blurb: "2 business days · Double-boxed ceramic casing + signature handover",
    priceCents: 750000,
    recommended: true,
  },
  {
    key: "eco_courier",
    name: "Lagos Same-Day Dispatch",
    blurb: "Lagos & Ogun only · Delivered today before 8:00 PM",
    priceCents: 500000,
  },
];

export const FREE_SHIPPING_THRESHOLD_CENTS = 15000000;
