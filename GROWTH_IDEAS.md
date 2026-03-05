# e2 Agency — Growth Ideas & Backlog

---

## 💡 IDEA: Personalised Landing Pages for Cold Outreach

**Status:** Ready to build
**Priority:** HIGH — potential 10x on outreach conversion rate

### The Concept
Use the existing `[concept]/[tam].astro` dynamic route to generate personalised
landing pages for every Shopify brand we're targeting.

Cold DM/email becomes:
> "Hey [Founder], made something specific for you — landing.e2.agency/email-sms/peppermayo"

They click because their brand name is in the URL.
They land on a page speaking directly to their niche, size, and pain.
Nobody else is doing this.

### URL Structure
```
landing.e2.agency/[concept]/[tam]

Examples:
landing.e2.agency/email-sms/peppermayo
landing.e2.agency/klaviyo-revenue/caldera-lab
landing.e2.agency/email-sms/aussie-fashion
```

### Phase 1 — 8 Niche Variants (hours to build)
| URL slug            | Target niche        |
|---------------------|---------------------|
| /email-sms/fashion-brands     | Fashion             |
| /email-sms/beauty-brands      | Beauty / Skincare   |
| /email-sms/supplement-brands  | Supplements         |
| /email-sms/pet-brands         | Pet                 |
| /email-sms/aussie-fashion     | AU Fashion          |
| /email-sms/jewellery-brands   | Jewellery           |
| /email-sms/activewear-brands  | Activewear          |
| /email-sms/home-decor-brands  | Home Decor          |

### Phase 2 — Top 50 Brand-Specific Variants
AI-generate personalised copy per brand, insert directly to Supabase.
Pull from `e2_shopify_confirmed.csv` (423 confirmed Shopify brands).

Top targets:
- Peppermayo (Aussie fashion, 251k likes)
- Caldera + Lab (men's skincare, 281k likes)
- BYLT Basics (activewear, 170k likes)
- ILIA Beauty (beauty, 164k likes)
- POPFLEX Active (activewear, 158k likes)
- MaryRuth's (supplements, 259k likes)
- Paw.com (pet, 288k likes)
- Dog is Human (pet supplements, 248k likes)
- DRMTLGY (skincare, 225k likes)
- Bask & Lather Co (hair care, 181k likes)

### What's Needed to Execute
1. Supabase URL + anon key (to insert variants via API)
2. Confirm concept slug (`email-sms` or other)
3. Run Claude batch generation for all niche + brand variants
4. Activate via admin visual editor
5. Map brand → URL in outreach CSV

### Why It Works
- Personalisation at scale with zero manual effort
- Infrastructure already 100% built (Astro + Supabase + Cloudflare)
- URL alone gets the click
- Page closes the deal

---

## 📋 Lead Gen Pipeline (Built Mar 2026)

- **Tool:** Apify Facebook Ads Library Scraper
- **Cost:** $4.62 for 6,165 raw records
- **Clean list:** 936 qualified DTC prospects
- **Shopify confirmed:** 423 brands (URL pattern detection)
- **Files:**
  - `/Downloads/e2_prospects.csv` — 1,062 raw qualified
  - `/Downloads/e2_prospects_clean.csv` — 936 after filtering
  - `/Downloads/e2_shopify_confirmed.csv` — 423 Shopify confirmed

---
