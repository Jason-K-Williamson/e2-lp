import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const GET: APIRoute = async () => {
    const { data, error } = await supabase
        .from("page_variants")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
    });
};

export const POST: APIRoute = async ({ request }) => {
    const adminPass = import.meta.env.ADMIN_PASS;
    const auth = request.headers.get("x-admin-pass");
    if (auth !== adminPass) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await request.json();
    const { concept } = body;
    let { tam } = body;

    // Auto-increment TAM slug if concept/tam already exists
    // e.g. supplements → supplements-2 → supplements-3
    let suffix = 1;
    let candidateTam = tam;
    while (true) {
        const { data: existing } = await supabase
            .from("page_variants")
            .select("id")
            .eq("concept", concept)
            .eq("tam", candidateTam)
            .maybeSingle();

        if (!existing) break; // slot is free
        suffix++;
        candidateTam = `${tam}-${suffix}`;
    }

    const { data, error } = await supabase
        .from("page_variants")
        .insert({ ...body, tam: candidateTam })
        .select()
        .single();

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify(data), {
        status: 201,
        headers: { "Content-Type": "application/json" },
    });
};
