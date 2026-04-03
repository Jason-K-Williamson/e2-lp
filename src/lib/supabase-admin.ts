import { createClient } from "@supabase/supabase-js";

/**
 * Server-side only — bypasses RLS for admin API routes.
 * Throws at call-time if required env vars are missing so the
 * error is clear and debuggable rather than a cryptic Supabase failure.
 */
export function getAdminClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin env vars: PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  return createClient(url, key);
}
