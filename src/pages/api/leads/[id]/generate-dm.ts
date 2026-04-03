import type { APIRoute } from "astro";
import { getAdminClient } from "../../../../lib/supabase-admin";
import { requireAdmin } from "../../../../lib/admin-auth";
import Anthropic from "@anthropic-ai/sdk";

function getCaseStudy(niche: string | null): string {
  const n = (niche || "").toLowerCase();
  if (n.includes("fashion") || n.includes("clothing") || n.includes("apparel")) {
    return "BogeyBros (AU fashion brand) — we rebuilt their email flows and doubled automated revenue in 60 days";
  }
  if (n.includes("supplement") || n.includes("health") || n.includes("wellness") || n.includes("nutrition")) {
    return "Nexus Sports Nutrition — open rates went from 15% to 50% and automated email now accounts for 38% of total revenue";
  }
  if (n.includes("skin") || n.includes("beauty") || n.includes("cosmetic") || n.includes("makeup")) {
    return "Valley Eyewear — email attribution jumped from 22% to 49% of revenue within 90 days of our build";
  }
  if (n.includes("pet")) {
    return "The Oodie — we built the email and SMS system that scaled them to $25M in SMS-attributed revenue";
  }
  if (n.includes("aussie") || n.includes("au ") || n.includes("australian")) {
    return "The Oodie (AU brand) — we built the email and SMS system that scaled them to $25M in SMS-attributed revenue";
  }
  return "The Oodie — we built the email and SMS system that scaled them to $25M in SMS-attributed revenue";
}

export const POST: APIRoute = async ({ params, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select(`*, founders(*), outreach(*)`)
    .eq("id", params.id!)
    .single();

  if (leadErr || !lead) {
    return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404 });
  }

  const founder = (lead as any).founders;
  const firstName = founder?.first_name || founder?.full_name?.split(" ")[0] || "there";
  const brandName = lead.brand_name;
  const niche = lead.niche;
  const pageLikes = lead.page_likes;
  const caseStudy = getCaseStudy(niche);

  const apiKey = import.meta.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Write a 4-line Instagram DM from Jason Williamson (founder, e2 Agency) to ${firstName}, founder of ${brandName}.

Context:
- Brand: ${brandName}
- Niche: ${niche || "eCom"}
- Size: ${pageLikes?.toLocaleString()} Facebook followers (mid-size DTC brand)
- Relevant result to reference: ${caseStudy}

Format rules (strict):
- Line 1: One specific, genuine observation about their brand (not generic — make it feel like Jason actually looked at them)
- Line 2: Reference the case study result above + connect it to their niche
- Line 3: Name the gap you can see in their email/SMS setup (assume they're leaving money on the table)
- Line 4: Soft, low-pressure CTA — offer to show them something specific, not "hop on a call"
- Max 60 words total
- Conversational tone, no emojis, no exclamation marks
- Sound like a founder talking to a founder, not an agency pitch
- Do NOT use the word "leverage", "synergy", "game-changer", or any corporate buzzwords

Output ONLY the DM text, no preamble.`;

  let dmCopy: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });
    dmCopy = (message.content[0] as any).text?.trim() || "";
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Anthropic API error: ${err.message || "Unknown error"}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (founder?.id) {
    const { error: fErr } = await supabase.from("founders").update({ dm_copy: dmCopy }).eq("lead_id", params.id!);
    if (fErr) {
      return new Response(
        JSON.stringify({ error: `Failed to save DM copy: ${fErr.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const { error: oErr } = await supabase.from("outreach").update({ stage: "dm_ready" }).eq("lead_id", params.id!);
  if (oErr) {
    return new Response(
      JSON.stringify({ error: `Failed to update outreach stage: ${oErr.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ dm_copy: dmCopy }), {
    headers: { "Content-Type": "application/json" },
  });
};
