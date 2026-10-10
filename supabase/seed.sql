-- ============================================================================
--  Haven Studio & Living — catalogue seed
--
--  The checked-in counterpart to the product list in `src/lib/data.ts`.
--  Re-apply this whenever the catalogue changes there.
--
--  Idempotent: every statement upserts on `slug`, and product ids are fixed
--  literals rather than `gen_random_uuid()`, so running it twice is a no-op.
--
--  Apply with:  supabase db reset                    (local)
--               psql "$DATABASE_URL" -f supabase/seed.sql
--               paste into the Supabase SQL editor   (no password needed)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, sort_order) values
  ('living-furniture',    'Living & Furniture',   0),
  ('ceramics-tableware',  'Ceramics & Tableware', 1),
  ('lighting',            'Lighting',             2),
  ('scents-textiles',     'Scents & Textiles',    3),
  ('journal',             'Journal',              4)
on conflict (slug) do update set
  name       = excluded.name,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- products
--
-- `sort_order` mirrors the array order in src/lib/data.ts. It is what
-- `getProducts()` orders by, and the column defaults to 0 — leaving it unset
-- would make the storefront grid order nondeterministic.
-- ---------------------------------------------------------------------------
insert into public.products (
  id, slug, name, category_id, material, tagline, description, artisan_note,
  badge, price_cents, compare_at_cents, image_url, rating, review_count,
  in_stock, is_published, sort_order
) values
  (
    'a0000000-0000-4000-8000-000000000001',
    'aura-hand-thrown-terracotta-urn',
    'Aura Hand-Thrown Terracotta Urn',
    (select id from public.categories where slug = 'ceramics-tableware'),
    'Terracotta Clay',
    'Duo-lip hand-thrown stoneware with raw exterior and washed interior.',
    'Thrown on a kick wheel from iron-rich river clay, then left unglazed so the surface keeps the potter''s fingerprint. The oxidised interior is sealed with a food-safe wash, making it as useful for branches as it is for serving.',
    'Made in Kyoto',
    'BEST SELLER',
    4500000, null,
    'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=80',
    4.6, 41, true, true, 0
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'komorebi-fluted-ceramic-pendant',
    'Komorebi Fluted Ceramic Pendant',
    (select id from public.categories where slug = 'lighting'),
    'Glazed Ceramic & Brass',
    'Concentric cast earthenware shade with solid patinated brass fittings.',
    'A trio of fluted ceramic rings diffuses the bulb into a soft, downward glow — the Japanese idea of komorebi, light filtering through leaves. Each shade is slip-cast then hand-finished, so no two flutes read alike.',
    'Assembled in Lisbon',
    null,
    7800000, null,
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=900&q=80',
    4.4, 18, true, true, 1
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'sora-solid-white-oak-stool',
    'Sora Solid White Oak Stool',
    (select id from public.categories where slug = 'living-furniture'),
    'FSC White Oak',
    'Multi-purpose architectural seating block with hand-cut joinery.',
    'One solid block of European white oak, cut with a hand-guided saw and finished with hardwax oil. Sits at counter height — equally at home as a side table, a step, or a plinth for a heavy vase.',
    'FSC Certified · Sustainably Sourced',
    null,
    11000000, null,
    'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80',
    4.8, 63, true, true, 2
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    'brutalist-stoneware-serving-platter',
    'Brutalist Stoneware Serving Platter',
    (select id from public.categories where slug = 'ceramics-tableware'),
    'Volcanic Clay',
    'Hand-pressed slab with organic deckled edges and flint speckle.',
    'Pressed by hand into a plaster mould, never trimmed square. The volcanic grog in the body shows through the matte glaze as pale flint speckle, so every platter carries a slightly different landscape.',
    'Food Safe · Oven Safe',
    null,
    3800000, 4800000,
    'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=80',
    4.8, 27, true, true, 3
  ),
  (
    'a0000000-0000-4000-8000-000000000005',
    'ravello-linen-woven-cushion-set',
    'Ravello Linen Woven Cushion Set',
    (select id from public.categories where slug = 'scents-textiles'),
    'Organic French Flax',
    'Pair of 50×50cm washed rattan covers with recycled down insert.',
    'European flax woven on shuttle looms, then stone-washed twice for a lived-in hand. The covers unzip for cleaning and soften further with every wash — the insert is recycled down, baffled so it stays plump.',
    'Set of Two',
    null,
    4200000, null,
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=80',
    4.9, 88, true, true, 4
  ),
  (
    'a0000000-0000-4000-8000-000000000006',
    'havn-cast-bronze-candle-holder',
    'Havn Cast Bronze Candle Holder',
    (select id from public.categories where slug = 'scents-textiles'),
    'Oxidised Bronze',
    'Heavyweight architectural vessel cast by sand-mould in small batches.',
    'Sand-cast in a foundry that has been pouring bronze since 1904, then oxidised to a deep umber. Deliberately heavy — 1.4kg — so a taper stands dead straight and the piece reads as sculpture when empty.',
    '1.4kg · Solid Bronze',
    null,
    2800000, null,
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
    4.5, 34, true, true, 5
  ),
  (
    'a0000000-0000-4000-8000-000000000007',
    'kyoto-matte-glaze-matcha-set',
    'Kyoto Matte Glaze Matcha Set',
    (select id from public.categories where slug = 'ceramics-tableware'),
    'Kyoto Stoneware',
    'Spooned preparation bowl, 100-prong bamboo chasen and scoop.',
    'A full ceremonial set: a wide-bellied matcha bowl in matte celadon, a 100-prong chasen cut from a single bamboo culm, and a hand-carved scoop. The bowl''s low centre of gravity makes a proper froth easy to build.',
    'Uji Strain Bamboo',
    null,
    3200000, null,
    'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=900&q=80',
    4.7, 52, true, true, 6
  ),
  (
    'a0000000-0000-4000-8000-000000000008',
    'otisford-wool-boucle-lounge-chair',
    'Otisford Wool Bouclé Lounge Chair',
    (select id from public.categories where slug = 'living-furniture'),
    'Moss Bouclé & Walnut',
    'Generously proportioned cocoon seat with hand-oiled walnut legs.',
    'Wrapped in a dense New Zealand wool bouclé that hides a high-resilience foam core. The shell curves to shoulder height for a genuine reading slump; the legs are turned from solid walnut and oiled by hand.',
    'White Glove Available',
    'RESERVE',
    28500000, null,
    'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=80',
    4.9, 12, true, true, 7
  )
on conflict (slug) do update set
  name             = excluded.name,
  category_id      = excluded.category_id,
  material         = excluded.material,
  tagline          = excluded.tagline,
  description      = excluded.description,
  artisan_note     = excluded.artisan_note,
  badge            = excluded.badge,
  price_cents      = excluded.price_cents,
  compare_at_cents = excluded.compare_at_cents,
  image_url        = excluded.image_url,
  rating           = excluded.rating,
  review_count     = excluded.review_count,
  in_stock         = excluded.in_stock,
  is_published     = excluded.is_published,
  sort_order       = excluded.sort_order;
