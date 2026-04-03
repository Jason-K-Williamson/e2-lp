import type { APIRoute } from "astro";
import { getAdminClient } from "../../../lib/supabase-admin";
import { requireAdmin } from "../../../lib/admin-auth";

function extractNiche(searchUrl: string | null | undefined): string | null {
  if (!searchUrl) return null;
  try {
    const u = new URL(searchUrl.startsWith("http") ? searchUrl : `https://x.com${searchUrl}`);
    const q = u.searchParams.get("q") || "";
    return q.replace(/\+/g, " ").trim() || null;
  } catch {
    return null;
  }
}

function detectShopify(linkUrl: string | null | undefined): boolean {
  if (!linkUrl) return false;
  return (
    linkUrl.includes("myshopify.com") ||
    linkUrl.includes("/collections/") ||
    linkUrl.includes("/products/")
  );
}

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const SKIP_DOMAINS = new Set([
  "amazon.com", "amazon.com.au", "amazon.co.uk", "amazon.ca",
  "amazon.in", "amazon.de", "amazon.fr", "amazon.co.jp", "amazon.com.br",
  "ebay.com", "ebay.com.au", "ebay.co.uk",
  "etsy.com", "walmart.com", "target.com",
  "temu.com", "shein.com", "aliexpress.com", "wish.com",
  "iherb.com", "vitacost.com",
  "facebook.com", "fb.com", "fb.me", "m.facebook.com", "l.facebook.com",
  "instagram.com", "tiktok.com", "twitter.com", "x.com",
  "youtube.com", "pinterest.com", "linkedin.com", "snapchat.com",
  "threads.net",
  "play.google.com", "apps.apple.com", "apple.com",
  "api.whatsapp.com", "wa.me", "whatsapp.com",
  "linktr.ee", "beacons.ai", "bio.site", "solo.to",
  "doubleclick.net", "ad.doubleclick.net", "googleadservices.com",
]);

const BATCH_SIZE = 500;

