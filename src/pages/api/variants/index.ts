import type { APIRoute } from "astro";
import { getAdminClient } from "../../../lib/supabase-admin";
import { requireAdmin } from "../../../lib/admin-auth";

export const GET: APIRoute = async ({ cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();
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

export const POST: APIRoute = async ({ request, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();
  const body = await request.json();
  const { concept } = body;
  let { tam } = body;

  let suffix = 1;
  let candidateTam = tam;
  while (true) {
    const { data: existing } = await supabase
      .from("page_variants")
      .select("id")
      .eq("concept", concept)
      .eq("tam", candidateTam)
      .maybeSingle();

    if (!existing) break;
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
