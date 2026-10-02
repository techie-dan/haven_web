# Storefront setup

This project expects three external services to be configured before customer sign-in, order persistence, and email delivery work end-to-end.

## 1) Supabase: database and auth

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Apply the SQL migrations in `supabase/migrations/` using the Supabase SQL editor or the CLI:

```bash
supabase db push
```

This creates the `profiles`, `categories`, `products`, `orders`, `order_items`, and `subscribers` tables.

4. Seed the catalogue. The migrations create the `products` and `categories` tables but leave them
   empty, so without this step the storefront silently falls back to the hardcoded list in
   `src/lib/data.ts` — and every `order_items` insert fails, because the fallback products carry
   string ids where the column expects a `uuid`.

```bash
# Local, alongside `supabase db reset`:
supabase db reset

# Linked project: paste supabase/seed.sql into the Supabase SQL editor, or
psql "$DATABASE_URL" -f supabase/seed.sql
```

`supabase/seed.sql` is idempotent — it upserts on `slug` with fixed product ids, so re-running it
after editing the catalogue is safe. Keep it in step with `src/lib/data.ts`.

### Authentication settings

In Supabase:

- Go to Authentication > Providers > Google.
- Enable the Google provider.
- Add your Google OAuth **client ID and client secret**. The secret lives only in this dashboard
  field — it is deliberately not an environment variable in this project.
- Under Authentication > URL Configuration > Redirect URLs, add:
  - `http://localhost:3000/auth/callback`
  - `https://your-production-domain.com/auth/callback`

## 2) Google Cloud Console: OAuth client

1. Create an OAuth 2.0 Client ID in Google Cloud Console, or open the existing one.
2. Choose "Web application".
3. Add **Authorized JavaScript origins** — this is what the sign-in button on `/login` actually uses:
   - `http://localhost:3000`
   - `https://your-production-domain.com`
4. Add **Authorized redirect URIs**:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` — required by Supabase's own OAuth
     handshake.
   - `http://localhost:3000/auth/callback` and `https://your-production-domain.com/auth/callback` —
     only needed for the `signInWithOAuth` redirect flow in `src/components/auth/AuthProvider.tsx`.
5. Copy the client ID and secret into the Google provider in Supabase (step 1 above).

> **Two flows, one client.** The sign-in button uses Google Identity Services
> (`@react-oauth/google` → `supabase.auth.signInWithIdToken`) and needs only the *JavaScript origins*.
> The `/auth/callback` route exists for the redirect flow and is unused by the default UI. Both share
> the same client ID, and its secret must match in Supabase or `signInWithIdToken` is rejected.

## 3) Mailgun: confirmation emails

1. Create a Mailgun domain and note the sending API key.
2. Add these variables to `.env.local`:
   - `MAILGUN_API_KEY` (a *sending* key, not your private API key)
   - `MAILGUN_DOMAIN`
   - `MAILGUN_API_BASE` (optional; defaults to `https://api.mailgun.net`, EU accounts use `https://api.eu.mailgun.net`)
   - `MAILGUN_FROM` (optional; defaults to `Haven Studio & Living <studio@$MAILGUN_DOMAIN>`)
   - `MAILGUN_REPLY_TO` (optional)
   - `STUDIO_NOTIFICATION_EMAIL` (optional internal inbox for admin notices)
3. The app sends:
   - the customer order confirmation email
   - a studio notification email when the recipient is configured

> **The `MAILGUN_FROM` domain must match a verified domain.** Mailgun rejects a From address on a
> domain you have not verified, so the default that derives from `MAILGUN_DOMAIN` is the safe choice.
> On a **sandbox** domain, Mailgun also refuses to deliver to anyone other than recipients you have
> explicitly authorized in the dashboard — add your test addresses under
> Send > Domains > (your sandbox) > Authorized recipients before testing checkout.

## 4) Local run checklist

After filling in the credentials and seeding the catalogue, run:

```bash
npm install
npm run dev
```

Then verify:

- the collection at `/` lists the 8 seeded products, in the order they appear in `src/lib/data.ts`
- Google sign-in from `/login`
- account session on `/account`
- `orders` **and** `order_items` both gain rows after a checkout
- `/checkout/confirmation/<order-number>` renders the line items
- Mailgun confirmation email delivery for a test order

> The catalogue is read at build time by `generateStaticParams` in the product and collection routes,
> so restart `npm run dev` (or rebuild) after seeding to pick up the database.

## 5) Production notes

For production, add the same environment values to your deployment provider and keep the values
secret. The auth redirect route must match the production origin exactly or Google will reject the
login. Replace the Mailgun sandbox domain with a verified sending domain before going live.
