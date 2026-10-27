import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/env";

// The service role bypasses RLS. Only lib/generation.ts uses it, for the roast
// pipeline's settings and logs, which have no grants for signed-in users.
// Everything else in this app stays on the user's own token. Built with
// supabase-js on purpose: an @supabase/ssr client would send the user's
// cookie token instead of this key. The key is read per call, so builds and
// tests don't need it.
export function serviceDb(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
