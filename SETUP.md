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

This creates the `profiles`, `categories`, `products`, `orders`, `order_items`,
`subscribers`, `cart_items`, and `email_verifications` tables. Prices are stored
as integer minor units — **kobo**, since the studio prices in Naira (₦) — and
new profiles/orders default to a Nigerian address and `NGN` currency.

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

## 3b) Email/password sign-up and verification codes

Customers can create an account with Google **or** an email and password. For the
email route the app never relies on Supabase's own confirmation email: the
sign-up route creates the user unconfirmed and Mailgun sends a 6-digit code.

| Route | Purpose |
| --- | --- |
| `POST /api/auth/signup` | Creates/refreshes an unconfirmed user, emails a code |
| `POST /api/auth/verify` | Checks the code and marks the address confirmed |
| `POST /api/auth/resend` | Re-issues a code (45-second cooldown) |

Set `AUTH_VERIFICATION_SECRET` to a long random string; codes are stored only as
an HMAC of that secret, and rows live in `email_verifications` (service-role
only, RLS on with no policies). The same routes serve the mobile app — they send
`Access-Control-Allow-Origin: *` so the native fetch can call them.

When Mailgun is **not** configured the account is confirmed automatically and the
UI signs the customer in directly, so a half-configured deployment still works.

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

## 5) Deploying to Vercel

Set the environment variables in **Project → Settings → Environment Variables**, for **Production**
(and Preview, if you deploy previews). Copy the values from `.env.local`:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public, RLS-guarded |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — server-only, bypasses RLS |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | public |
| `NEXT_PUBLIC_SITE_URL` | `https://haven-web-pghc.vercel.app` |
| `NEXT_PUBLIC_TAX_RATE` | if you set one locally |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_API_BASE`, `MAILGUN_FROM`, `MAILGUN_REPLY_TO`, `STUDIO_NOTIFICATION_EMAIL` | Mailgun |

### The step that is easy to miss

**Adding a variable does not change an existing deployment.** Next.js inlines every `NEXT_PUBLIC_*`
value into the client bundle at build time, so a deployment built before the variable existed keeps
the empty value baked in — and `/login` shows *"Google sign-in isn't configured on this deployment"*
while the dashboard looks perfectly correct. After adding or changing variables you must
**redeploy** (Deployments → ⋯ → Redeploy, with "Use existing Build Cache" *unchecked*). Variables
marked secret behave the same way for server code: they are read at runtime, but the running
deployment still needs to be restarted to see them.

Connecting the Supabase integration from the Vercel Marketplace sets several of these values for
you — but it does not rebuild your project either. Redeploy after connecting it.

### Origins that must match the deployment exactly

Google rejects a sign-in whose origin it does not recognise, so both dashboards need the production
URL — not just `localhost`:

- **Google Cloud Console** → your Web OAuth client → *Authorized JavaScript origins*: add
  `https://haven-web-pghc.vercel.app`. (No trailing slash, `https://` scheme.)
- **Supabase** → Authentication → URL Configuration → *Redirect URLs*: add
  `https://haven-web-pghc.vercel.app/auth/callback`, and set *Site URL* to
  `https://haven-web-pghc.vercel.app`.

### Before real customers

Replace the Mailgun sandbox domain with a verified sending domain. A sandbox domain delivers only to
the addresses you authorize in the Mailgun dashboard, so confirmation emails to actual customers are
silently dropped.

## 6) Shared cart & the mobile app

The companion Expo app lives in `../haven-mobile` and points at the **same
Supabase project**, so an account created on either client works on both.

### Apply the shared-cart migration

`supabase/migrations/0003_carts.sql` adds `public.cart_items`, its row-level
security policies, and the `supabase_realtime` publication entry:

```bash
supabase db push
# or paste the migration into the Supabase SQL editor
```

Behaviour after that:

- Guests keep using `localStorage` on the website and AsyncStorage in the app.
- On sign-in, the guest basket is merged into `public.cart_items`.
- Every change is written through to Postgres, and both clients subscribe to
  Realtime filtered by `user_id`, so adding a piece on one surface shows up on
  the other without a refresh.
- On sign-out the local copy is cleared; the basket remains with the account.

Without the migration the site still runs — the sync path logs an error and the
cart falls back to local storage.

### Mobile auth redirect

In **Supabase → Authentication → URL Configuration → Redirect URLs**, add the
app's deep link (`havenmobile://auth-callback`, or the `exp://…` URL for Expo
Go). Google itself stays configured exactly as in section 2.

### Orders from the app

`POST /api/orders` accepts the app's Supabase access token as
`Authorization: Bearer <token>` in place of the website's cookies, so mobile
orders are linked to the same customer. The endpoint also answers `OPTIONS` with
CORS headers so it can be called from Expo's web target. Pricing, discount, tax,
and email logic remain server-side and unchanged.
