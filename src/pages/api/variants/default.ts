import type { APIRoute } from "astro";
import { supabase, DEFAULT_VARIANT } from "../../../lib/supabase";

/**
 * GET /api/variants/default
 * Legacy endpoint for the old homepage visual editor.
 * The live homepage (/) now reads copy from src/lib/home-copy.ts — not Supabase.
 * This row may still exist for admin history; new homepage edits belong in git.
 */
export const GET: APIRoute = async ({ cookies }) => {
  const adminPass = import.meta.env.ADMIN_PASS;
  const cookie = cookies.get("admin_auth");
  if (!adminPass || cookie?.value !== adminPass) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { data: existing } = await supabase
    .from("page_variants")
    .select("*")
    .eq("concept", "default")
    .eq("tam", "homepage")
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify(existing), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const seed = {
    concept: "default",
    tam: "homepage",
    active: true,
    ...DEFAULT_VARIANT,
  };

  const { data, error } = await supabase
    .from("page_variants")
    .insert(seed)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
