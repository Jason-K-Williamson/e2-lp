import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Fallback to placeholder strings so createClient never throws at module load.
// When env vars aren't set, all DB calls will fail quietly and pages render
// from DEFAULT_VARIANT. Set PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_ANON_KEY
// in Cloudflare Pages → Settings → Environment Variables to restore live data.
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key'
);

export interface OfferCard {
  icon: string;
  block: string;
  color: string;
  title: string;
  desc: string;
  items: { name: string; desc: string }[];
}

export interface PageVariant {
  id: string;
  concept: string;
  tam: string;
  // SPINE brief (internal reference)
  brief: string;
  spine_product: string;
  spine_jtbd: string;
  spine_problem: string;
  spine_mechanism: string;
  // Hero
  hero_badge: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  // Problem / Agitation section
  prob_heading: string;
  prob_subheading: string;
  prob_pain_points: string[];
  prob_gain_points: string[];
  prob_agitation_body: string;  // Mid-section paragraph under before/after grid
  prob_stakes_body: string;     // "Cost of Waiting" callout paragraph
  prob_trap_label: string;      // e.g. "The Agency Trap" → "The Meta Trap" for Meta TAM
  prob_before_label: string;    // e.g. "Retainer Agency Results"
  // Mechanism / How It Works section
  mech_heading: string;
  mech_subheading: string;
  mech_step1_label: string;
  mech_step1_desc: string;
  mech_step1_bullets: string[];  // "What you get" items for step 1
  mech_step2_label: string;
  mech_step2_desc: string;
  mech_step2_bullets: string[];
  mech_step3_label: string;
  mech_step3_desc: string;
  mech_step3_bullets: string[];
  // Offer section
  offer_heading: string;
  offer_subheading: string;
  offer_summary_title: string;
  offer_summary_body: string;
  offer_cards: OfferCard[];
  // Final CTA section
  finalcta_heading: string;
  finalcta_subheading: string;
  // FAQ
  faq: { q: string; a: string }[];
  // Meta
  meta_title: string;
  meta_description: string;
  // Status
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_VARIANT = {
  brief: "",
  // ── Hero ─────────────────────────────────────────────────────────────────
  hero_badge: "1 Free Strategy Call · March Intake · 2 Spots Left",
  hero_headline: "Ethically Steal Our $200M Email Playbook — Free in 1 Strategy Call",
  hero_subheadline: "Without wasting more money on the Andromeda Roller Coaster. Get the exact 6-flow system that generated $225,669,414 for eCom brands — and see if we can build it for yours. No pitch. 60 minutes. 100% free.",
  hero_cta_primary: "Steal the Playbook →",
  hero_cta_secondary: "See the Results First",

  // ── Problem / Agitation ──────────────────────────────────────────────────
  prob_heading: "Your Email List Is Leaking Revenue Every Single Day",
  prob_subheading: "You're paying an agency a retainer, getting monthly reports full of open rates and click rates. While the actual revenue number stays flat. That's not a strategy problem. It's a system problem.",
  prob_pain_points: [
    'Generic flows that could belong to any brand',
    "Copy that reads like it was written by a robot",
    "Zero understanding of your margins or unit economics",
    "Retainer invoices with no accountability to revenue",
  ],
  prob_gain_points: [
    "Custom flow architecture built for your exact product cycle",
    "Human copywriters. Sounds exactly like your brand.",
    "Strategy anchored to profit, LTV, and unit economics",
    "One flat fee. Yours to keep forever. No lock-in.",
  ],
  prob_agitation_body: "Meanwhile, your competitors generate $2–3 per subscriber every month. If you have 50,000 subscribers and you're generating $0.50 each, that's $75K–$125K in email revenue you're leaving on the table monthly. And your list decays 2–3% every single month without active engagement — every 30 days you wait, it gets harder and more expensive to fix.",
  prob_stakes_body: "You're spending real money acquiring every customer — Meta ads, Google, influencers. That first purchase barely covers acquisition cost. The profit is in the second, third, and fourth purchase. But without the right system, list decay compounds: 2–3% per month means your 50K list becomes a 44K list in just 6 months, with permanently degraded deliverability. That's lost revenue you can never recover.",
  prob_trap_label: 'The "Agency" Trap',
  prob_before_label: 'Retainer Agency Results',

  // ── Mechanism ────────────────────────────────────────────────────────────
  mech_heading: "Your Revenue Engine,",
  mech_subheading: "No vague retainer. No ongoing strategy. A clear build, on a clear timeline, with a clear result.",
  mech_step1_label: "Revenue Audit",
  mech_step1_desc: "We forensically map your customer journey. Every touchpoint, every gap, every dollar leaking out of your funnel. You see exactly what is broken and exactly what it is costing you.",
  mech_step1_bullets: ['Revenue leak audit', 'Custom flow architecture', 'Unit economics baseline'],
  mech_step2_label: "Custom Build",
  mech_step2_desc: "Our copywriters and Klaviyo specialists build your entire flow architecture from scratch. Copy, design, segments, triggers. Built for your brand, your product cycle, and your customers.",
  mech_step2_bullets: ['6 fully-written flows', 'Custom email design system', 'Deliverability & DNS setup'],
  mech_step3_label: "Live and Compounding",
  mech_step3_desc: "Your system goes live. From day one it captures revenue that was previously walking out the door. Every month it compounds as your list grows and the flows mature.",
  mech_step3_bullets: ['Revenue flowing day one', 'Full IP ownership', 'No retainer, no lock-in'],

  // ── Offer ────────────────────────────────────────────────────────────────
  offer_heading: 'The Full Revenue Engine.',
  offer_subheading: "Most agencies give you a retainer and a vague promise. We hand you a complete, battle-tested email and SMS machine. Then we walk away.",
  offer_summary_title: '6 Flows. A Full Senior Team. One Flat Fee. Yours to Keep.',
  offer_summary_body: '4 revenue flows + 1 nurture sequence + 1 consumable replenishment flow. Built by a dedicated strategist, copywriter, designer & Klaviyo specialist. No retainer. No lock-in. 100% IP ownership.',
  offer_cards: [
    {
      icon: '⚡', block: 'Block 1', color: 'blue',
      title: '4 Core Revenue Flows',
      desc: 'The four flows that account for 80% of automated revenue in every DTC brand. Built, tested, live.',
      items: [
        { name: 'Welcome Series', desc: 'Converts cold subscribers into first-time buyers within 7 days.' },
        { name: 'Abandoned Checkout', desc: 'Recovers buyers who were seconds away from purchasing.' },
        { name: 'Added to Cart', desc: 'Catches high-intent browsers before they leave.' },
        { name: 'Browse Abandonment', desc: 'Re-engages window shoppers with the right message at the right time.' },
      ],
    },
    {
      icon: '🔁', block: 'Block 2', color: 'indigo',
      title: 'Nurture + Consumable Flow',
      desc: 'Turn one-time buyers into repeat customers. Automatically.',
      items: [
        { name: 'Nurture Sequence', desc: 'Builds trust, educates, and primes your list to buy again. Runs on autopilot after every purchase.' },
        { name: 'Consumable Replenishment Flow', desc: "Timed to your product use cycle. Drives reorders without a single manual send." },
      ],
    },
    {
      icon: '🎯', block: 'Block 3', color: 'violet',
      title: 'The Team Behind It',
      desc: "You don't get a junior VA. You get a full senior team.",
      items: [
        { name: 'Dedicated Performance Strategist', desc: 'Owns your account. Accountable to your numbers.' },
        { name: 'World-Class Copywriter (Zero AI)', desc: 'Human-written copy that sounds like your brand, not a chatbot.' },
        { name: 'Senior Graphic Designer', desc: 'On-brand email design that converts.' },
        { name: 'Klaviyo Technical Specialist', desc: 'Handles all setup, segmentation, and deliverability.' },
      ],
    },
    {
      icon: '🛡️', block: 'Block 4', color: 'emerald',
      title: 'The Risk Reversal',
      desc: 'We only win when you win. Here is how we back that up.',
      items: [
        { name: 'Full IP Ownership', desc: 'Every flow, every email, every asset. Yours. Forever.' },
        { name: 'No Monthly Retainer', desc: 'One flat fee. No ongoing invoices. No lock-in.' },
        { name: 'Deliverability & DNS Audit', desc: 'We fix your sending reputation before we send a single email.' },
        { name: 'Profit-First A/B Testing', desc: 'We test to increase revenue, not open rates.' },
      ],
    },
  ] as any,  // typed as OfferCard[] via interface

  // ── Final CTA ─────────────────────────────────────────────────────────────
  finalcta_heading: "Ready to Turn Your Email List Into a Revenue Engine?",
  finalcta_subheading: "Tell us about your brand. We will tell you honestly whether we can help and by how much.",

  // ── FAQ ──────────────────────────────────────────────────────────────────
  faq: [
    { q: "What if the flows don't perform?", a: "We have never had a client not see a revenue lift. But if after 90 days your automated email revenue hasn't increased materially, we rebuild every underperforming flow at no charge. No questions asked. We only win when you win." },
    { q: "I've been burned by agencies before. How is this different?", a: "We get this more than any other question. The difference is structural: retainer agencies are incentivised to take their time. We build a finished system, hand you the keys, and walk away. You pay once. There's no reason for us to drag it out." },
    { q: "Will this work for my brand's niche?", a: "We specialise in eCom and supplement brands doing $500K-$50M+ per year. If you're in that range, the answer is almost certainly yes. What matters is your list size and monthly revenue, not your specific product." },
    { q: "What size brand is this right for?", a: "Our sweet spot is brands doing $500K-$50M per year. During your strategy call, we'll tell you honestly if you're a fit." },
    { q: "Why a one-time fee instead of a retainer?", a: "Retainers incentivise agencies to work slowly. We build a system. Once live, it runs forever — compounding revenue every month without you paying rent on it." },
    { q: "How long does the build take?", a: "Typically 7-14 days from kickoff to your first flow going live. All 6 flows are usually live within 3 weeks." },
    { q: "Do you work with Klaviyo?", a: "We specialise in Klaviyo for email and Postscript for SMS. If you're on another platform, we handle the full migration as part of the build." },
    { q: "What do I need to provide?", a: "Access to your ESP and Shopify, brand guidelines if you have them, and 45 minutes for the kickoff call. That's it. We handle everything else." },
  ],

  // ── Meta ─────────────────────────────────────────────────────────────────
  meta_title: "e2 Agency — Email Flows That Print Revenue",
  meta_description: "We build the complete email and SMS revenue engine for eCom brands. $225,669,414 generated. 2,000+ brands helped. One flat fee. Yours forever.",
};
