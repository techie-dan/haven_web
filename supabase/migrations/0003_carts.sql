-- ============================================================================
--  Haven Studio & Living — shared account cart
--  Applied automatically by `supabase db push` after 0002_subscribers.sql.
--
--  The basket lives in Postgres rather than localStorage so that a signed-in
--  customer's cart is identical on the website and the mobile app. Realtime
--  broadcasts every change to the owner's other open sessions, so adding a
--  piece on the website makes it appear in the app immediately.
--
--  Guests keep using localStorage in whichever client they are browsing; the
--  first sign-in merges those lines into the account cart.
-- ============================================================================

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  -- Made-to-order objects: 10 of one line is already an outlier.
  quantity    int  not null default 1 check (quantity > 0 and quantity <= 10),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists cart_items_user_idx on public.cart_items (user_id);

-- Deletes must carry user_id so Realtime subscribers can see them under RLS
-- (the default replica identity only logs the primary key).
alter table public.cart_items replica identity full;

-- ---------------------------------------------------------------------------
-- RLS: a customer can only see and mutate their own basket.
-- ---------------------------------------------------------------------------
alter table public.cart_items enable row level security;

drop policy if exists "cart_items_select_own" on public.cart_items;
create policy "cart_items_select_own" on public.cart_items
  for select using (auth.uid() = user_id);

drop policy if exists "cart_items_insert_own" on public.cart_items;
create policy "cart_items_insert_own" on public.cart_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "cart_items_update_own" on public.cart_items;
create policy "cart_items_update_own" on public.cart_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cart_items_delete_own" on public.cart_items;
create policy "cart_items_delete_own" on public.cart_items
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance (reuses touch_updated_at() from 0001_init.sql)
-- ---------------------------------------------------------------------------
drop trigger if exists cart_items_touch on public.cart_items;
create trigger cart_items_touch before update on public.cart_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Realtime: stream basket changes to the owner's open sessions.
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.cart_items;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
