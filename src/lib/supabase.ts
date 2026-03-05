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
  hero_headline: "Ethically Steal Our $200M Email Playbook. Free in 1 Strategy Call.",
  hero_subheadline: "Without wasting more money on the Andromeda Roller Coaster. Get the exact 6-flow system that generated $225,669,414 for eCom brands and see if we can build it for yours. No pitch. 60 minutes. 100% free.",
  hero_cta_primary: "Steal the Playbook →",
  hero_cta_secondary: "See the Results First",

  // ── Problem / Agitation ──────────────────────────────────────────────────
  prob_heading: "The Real Cost Is Your Time and Your Revenue.",
  prob_subheading: "Every hour you spend figuring out flows, sequences, and Klaviyo is an hour you are not running your brand. Email marketing is a full skill. One you should not have to learn.",
  prob_pain_points: [
    "Paying someone $3K/month with nothing to show for it",
    "Spending your own time on Klaviyo instead of your product",
    "Generic sequences that could belong to any brand in any niche",
    "Reports full of open rates. No mention of actual revenue.",
  ],
  prob_gain_points: [
    "A complete system built for you. Nothing to manage on your end.",
    "Your time back. Focused on what only you can do.",
    "Copy that sounds like your brand. Built for your customer.",
    "One flat fee. Revenue compounding forever. No retainer.",
  ],
  prob_agitation_body: "Here is the math you are probably not looking at. If your list has 50,000 subscribers and you are generating $0.50 per recipient, you are leaving $75K to $125K per month on the table compared to brands with the right system. That is real money. And your list decays 2 to 3 percent every single month without active, intelligent engagement. Every 30 days you wait, the cost to fix it goes up.",
  prob_stakes_body: "Your time is the most expensive thing in your business. Spending it learning Klaviyo, writing sequences, or managing an agency that does not perform has a real cost. Because while you are doing that, you are not building product, acquiring customers, or running the parts of the business that actually need you. Email is a solved problem. You should not be the one solving it.",
  prob_trap_label: "The DIY and Retainer Trap",
  prob_before_label: "Without Full Send",

  // ── Mechanism ────────────────────────────────────────────────────────────
  mech_heading: "Full Send: Done For You,",
  mech_subheading: "We build the complete email and SMS revenue system for your brand. You approve it. It goes live. You never have to think about it again.",
  mech_step1_label: "Revenue Audit",
  mech_step1_desc: "We start by mapping exactly what your email list should be generating versus what it is actually generating. The gap becomes the brief. You see where the money is leaking and exactly what it will take to stop it.",
  mech_step1_bullets: ["Revenue gap analysis", "Flow architecture plan", "Deliverability baseline audit"],
  mech_step2_label: "Full Send Build",
  mech_step2_desc: "Your dedicated team of strategist, copywriter, designer, and Klaviyo specialist builds every flow from scratch. Copy written for your brand voice. Design built to your guidelines. All 6 flows plus SMS. Live in under 21 days.",
  mech_step2_bullets: ["6 custom flows plus SMS sequences", "Brand-matched copy and design", "Klaviyo tech setup and DNS config"],
  mech_step3_label: "Live. Yours. Forever.",
  mech_step3_desc: "Your system goes live and starts generating revenue from day one. Every subscriber that enters your list hits a machine that works without you lifting a finger. You own every asset. No retainer. No lock-in. The system compounds every month as your list grows.",
  mech_step3_bullets: ["Revenue from day one", "Full IP and asset ownership", "Zero ongoing obligation"],

  // ── Offer ────────────────────────────────────────────────────────────────
  offer_heading: "What Full Send Includes.",
  offer_subheading: "Six fully-built flows, an SMS channel, a senior team, and a system that runs without you. Built once. Yours forever.",
  offer_summary_title: "6 Flows. SMS. A Full Senior Team. One Flat Fee.",
  offer_summary_body: "Welcome, Abandoned Cart, Added to Cart, Browse Abandonment, Post-Purchase, and Win-Back flows. Plus an SMS channel built alongside your email. Done-for-you. No retainer. 100% IP ownership.",
  offer_cards: [
    {
      icon: "⚡", block: "Block 1", color: "blue",
      title: "The 6 Revenue Flows",
      desc: "Every flow that drives automated revenue for DTC brands. All six built, written, designed, and live.",
      items: [
        { name: "Welcome Series", desc: "Converts new subscribers into buyers within 7 days. First impression, done right." },
        { name: "Abandoned Checkout", desc: "Recovers buyers who were 30 seconds from purchasing. Highest ROI flow in your account." },
        { name: "Added to Cart", desc: "Catches high-intent browsers before they leave your site." },
        { name: "Browse Abandonment", desc: "Re-engages window shoppers with precision targeting and brand-matched copy." },
        { name: "Post-Purchase", desc: "Turns a first-time buyer into a loyal repeat customer. LTV compounding starts here." },
        { name: "Win-Back", desc: "Recovers lapsed customers before they go cold permanently." },
      ],
    },
    {
      icon: "📱", block: "Block 2", color: "indigo",
      title: "SMS Channel, Built Alongside",
      desc: "Email and SMS working together. One coordinated revenue system, not two things bolted on.",
      items: [
        { name: "Klaviyo SMS or Postscript", desc: "Fully built and integrated alongside your email flows. No overlap, no cannibalization." },
        { name: "Abandonment SMS Sequences", desc: "The SMS complement to your cart and checkout flows. Catches more recoveries." },
        { name: "Win-Back SMS", desc: "Re-engage lapsed buyers through a channel they actually check." },
        { name: "Compliance and List Building", desc: "Built to be legal. Built to grow. Opt-in flows configured from day one." },
      ],
    },
    {
      icon: "🎯", block: "Block 3", color: "violet",
      title: "The Team Doing the Work",
      desc: "A full senior team assigned to your account. Not a VA following a template.",
      items: [
        { name: "Performance Strategist", desc: "Owns the brief, the architecture, and the results. One point of contact." },
        { name: "Brand Copywriter", desc: "Human-written copy that sounds exactly like your brand. Zero AI, zero generic." },
        { name: "Email Designer", desc: "Custom HTML templates built to your visual identity. Not stock layouts." },
        { name: "Klaviyo Technical Specialist", desc: "Segmentation, triggers, DNS, deliverability. All handled." },
      ],
    },
    {
      icon: "🛡️", block: "Block 4", color: "emerald",
      title: "The Guarantee",
      desc: "We built this so you carry zero risk. Here is what you are protected by.",
      items: [
        { name: "Full IP Ownership from Day One", desc: "Every flow, email, asset, and template is yours. We build it. You own it. Forever." },
        { name: "No Retainer. Ever.", desc: "One flat fee. The system runs without an ongoing invoice. That is the whole point." },
        { name: "Revenue-or-Rebuild Guarantee", desc: "If your automated email revenue does not increase materially in 90 days, we rebuild every underperforming flow at no charge." },
        { name: "Deliverability Audit Included", desc: "We audit and fix your sending reputation before a single email goes out." },
      ],
    },
  ] as any,  // typed as OfferCard[] via interface

  // ── Final CTA ─────────────────────────────────────────────────────────────
  finalcta_heading: "Get Your Email Revenue System Built. Stop Doing It Yourself.",
  finalcta_subheading: "Book a free strategy call. We will map your exact revenue gap and tell you honestly what Full Send would generate for your brand.",

  // ── FAQ ──────────────────────────────────────────────────────────────────
  faq: [
    { q: "What exactly is Full Send?", a: "Full Send is our done-for-you email and SMS build service. We build every flow, write all the copy, design every email, and configure your entire Klaviyo account. You pay once. The system is yours. We hand you the keys and walk away." },
    { q: "I do not have time to be involved. How much do you need from me?", a: "Almost nothing. We need 45 minutes for the kickoff call, access to your Klaviyo and Shopify, and your brand guidelines if you have them. After that, we build. You approve the final output and it goes live. That is it." },
    { q: "I have tried building flows myself. Why has it not worked?", a: "Because email flows are a full discipline. Writing, design, segmentation, deliverability, and strategy all have to work together. Most brands build the welcome flow and nothing else, or copy a template that was not designed for their product cycle. We build the complete system, tuned to your specific brand and customer." },
    { q: "I have been burned by retainer agencies. How is this different?", a: "Retainer agencies are incentivised to take their time. The longer the engagement, the longer they invoice. We build a finished system. Once it is live, we hand it over. There is no reason for us to drag it out, because you pay once." },
    { q: "What if the flows do not perform?", a: "We have never had a client not see a revenue lift. But if after 90 days your automated email revenue has not increased materially, we go back in and rebuild every underperforming flow at no charge. No arguments." },
    { q: "How long does the build take?", a: "First flow goes live within 7 to 14 days of kickoff. All 6 flows and SMS are typically live in under 21 days." },
    { q: "What size brand is this for?", a: "Our sweet spot is eCom and supplement brands doing $500K to $50M per year. During your call, we will tell you honestly if you are a fit and what we realistically expect to generate." },
    { q: "Do I own everything after the build?", a: "100%. Every flow, every email, every asset, every template. Full IP ownership from day one. No lock-in, no ongoing obligation." },
  ],

  // ── Meta ─────────────────────────────────────────────────────────────────
  meta_title: "e2 Agency: Email Flows That Print Revenue",
  meta_description: "We build the complete email and SMS revenue engine for eCom brands. $225,669,414 generated. 2,000+ brands helped. One flat fee. Yours forever.",
};
