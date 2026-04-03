import type { APIRoute } from "astro";
import { getAdminClient } from "../../../lib/supabase-admin";
import { requireAdmin } from "../../../lib/admin-auth";
import {
  ALLOWED_LEAD_FIELDS,
  pickAllowed,
  rejectUnknownKeys,
} from "../../../lib/api/validators";

const PAGE_SIZE = 200;

export const GET: APIRoute = async ({ request, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();
  const url = new URL(request.url);
  const stage = url.searchParams.get("stage");
  const niche = url.searchParams.get("niche");
  const search = url.searchParams.get("search");
  const minAds = url.searchParams.get("minAds");
  const maxAds = url.searchParams.get("maxAds");
  const shopifyOnly = url.searchParams.get("shopifyOnly") === "true";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const selectClause = stage
    ? `*, founders(*), outreach!inner(*)`
    : `*, founders(*), outreach(*)`;

  let query = supabase
    .from("leads")
    .select(selectClause, { count: "exact" })
    .order("ads_count", { ascending: false })
    .range(from, to);

  if (stage) query = query.eq("outreach.stage", stage);
  if (niche) query = query.eq("niche", niche);
  if (search) query = query.ilike("brand_name", `%${search}%`);
  if (minAds) query = query.gte("ads_count", parseInt(minAds));
  if (maxAds) query = query.lte("ads_count", parseInt(maxAds));
  if (shopifyOnly) query = query.eq("is_shopify", true);

  const { data, count, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({
      data: data || [],
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
      hasMore: from + PAGE_SIZE < (count ?? 0),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const body = await request.json();

  const rejected = rejectUnknownKeys(body, ALLOWED_LEAD_FIELDS, "lead");
  if (rejected) return rejected;

  const sanitized = pickAllowed(body, ALLOWED_LEAD_FIELDS);

  const supabase = getAdminClient();

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .insert(sanitized)
    .select()
    .single();

  if (leadErr) {
    return new Response(JSON.stringify({ error: leadErr.message }), { status: 500 });
  }

  const [outreachRes, founderRes] = await Promise.all([
    supabase.from("outreach").insert({ lead_id: lead.id, stage: "new" }),
    supabase.from("founders").insert({ lead_id: lead.id }),
  ]);

  if (outreachRes.error || founderRes.error) {
    const detail = outreachRes.error?.message || founderRes.error?.message;
    return new Response(
      JSON.stringify({
        error: `Lead created but related records failed: ${detail}`,
        code: "PARTIAL_CREATE_FAILURE",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify(lead), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
