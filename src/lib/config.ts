/**
 * Which backend integrations are wired up.
 *
 * Deliberately in its own module so both Server and Client Components can read
 * these without importing a `"use client"` file from the server, or dragging
 * the Supabase SDK into a bundle that only needs to know a boolean.
 */

/**
 * The Supabase project URL, normalised for the SDKs.
 *
 * `supabase-js` appends `/rest/v1`, `/auth/v1` and `/realtime/v1` to whatever
 * base it is handed, so a dashboard URL pasted with its own `/rest/v1` suffix
 * still attached builds requests like `/rest/v1/rest/v1/cart_items`. PostgREST
 * answers those with an opaque `PGRST125: Invalid path specified in request
 * URL`, which reads as a database fault rather than the typo it is. Trimming
 * the suffix here keeps every client honest.
 */
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/, "");

export const isSupabaseConfigured = Boolean(
  supabaseUrl && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const isAdminConfigured = Boolean(
  supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Names — never values — of the public variables this build is missing.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, so a variable added to a hosting
 * dashboard *after* the last build stays invisible until the next deploy. When
 * that happens the only symptom is a disabled sign-in button, which reads as a
 * code problem rather than a configuration one. Naming the variables on the page
 * points at the actual cause. The names are public by definition; no value from
 * any of these is ever included.
 */
export const missingPublicEnv = (
  [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    ["NEXT_PUBLIC_GOOGLE_CLIENT_ID", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID],
  ] as const
)
  .filter(([, value]) => !value)
  .map(([name]) => name);
