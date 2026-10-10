-- ============================================================================
--  Haven Studio & Living — Nigerian defaults
--  Applied automatically by `supabase db push` after 0003_carts.sql.
--
--  The studio ships from Lagos, so new profiles and orders default to a
--  Nigerian address and the Naira (NGN) currency. Amounts continue to be
--  stored as integer minor units (kobo), exactly like the previous cents.
-- ============================================================================

alter table public.profiles
  alter column country set default 'Nigeria';

alter table public.orders
  alter column shipping_country set default 'Nigeria',
  alter column currency set default 'NGN';

-- Existing rows written before the switch keep their old value; normalise the
-- ones that were never explicitly set to a different country.
update public.profiles
  set country = 'Nigeria'
  where country is null or country = 'United States';

update public.orders
  set currency = 'NGN'
  where currency = 'USD';
