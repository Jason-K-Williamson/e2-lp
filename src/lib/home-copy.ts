/**
 * Homepage (/) copy — source of truth in git.
 *
 * COPY RULE: No em dashes (—) or en dashes (–) in user-facing strings.
 * Use periods, commas, colons, or ASCII hyphens (-) only.
 *
 * Supabase `page_variants` is for AI-generated test pages (/admin, dynamic routes).
 * The main landing page is edited here and deployed — not in the database.
 *
 * Live dynamic data (revenue total, intake dates) comes from other sources:
 * - site_metrics.live_revenue_total → SocialProof bar
 * - getStrategyIntakeCopy() → scarcity badge dates
 */

export const HOME_COPY = {
  title: "Real Results. Real Brands. Real Revenue. | e2 Agency",
  description:
    "$225M+ generated. 2,000+ brands. See the case studies, designs, and client results that prove it.",

  hero_headline:
    "Turn email into 30-40% of revenue in LESS than 90 days.",
  hero_subheadline:
    "We have generated $225M+ for 2,000+ DTC brands. Book a free 30-minute strategy call and we will map the exact playbook to your store. No pitch. No obligation.",
  hero_cta_primary: "Book Your 30-Minute Strategy Call",
  /** Empty string hides the secondary CTA in Hero.astro */
  hero_cta_secondary: "",

  finalcta_heading:
    "Get Your Email Revenue System Built. Stop Doing It Yourself.",
  finalcta_subheading:
    "Book a free strategy call. We will map your exact revenue gap and tell you honestly what Full Send would generate for your brand.",
} as const;
