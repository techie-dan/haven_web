-- ============================================================================
--  Haven Studio & Living — Gazette subscribers
--  Applied automatically by `supabase db push` after 0001_init.sql.
-- ============================================================================

create table if not exists public.subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  source          text not null default 'footer',
  -- Double opt-in is not implemented; this column is where you would record it.
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists subscribers_email_idx on public.subscribers (email);

alter table public.subscribers enable row level security;

-- No public policies: rows are written by the service role in
-- `POST /api/newsletter` only. Without a policy, RLS denies everything else —
-- which is what we want, since an open insert policy would let anyone enumerate
-- or spam the list.
