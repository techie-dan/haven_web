-- ============================================================================
--  Haven Studio & Living — initial schema
--  Run via: supabase db push   (or paste into the Supabase SQL editor)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type order_status as enum (
    'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_method as enum (
    'standard_ground', 'white_glove', 'eco_courier'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles — mirrors auth.users, drives Google OAuth onboarding
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  phone         text,
  -- default shipping address, reused to pre-fill checkout
  address_line1 text,
  address_line2 text,
  city          text,
  state         text,
  postal_code   text,
  country       text default 'United States',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs in with Google for the first
-- time. Google returns full_name/avatar_url in raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  category_id    uuid references public.categories(id) on delete set null,

  -- merchandising copy
  material       text,            -- "TERRACOTTA CLAY"
  tagline        text,            -- "Duo-lip hand-thrown stoneware with raw exterior…"
  description    text,
  artisan_note   text,            -- "Made in Kyoto"
  badge          text,            -- "BEST SELLER" | "RESERVE"

  -- pricing, stored in minor units (cents) to avoid float drift
  price_cents    integer not null check (price_cents >= 0),
  compare_at_cents integer check (compare_at_cents >= 0),

  image_url      text,
  secondary_images text[] default '{}',

  rating         numeric(2,1) default 5.0 check (rating between 0 and 5),
  review_count   int not null default 0,

  in_stock       boolean not null default true,
  is_published   boolean not null default true,
  sort_order     int not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_published_idx on public.products (is_published, sort_order);

-- ---------------------------------------------------------------------------
-- orders + order_items
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,          -- HVN-2026-0001

  -- nullable: guests may check out without an account
  user_id           uuid references auth.users(id) on delete set null,
  email             text not null,

  status            order_status not null default 'pending',

  -- denormalised shipping snapshot (address can change later; the order must not)
  shipping_name     text not null,
  shipping_line1    text not null,
  shipping_line2    text,
  shipping_city     text not null,
  shipping_state    text not null,
  shipping_postal   text not null,
  shipping_country  text not null default 'United States',
  shipping_phone    text,

  delivery          delivery_method not null default 'standard_ground',
  delivery_cents    integer not null default 0,

  gift_note_requested boolean not null default false,

  subtotal_cents    integer not null check (subtotal_cents >= 0),
  shipping_cents    integer not null default 0 check (shipping_cents >= 0),
  tax_cents         integer not null default 0 check (tax_cents >= 0),
  total_cents       integer not null check (total_cents >= 0),

  currency          text not null default 'USD',

  -- payment
  payment_provider  text,                          -- 'kora' | 'stripe' | 'paypal' | 'manual'
  payment_reference text,
  paid_at           timestamptz,

  -- email delivery bookkeeping (Mailgun)
  confirmation_email_id     text,
  confirmation_email_sent_at timestamptz,

  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_user_idx    on public.orders (user_id, created_at desc);
create index if not exists orders_email_idx   on public.orders (email, created_at desc);
create index if not exists orders_number_idx  on public.orders (order_number);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,

  -- snapshot: product may be renamed, repriced, or deleted later
  product_name  text not null,
  product_slug  text,
  material      text,
  variant_note  text,
  image_url     text,

  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity         int not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),

  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Order numbers: HVN-<year>-<zero-padded sequence>
-- ---------------------------------------------------------------------------
create sequence if not exists public.order_number_seq start 1;

create or replace function public.next_order_number()
returns text language plpgsql as $$
declare
  n bigint;
begin
  n := nextval('public.order_number_seq');
  return 'HVN-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- profiles: a signed-in user sees and edits only their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- catalogue is world-readable 👀
drop policy if exists "categories_read_all" on public.categories;
create policy "categories_read_all" on public.categories
  for select using (true);

drop policy if exists "products_read_published" on public.products;
create policy "products_read_published" on public.products
  for select using (is_published = true);

-- orders: readable only by their owner. Inserts happen through the server using
-- the service-role key, which bypasses RLS, so there is deliberately NO public
-- insert policy here — a browser can never forge an order.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );
