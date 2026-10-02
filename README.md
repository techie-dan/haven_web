# Haven Studio & Living

A storefront for a boutique furniture and tableware brand, with Supabase-backed persistence, Google sign-in, and Mailgun order confirmations.

## Getting started

1. Copy `.env.example` to `.env.local` and fill in your credentials.
2. Apply the Supabase migrations in `supabase/migrations`.
3. Apply `supabase/seed.sql` to load the catalogue — without it the storefront falls back to the
   hardcoded list in `src/lib/data.ts` and order line items cannot be written.
4. Run the app locally:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Setup guide

See [SETUP.md](SETUP.md) for the full instructions for:

- Supabase database setup and auth configuration
- Google OAuth via Google Cloud Console
- Mailgun transactional messages
- Local and production redirect URLs

## Project notes

- The storefront falls back to guest checkout when credentials are not present.
- Orders are written to Supabase only when the service-role secret is configured.
- Email delivery is attempted only when Mailgun has all required environment variables.
