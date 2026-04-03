/**
 * Field allowlists for lead mutation APIs.
 * Unknown keys are rejected with 400 to prevent arbitrary DB column writes.
 */

export const ALLOWED_LEAD_FIELDS = new Set([
  "brand_name",
  "domain",
  "website_url",
  "facebook_page",
  "page_likes",
  "country",
  "niche",
  "klaviyo_confirmed",
  "revenue_estimate",
  "is_shopify",
  "tech_stack",
  "apify_dataset_id",
  "notes",
  "ads_count",
]);

export const ALLOWED_FOUNDER_FIELDS = new Set([
  "full_name",
  "first_name",
  "instagram_handle",
  "email",
  "linkedin_url",
  "title",
  "dm_sent",
  "dm_sent_at",
  "dm_copy",
]);

export const ALLOWED_OUTREACH_FIELDS = new Set([
  "stage",
  "priority",
  "contact_log",
  "replied_at",
  "call_date",
  "deal_value",
  "lost_reason",
  "notes",
]);

export function pickAllowed<T extends Record<string, unknown>>(
  input: T,
  allowed: Set<string>,
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (allowed.has(key)) {
      result[key] = input[key];
    }
  }
  return result as Partial<T>;
}

export function getUnknownKeys(
  input: Record<string, unknown>,
  allowed: Set<string>,
): string[] {
  return Object.keys(input).filter((k) => !allowed.has(k));
}

export function rejectUnknownKeys(
  input: Record<string, unknown>,
  allowed: Set<string>,
  entityName: string,
): Response | null {
  const unknown = getUnknownKeys(input, allowed);
  if (unknown.length === 0) return null;
  return new Response(
    JSON.stringify({
      error: `Unknown ${entityName} fields: ${unknown.join(", ")}`,
      code: "UNKNOWN_FIELDS",
    }),
    { status: 400, headers: { "Content-Type": "application/json" } },
  );
}
