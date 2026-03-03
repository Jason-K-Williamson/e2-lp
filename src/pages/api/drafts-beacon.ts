import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

/**
 * POST /api/drafts-beacon?pass=xxx
 *
 * Receives navigator.sendBeacon() payloads from the editor's beforeunload handler.
 * sendBeacon can't set custom headers, so auth is passed via the ?pass= query param.
 */
export const POST: APIRoute = async ({ request, url }) => {
    const adminPass = import.meta.env.ADMIN_PASS;
    const passParam = url.searchParams.get("pass") ?? "";

    if (passParam !== adminPass) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { draft_key = "new", brief = "", concept = "", tam = "", fields = null } = body;

    const { error } = await supabase
        .from("variant_drafts")
        .upsert(
            { draft_key, brief, concept, tam, fields, updated_at: new Date().toISOString() },
            { onConflict: "draft_key" }
        );

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(null, { status: 204 });
};
