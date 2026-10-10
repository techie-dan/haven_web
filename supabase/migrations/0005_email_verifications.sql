-- ============================================================================
--  Haven Studio & Living — email verification codes
--  Applied automatically by `supabase db push` after 0004_nigeria_defaults.sql.
--
--  Sign-up with an email address creates the auth user unconfirmed, then Mailgun
--  delivers a short numeric code. Entering that code flips `email_confirmed_at`
--  through the service role. No row here is ever readable by a customer, and
--  only hashes are stored — a leaked table cannot be used to confirm an account.
-- ============================================================================

create table if not exists public.email_verifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  code_hash   text not null,
  purpose     text not null default 'signup',
  attempts    int  not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists email_verifications_email_idx
  on public.email_verifications (lower(email), created_at desc);

-- Service-role only: RLS is on with no policies, so anon/authenticated get
-- nothing. The API routes use the service-role key and bypass RLS.
alter table public.email_verifications enable row level security;

-- ---------------------------------------------------------------------------
-- Look up an existing auth user by email. `auth.users` is not exposed through
-- PostgREST, so the sign-up route calls this security-definer function to tell
-- "new email" from "already registered, still unconfirmed".
-- ---------------------------------------------------------------------------
create or replace function public.find_auth_user(p_email text)
returns table (id uuid, email text, email_confirmed boolean)
language sql
security definer
set search_path = auth, public
as $$
  select u.id, u.email, (u.email_confirmed_at is not null)
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.find_auth_user(text) from public, anon, authenticated;
grant execute on function public.find_auth_user(text) to service_role;
