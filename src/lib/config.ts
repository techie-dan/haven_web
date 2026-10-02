/**
 * Which backend integrations are wired up.
 *
 * Deliberately in its own module so both Server and Client Components can read
 * these without importing a `"use client"` file from the server, or dragging
 * the Supabase SDK into a bundle that only needs to know a boolean.
 */

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const isAdminConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
