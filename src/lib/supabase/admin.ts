import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/config";

/**
 * Service-role client. **Server only.**
 *
 * This key bypasses row-level security entirely, so it must never be imported
 * from a Client Component, exposed through a route handler response, or
 * prefixed with NEXT_PUBLIC_. It is used in exactly one place: persisting an
 * order at checkout, where we deliberately want RLS out of the way and have
 * already validated the payload with zod.
 */
export function createAdminClient() {
  const url = supabaseUrl;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
