import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";
import { requireAdmin } from "../../lib/admin-auth";

/** GET /api/drafts?key=xxx — load a draft */
export const GET: APIRoute = async ({ url, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;

    const key = url.searchParams.get("key") ?? "new";
    const { data } = await supabase
        .from("variant_drafts")
        .select("*")
        .eq("draft_key", key)
        .single();

    return new Response(JSON.stringify(data ?? null), {
        headers: { "Content-Type": "application/json" },
    });
};

/** POST /api/drafts — upsert a draft */
export const POST: APIRoute = async ({ request, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;

    const body = await request.json();
    const { draft_key = "new", brief, concept, tam, fields } = body;

    const { data, error } = await supabase
        .from("variant_drafts")
        .upsert({ draft_key, brief, concept, tam, fields, updated_at: new Date().toISOString() }, { onConflict: "draft_key" })
        .select()
        .single();

    if (error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
    });
};

/** DELETE /api/drafts?key=xxx — clear a draft after publishing */
export const DELETE: APIRoute = async ({ url, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;

    const key = url.searchParams.get("key") ?? "new";
    await supabase.from("variant_drafts").delete().eq("draft_key", key);
    return new Response(null, { status: 204 });
};
