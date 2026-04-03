import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";
import { requireAdmin } from "../../lib/admin-auth";

/**
 * POST /api/drafts-beacon
 *
 * Receives navigator.sendBeacon() payloads from the editor's beforeunload handler.
 * Auth via httpOnly cookie (sent automatically with same-origin beacon requests).
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;

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
