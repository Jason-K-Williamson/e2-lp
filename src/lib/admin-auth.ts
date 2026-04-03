import type { AstroCookies } from "astro";

/**
 * Validates admin auth via httpOnly cookie. Returns a 401 Response on failure,
 * or null on success. Call at the top of every admin API route:
 *
 *   const denied = requireAdmin(cookies);
 *   if (denied) return denied;
 */
export function requireAdmin(cookies: AstroCookies): Response | null {
  const adminPass = import.meta.env.ADMIN_PASS;
  if (!adminPass) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: ADMIN_PASS not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const cookie = cookies.get("admin_auth");
  if (cookie?.value === adminPass) return null;

  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}
