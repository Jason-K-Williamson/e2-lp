import type { APIRoute } from "astro";
import { getAdminClient } from "../../../lib/supabase-admin";
import { requireAdmin } from "../../../lib/admin-auth";
import {
  ALLOWED_LEAD_FIELDS,
  ALLOWED_FOUNDER_FIELDS,
  ALLOWED_OUTREACH_FIELDS,
  pickAllowed,
  rejectUnknownKeys,
} from "../../../lib/api/validators";

export const GET: APIRoute = async ({ params, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select(`*, founders(*), outreach(*)`)
    .eq("id", params.id!)
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

  const body = await request.json();
  const { founder, outreach, ...leadFields } = body;

  if (Object.keys(leadFields).length > 0) {
    const rejected = rejectUnknownKeys(leadFields, ALLOWED_LEAD_FIELDS, "lead");
    if (rejected) return rejected;
  }
  if (founder) {
    const rejected = rejectUnknownKeys(founder, ALLOWED_FOUNDER_FIELDS, "founder");
    if (rejected) return rejected;
  }
  if (outreach) {
    const rejected = rejectUnknownKeys(outreach, ALLOWED_OUTREACH_FIELDS, "outreach");
    if (rejected) return rejected;
  }

  const supabase = getAdminClient();

  if (Object.keys(leadFields).length > 0) {
    const safe = pickAllowed(leadFields, ALLOWED_LEAD_FIELDS);
    const { error } = await supabase.from("leads").update(safe).eq("id", params.id!);
    if (error) {
      return new Response(
        JSON.stringify({ error: `Lead update failed: ${error.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  if (founder) {
    const safe = pickAllowed(founder, ALLOWED_FOUNDER_FIELDS);
    const { error } = await supabase.from("founders").update(safe).eq("lead_id", params.id!);
    if (error) {
      return new Response(
        JSON.stringify({ error: `Founder update failed: ${error.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  if (outreach) {
    const safe = pickAllowed(outreach, ALLOWED_OUTREACH_FIELDS);
    const { error } = await supabase.from("outreach").update(safe).eq("lead_id", params.id!);
    if (error) {
      return new Response(
        JSON.stringify({ error: `Outreach update failed: ${error.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const { data, error: fetchErr } = await supabase
    .from("leads")
    .select(`*, founders(*), outreach(*)`)
    .eq("id", params.id!)
    .single();

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();
  const { error } = await supabase.from("leads").delete().eq("id", params.id!);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(null, { status: 204 });
};
