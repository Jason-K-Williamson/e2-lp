import type { APIRoute } from "astro";
import { supabase, DEFAULT_VARIANT } from "../../../lib/supabase";

/**
 * GET /api/variants/default
 * Returns (and lazily creates if missing) the canonical "default" variant row
 * that backs the homepage. This gives the Visual Editor a real variantId to
 * write to, while the homepage still falls back to DEFAULT_VARIANT for all
 * fields the DB row doesn't explicitly override.
 */
export const GET: APIRoute = async ({ request }) => {
    const adminPass = import.meta.env.ADMIN_PASS;
    const auth = request.headers.get("x-admin-pass");
    if (auth !== adminPass) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
        });
    }

    // Try to find the existing default row
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

    // First visit as admin — seed the default row from DEFAULT_VARIANT
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
