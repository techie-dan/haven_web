<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project structure

This repository is a Next.js storefront for a boutique homeware brand. The app is split into app routes, shared UI/layout components, integration helpers, and Supabase-backed auth/data logic.

## Top-level layout

- `src/app/` — route-based app files and server handlers.
  - `src/app/(auth)/login/page.tsx` — Google sign-in page.
  - `src/app/(shop)/` — storefront pages for home, account, checkout, collections, products, and search.
  - `src/app/api/` — API routes for discounts, newsletter signup, and order handling.
  - `src/app/auth/` — auth callback and signout handlers.
  - `src/app/layout.tsx` — root layout and global app shell.
  - `src/app/globals.css` — global styling and design tokens.

- `src/components/` — reusable UI and client-side state components.
  - `auth/` — auth provider and Google auth wiring.
  - `cart/` — basket and cart drawer logic.
  - `checkout/` — checkout form and order confirmation UI.
  - `layout/` — site header, footer, masthead, newsletter, and shell layout.
  - `product/` — product cards, gallery, and collection grid.
  - `ui/` — shared presentation primitives such as image wrappers.
  - `brand/` — logo branding.

- `src/lib/` — app logic and service integrations.
  - `catalog.ts` — storefront product catalogue access.
  - `config.ts` — environment capability checks.
  - `data.ts` — seed catalogue data.
  - `discounts.ts` — discount validation and calculations.
  - `emails.ts` — email content templates.
  - `mailgun.ts` — transactional email provider client.
  - `pricing.ts` — line totals, shipping, and tax logic.
  - `supabase/` — browser and server Supabase clients.
  - `validation.ts` — request validation schemas.

- `supabase/` — database schema and seed migrations.
  - `migrations/` — SQL migration files.
  - `seed.sql` — seeded store catalog and baseline data.

- `public/` — static public assets.
- `.env.local` — local environment variables; never commit.
- `next.config.ts` — Next.js config and image headers.
- `package.json` — project scripts and dependencies.
- `SETUP.md` — full service setup instructions for Supabase, Google, and Mailgun.
- `README.md` — project overview and quick-start notes.

## Service boundaries

- Supabase handles authentication, user session state, and order persistence.
- Google OAuth is used for login via Google Identity Services.
- Mailgun is used for order-confirmation and admin notification emails.
- Commerce logic is validated on the server before any order is stored or emailed.

## Deployment rules

- Keep all secrets in environment variables only.
- Never commit `.env.local`, generated keys, or certificates.
- Use GitHub repository secrets or deployment platform environment variables for production.
