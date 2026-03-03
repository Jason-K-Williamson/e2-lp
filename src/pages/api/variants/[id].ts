import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

function authCheck(request: Request, adminPass: string) {
    return request.headers.get("x-admin-pass") === adminPass;
}

export const GET: APIRoute = async ({ params }) => {
    const { data, error } = await supabase
        .from("page_variants")
        .select("*")
        .eq("id", params.id)
        .single();

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 404 });
    }
    return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
    });
};

export const PUT: APIRoute = async ({ params, request }) => {
    const adminPass = import.meta.env.ADMIN_PASS;
    if (!authCheck(request, adminPass)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await request.json();

    const { data, error } = await supabase
        .from("page_variants")
        .update(body)
        .eq("id", params.id)
        .select()
        .single();

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
    });
};

export const DELETE: APIRoute = async ({ params, request }) => {
    const adminPass = import.meta.env.ADMIN_PASS;
    if (!authCheck(request, adminPass)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { error } = await supabase
        .from("page_variants")
        .delete()
        .eq("id", params.id);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(null, { status: 204 });
};
