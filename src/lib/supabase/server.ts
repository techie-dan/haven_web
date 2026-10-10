import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUrl } from "@/lib/config";

/**
 * Server-side Supabase client for Server Components, Server Actions and Route
 * Handlers. Still bound by RLS — use `createAdminClient()` when you need to
 * bypass it (e.g. writing an order).
 *
 * Cookie writes throw inside Server Components, which Next.js surfaces as an
 * error. That is expected: middleware refreshes the session, so the catch block
 * is a no-op rather than a silent failure.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const url = supabaseUrl;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware handles the refresh.
        }
      },
    },
  });
}

/** The signed-in user, or null. Never throws when Supabase is unconfigured. */
export async function getUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
