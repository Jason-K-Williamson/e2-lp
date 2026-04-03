import type { APIRoute } from "astro";
import { getAdminClient } from "../../../lib/supabase-admin";
import { requireAdmin } from "../../../lib/admin-auth";

export const GET: APIRoute = async ({ params, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();
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

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();
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

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("page_variants")
    .delete()
    .eq("id", params.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(null, { status: 204 });
};