export const POST: APIRoute = async ({ request, cookies }) => {
  const denied = requireAdmin(cookies);
  if (denied) return denied;

  const supabase = getAdminClient();

  const body = await request.json();
  const datasetId: string = body.datasetId;
  const apifyToken: string = body.apifyToken || import.meta.env.APIFY_API_TOKEN;
  const skipLikesFilter: boolean = body.skipLikesFilter ?? false;

  if (!datasetId) {
    return new Response(JSON.stringify({ error: "datasetId required" }), { status: 400 });
  }
  if (!apifyToken) {
    return new Response(JSON.stringify({ error: "APIFY_API_TOKEN not configured" }), { status: 500 });
  }

  let total = 0;
  let offset = 0;
  const PAGE_SIZE = 1000;

  const skipReasons: Record<string, number> = {
    no_domain: 0,
    marketplace: 0,
    ads_out_of_range: 0,
    no_website: 0,
    duplicate_domain: 0,
    db_error: 0,
  };

  let sampleFields: string[] | null = null;
  let sampleAdsCount: number | null = null;
  let dbErrorDetail: string | null = null;

  const domainMap = new Map<string, {
    brand_name: string;
    domain: string;
    website_url: string;
    facebook_page: string | null;
    page_likes: number;
    ads_count: number;
    country: string | null;
    niche: string | null;
    is_shopify: boolean;
    apify_dataset_id: string;
    ig_username: string | null;
    ig_followers: number | null;
  }>();

  while (true) {
    const apifyHeaders: Record<string, string> = { Authorization: `Bearer ${apifyToken}` };
    const res = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?limit=${PAGE_SIZE}&offset=${offset}&clean=true`,
      { headers: apifyHeaders },
    );
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Apify fetch failed: ${res.status}` }), { status: 500 });
    }
    const items: any[] = await res.json();
    if (!items || items.length === 0) break;

    total += items.length;

    for (const item of items) {
      if (sampleFields === null) {
        sampleFields = Object.keys(item);
        sampleAdsCount = Number(item.ads_count ?? item.adsCount ?? 0);
      }

      const snapshotUrl =
        item.snapshot?.link_url || item.snapshot?.linkUrl ||
        item.snapshot?.cards?.[0]?.link_url || item.snapshot?.cards?.[0]?.linkUrl ||
        item.snapshot?.website_url || item.snapshot?.websiteUrl ||
        item.advertiser?.website || item.advertiser?.websiteUrl || null;

      const rawLink =
        snapshotUrl ||
        item.link_url || item.linkUrl || item.website || item.websiteUrl ||
        item.website_url || item.external_link || item.externalLink ||
        item.homepage || item.domain || "";

      const websiteUrl = rawLink.split("?")[0] || null;
      const domain = extractDomain(websiteUrl);

      if (!domain) { skipReasons.no_domain++; continue; }
      if (SKIP_DOMAINS.has(domain)) { skipReasons.marketplace++; continue; }
      if (!websiteUrl) { skipReasons.no_website++; continue; }

      const isActive = item.is_active === true || item.isActive === true;
      if (!skipLikesFilter && !isActive) {
        skipReasons.ads_out_of_range++;
        continue;
      }

      const collationCount = Number(item.collation_count ?? item.collationCount ?? 1) || 1;

      const existing = domainMap.get(domain);
      if (existing) {
        existing.ads_count += collationCount;
        skipReasons.duplicate_domain++;
        continue;
      }

      const pageInfo = item.advertiser?.ad_library_page_info?.page_info;

      domainMap.set(domain, {
        brand_name: item.page_name || item.pageName || item.brand_name || item.brandName || item.name || item.title || domain,
        domain,
        website_url: websiteUrl,
        facebook_page: pageInfo?.page_profile_uri || item.page_url || item.pageUrl || item.facebook_url || item.facebookUrl || null,
        page_likes: pageInfo?.likes || 0,
        ads_count: collationCount,
        country: item.country || item.country_code || null,
        niche: extractNiche(item.url) || pageInfo?.page_category || item.category || item.niche || null,
        is_shopify: detectShopify(rawLink) || detectShopify(websiteUrl),
        apify_dataset_id: datasetId,
        ig_username: pageInfo?.ig_username || null,
        ig_followers: pageInfo?.ig_followers || null,
      });
    }

    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const igMap = new Map<string, { ig_username: string | null; ig_followers: number | null }>();
  const validRows = Array.from(domainMap.values()).map(({ ig_username, ig_followers, ...row }) => {
    igMap.set(row.domain, { ig_username, ig_followers });
    return row;
  });

  let inserted = 0;
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const chunk = validRows.slice(i, i + BATCH_SIZE);
    const { data: upsertedLeads, error } = await supabase
      .from("leads")
      .upsert(chunk, { onConflict: "domain", ignoreDuplicates: false })
      .select("id, domain");

    if (error || !upsertedLeads) {
      skipReasons.db_error += chunk.length;
      if (error && !dbErrorDetail) dbErrorDetail = error.message;
      continue;
    }

    inserted += upsertedLeads.length;

    await supabase.from("outreach").upsert(
      upsertedLeads.map((l) => ({ lead_id: l.id, stage: "new" })),
      { onConflict: "lead_id", ignoreDuplicates: true }
    );

    await supabase.from("founders").upsert(
      upsertedLeads.map((l) => {
        const ig = igMap.get((l as any).domain);
        return {
          lead_id: l.id,
          ...(ig?.ig_username ? { instagram_handle: ig.ig_username } : {}),
        };
      }),
      { onConflict: "lead_id", ignoreDuplicates: false }
    );
  }

  const skipped = total - inserted;

  return new Response(
    JSON.stringify({
      inserted,
      skipped,
      total,
      skipReasons,
      diagnostics: {
        sampleFields,
        sampleAdsCount,
        dbErrorDetail,
        note: sampleAdsCount === 0
          ? "WARNING: ads_count resolved to 0 — check field names above"
          : null,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
