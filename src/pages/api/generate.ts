import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: import.meta.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
function makeTools(availableSlugs: string[]): Anthropic.Tool[] {
    return [
        {
            name: "get_knowledge_base",
            description: "Retrieves knowledge documents from the e2 Agency knowledge base.",
            input_schema: {
                type: "object" as const,
                properties: {
                    slugs: {
                        type: "array",
                        items: { type: "string" },
                        description: `Slugs to fetch. Available for this stage: ${availableSlugs.join(", ")}`,
                    },
                },
                required: [],
            },
        },
        {
            name: "get_reviews",
            description: "Retrieves real client reviews and result numbers. Filter by tag for the most relevant proof.",
            input_schema: {
                type: "object" as const,
                properties: {
                    tag: {
                        type: "string",
                        description: "Filter tag. Available: 'Email/SMS Marketing Service', 'Pop-up', 'Strategy Call', 'Email Mastery'.",
                    },
                    limit: {
                        type: "number",
                        description: "Max reviews to return. Default 10, max 20.",
                    },
                },
                required: [],
            },
        },
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
async function handleGetKnowledgeBase(
    input: { slugs?: string[] },
    supabaseUrl: string,
    supabaseKey: string
): Promise<string> {
    const sb = createClient(supabaseUrl, supabaseKey);
    let query = sb.from("knowledge_docs").select("slug, title, category, content").order("category");
    if (input.slugs && input.slugs.length > 0) query = query.in("slug", input.slugs);
    const { data: docs, error } = await query;
    if (error) return `Error fetching knowledge: ${error.message}`;
    if (!docs || docs.length === 0) return "No knowledge documents found.";
    return docs
        .filter((d) => d.content?.trim())
        .map((d) => `### ${d.title} [${d.category}]\n${d.content.trim()}`)
        .join("\n\n---\n\n");
}

async function handleGetReviews(
    input: { tag?: string; limit?: number },
    supabaseUrl: string,
    supabaseKey: string
): Promise<string> {
    const sb = createClient(supabaseUrl, supabaseKey);
    const limit = Math.min(input.limit ?? 10, 20);
    const { data: allReviews, error } = await sb
        .from("reviews")
        .select("customer_name, customer_company, customer_tagline, tag, rating, body")
        .not("body", "is", null)
        .order("rating", { ascending: false })
        .limit(limit * 3);
    if (error) return `Error fetching reviews: ${error.message}`;
    if (!allReviews || allReviews.length === 0) return "No reviews found.";
    let reviews = allReviews.filter((r) => r.body && r.body.trim().length > 40);
    if (input.tag) {
        const tagLower = input.tag.toLowerCase();
        const matching = reviews.filter((r) => r.tag?.toLowerCase().includes(tagLower));
        const others = reviews.filter((r) => !matching.includes(r));
        reviews = [...matching, ...others];
    }
    reviews = reviews.slice(0, limit);
    return reviews
        .map((r) => {
            const byline = [r.customer_name, r.customer_company, r.customer_tagline].filter(Boolean).join(" | ");
            return `"${r.body?.trim()}"${byline ? ` — ${byline}` : ""}`;
        })
        .join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENTIC TOOL LOOP — runs Claude with tool access until it produces a text response
// ─────────────────────────────────────────────────────────────────────────────
async function runAgenticLoop(
    systemPrompt: string,
    userMessage: string,
    tools: Anthropic.Tool[],
    supabaseUrl: string,
    supabaseKey: string,
    maxIterations = 8
): Promise<string> {
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
    let finalText = "";

    for (let i = 0; i < maxIterations; i++) {
        const response = await client.messages.create({
            model: "claude-opus-4-5",
            max_tokens: 8192,
            system: systemPrompt,
            tools,
            messages,
        });

        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason === "end_turn") {
            const textBlock = response.content.find((b) => b.type === "text");
            finalText = (textBlock as any)?.text?.trim() ?? "";
            break;
        }

        if (response.stop_reason === "tool_use") {
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of response.content) {
                if (block.type !== "tool_use") continue;
                let result = "";
                if (block.name === "get_knowledge_base") {
                    result = await handleGetKnowledgeBase(block.input as { slugs?: string[] }, supabaseUrl, supabaseKey);
                } else if (block.name === "get_reviews") {
                    result = await handleGetReviews(block.input as { tag?: string; limit?: number }, supabaseUrl, supabaseKey);
                }
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
            }
            messages.push({ role: "user", content: toolResults });
        }
    }

    return finalText;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON EXTRACTOR — strips any preamble prose around the JSON object
// ─────────────────────────────────────────────────────────────────────────────
function extractJSON(text: string): string {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1 || last < first) throw new Error("No JSON object found in response");
    return text.slice(first, last + 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — THE ARCHITECT
// Job: Read the brief, fetch brand docs + reviews, build the complete page
// structure with all sections populated. Pure content strategy.
// ─────────────────────────────────────────────────────────────────────────────
const STAGE1_SYSTEM = `You are a world-class direct-response page architect for E2 Agency, a B2B email marketing agency that builds automated Klaviyo revenue systems for eCom and supplement brands.

Your job in this stage is CONTENT STRATEGY — not polished copy. Populate every section of the page with the right strategic content: the correct enemy, the right pain points, the accurate mechanism, the true JTBD outcome, and real proof numbers from client reviews.

CORE BRIEF INTERPRETATION RULES:
- Interpret the brief as a strategist, not a transcriber. Extract intent. Never copy phrases verbatim.
- Identify: Core Problem (the trap), JTBD (what they want), Hero Mechanism (why e2 is different), TAM (who this is for)
- The enemy in the hero must be the same enemy in agitation in the mechanism in the final CTA — same arc, escalating intensity
- If the brief is thin, fill gaps using your knowledge of eCom founders and email marketing
- Concept slug drives the headline angle EXACTLY — "generic-flows" means the headline is about generic flows

SPINE BRIDGE TEST — run on every headline:
1. Does it name the Core Problem? If no, rewrite.
2. Does it show what that problem is COSTING them at the JTBD level? If no, rewrite.
3. Does the reader feel the cost without further explanation? If no, rewrite.

PROSPECT PROFILE:
- Founder or marketing lead, Shopify store, $50K-$5M/month
- Spends on Meta, watches CAC climb, on a cash flow rollercoaster
- Klaviyo installed but underperforming (5-15% email revenue vs 25-40% benchmark)
- Burned by a retainer agency before. Skeptical. Budget-conscious.
- JTBD: predictable automated revenue that doesn't depend on ad spend

LANGUAGE RULES (Stage 1 — content accuracy is priority, but avoid obvious AI tells):
- No em dashes. No banned words (delve, unlock, unleash, leverage, seamless, robust, cutting-edge, game-changer)
- Use founder/DTC language: flows, RPR, LTV, CAC, Klaviyo, abandoned cart, win-back, BFCM, owned channel
- CTAs must use qualifier language: "See If You Qualify" not "Book a Call"
- Before/After lists must be PARALLEL: each pain maps to a direct counterpart gain, same structure, flipped

TAM SPECIFICITY RULE — critical, non-negotiable:
The headline, badge, subheadline, and finalcta_heading must use language that every brand in the TAM sees themselves in.
- If TAM is "supplement brands" — write for ALL supplement brands: collagen, protein, sleep, nootropics, greens, joint, weight loss, etc.
- NEVER name a specific product sub-type (e.g. "sleep formula," "protein powder") in the headline. That narrows the TAM.
- The correct level of specificity for headlines is the TAM category: "your customer," "your product," "your formulation," "your supplement brand."

AUDIENCE CALLOUT RULE — for TAM-specific variants this is the #1 headline requirement:
The TAM category MUST appear explicitly in the hero_headline. The prospect must read their audience type within the first 5 words.
Use the Specific Result Formula: "We Help [TAM] Generate $X in [Channel] in [Timeframe]"
- RIGHT: "We Help Supplement Brands Hit 35–45% Email Revenue in 90 Days" — audience named, result specific, timeframe clear.
- WRONG: "You Keep Paying Meta to Win Back Customers You Already Bought" — no audience callout, no outcome. Fails the 3-second test.
If the TAM is set and the headline does not name the TAM audience category, it is wrong. Rewrite it.

Concrete examples are powerful — but they belong in body copy and mechanism descriptions, not headlines.
A sleep supplement founder AND a protein powder founder AND a collagen founder must all read the hero_headline and think "that's about me."
If you can imagine a founder from a different sub-niche reading your headline and thinking "this isn't about me" — rewrite it.

Example of WRONG (over-specified): "Your Sleep Formula Customer Gets the Same Email as a Protein Powder Buyer."
Example of RIGHT (TAM-inclusive): "Generic Flows Are Why You Keep Paying for Customers You Already Have."

You can use concrete sub-niche examples in prob_agitation_body, mech_step descriptions, and FAQ answers to illustrate the mechanism vividly. That specificity is correct there. Just not in headlines.

TOOLS TO CALL:
1. get_knowledge_base with slugs: ["about-jason", "creative-matrix-spine", "playbook-2026", "homepage-e2"]
2. get_reviews filtered by "Email/SMS Marketing Service" — pull real result numbers. NEVER invent stats.
3. get_knowledge_base with slugs: ["how-to-write-headlines", "how-to-write-subheadlines"] — read BEFORE writing hero_headline and hero_subheadline. These define exactly how those fields must be written.

Return ONLY valid JSON. No preamble. No markdown fences.`;

function buildStage1Prompt(brief: string, concept: string, tam: string): string {
    return `## BRIEF
---
${brief}
---

## CONTEXT
- Concept slug: ${concept || "(not set — use best judgement)"}
- TAM slug: ${tam || "(not set — use best judgement)"}

## YOUR TASK

1. Call get_knowledge_base: ["about-jason", "creative-matrix-spine", "playbook-2026", "homepage-e2"] to understand e2's positioning
2. Call get_reviews filtered by "Email/SMS Marketing Service" — extract real result numbers
3. Call get_knowledge_base: ["how-to-write-headlines", "how-to-write-subheadlines"] — read both guides BEFORE writing hero_headline and hero_subheadline
4. Build the complete page structure — every field, strategically placed, content-accurate

## OUTPUT — return ONLY this JSON, fully populated

{
  "hero_badge": "Urgency OR social proof. Max 8 words. Real urgency, not manufactured.",
  "hero_headline": "MANDATORY: If tam is set, the TAM audience category must appear in the first 4 words. Use Specific Result Formula: 'We Help [TAM] [Outcome] in [Timeframe]'. Then concept-match the rest. Max 12 words. Do NOT write a pure-problem headline — name BOTH the audience AND the outcome.",
  "hero_subheadline": "2 sentences MAX. 30 words MAX. Any more = body copy. Hint at mechanism and speed. Include a real number if available.",
  "hero_cta_primary": "Qualifier verb. Max 5 words. Cold-temperature. E.g. 'See If You Qualify'",
  "hero_cta_secondary": "Soft CTA. Max 5 words. E.g. 'See How It Works'",
  "prob_heading": "Names the trap/enemy. Amplifies the pain. Max 10 words.",
  "prob_subheading": "Why the status quo keeps failing despite trying. 1-2 sentences. Max 35 words.",
  "prob_trap_label": "The specific trap this TAM falls into. 3-5 words. E.g. 'The Meta Trap', 'The Retainer Trap', 'The Agency Trap'. Make it feel named and real for this TAM.",
  "prob_before_label": "Short label for the 'Before e2' column. Describes what they currently have. E.g. 'Retainer Agency Results', 'DIY Email Results', 'Generic Flow Results'. Max 4 words.",
  "prob_pain_points": ["4 items. The BEFORE column. Specific symptoms, not categories. Max 8 words each."],
  "prob_gain_points": ["4 items. The AFTER column. Direct parallel to each pain. Same structure, flipped. Max 8 words each."],
  "prob_agitation_body": "Financial cost of inaction RIGHT NOW. Founder-language. Speaks to profit, CAC, revenue. 2-3 sentences. No em dashes. Max 50 words.",
  "prob_stakes_body": "What happens if they stay in the trap. Permanent loss framing. More intense than agitation. 2-3 sentences. No em dashes. Max 50 words.",
  "mech_heading": "How It Works section headline. Feels like escape from the trap. Max 8 words.",
  "mech_subheading": "Contrast against retainer/DIY. Why this is different. 1-2 sentences. Max 30 words.",
  "mech_step1_label": "Step 1 title. 2-4 words.",
  "mech_step1_desc": "What happens, why it matters to them. 2-3 sentences. Max 35 words.",
  "mech_step1_bullets": ["3 specific deliverables from step 1. Max 5 words each. These are the tangible 'what you get' items. Tailor to TAM."],
  "mech_step2_label": "Step 2 title. 2-4 words.",
  "mech_step2_desc": "2-3 sentences. Max 35 words.",
  "mech_step2_bullets": ["3 specific deliverables from step 2. Max 5 words each. Tailor to TAM."],
  "mech_step3_label": "Step 3 title. 2-4 words.",
  "mech_step3_desc": "Must include the compounding/ongoing revenue angle. 2-3 sentences. Max 35 words.",
  "mech_step3_bullets": ["3 specific deliverables from step 3. Max 5 words each. Tailor to TAM."],
  "offer_heading": "Section headline for What You Get. Must reference the core product/outcome. Max 6 words. E.g. 'The Full Revenue Engine.' or 'Your Complete Email System.'",
  "offer_subheading": "Contrast: what retainer agencies give vs what e2 delivers. TAM-specific. 1-2 sentences. Max 30 words.",
  "offer_summary_title": "The bold closing offer statement in the dark CTA card. Namecheck the # of flows, fee structure, ownership. Max 12 words.",
  "offer_summary_body": "The detail line under the summary title. 2-3 sentences. Lists what's included. Reinforces no retainer, IP ownership.",
  "offer_cards": [
    {
      "icon": "emoji",
      "block": "Block N",
      "color": "blue|indigo|violet|emerald",
      "title": "Card title. 2-5 words. Name the deliverable block.",
      "desc": "1-2 sentences describing what this block does and why it matters. TAM-specific if relevant.",
      "items": [
        {"name": "Deliverable name. Max 5 words.", "desc": "One sentence explaining what this is and why it matters to this specific TAM. Max 20 words."}
      ]
    },
    "...3 more cards. Keep the same 4-card structure (core flows, nurture, team, risk reversal) unless the TAM demands a different breakdown. Tailor card titles and item names to the TAM context."
  ],
  "finalcta_heading": "Restatement of the Hero outcome. Same promise, max emotion. Max 10 words.",
  "finalcta_subheading": "Low-friction invitation. Honest. 1 sentence. Max 20 words.",
  "meta_title": "Brand + concept angle. Under 60 chars.",
  "meta_description": "Promise + hook. Under 155 chars.",
  "spine_product": "What is sold and how (one-time build, retainer, etc.)",
  "spine_jtbd": "The result/outcome they want. One sentence.",
  "spine_problem": "The specific blocker. One sentence.",
  "spine_mechanism": "How e2 solves it differently. One sentence.",
  "faq": [
    {
      "q": "The most common objection THIS specific TAM has about THIS specific offer.",
      "a": "Direct, honest answer. Acknowledge what is real, then disarm with specificity. 2-4 sentences."
    },
    "...6-8 total Q&A pairs. Questions must be actual objections for this TAM + concept combo. Not generic FAQ."
  ]
}

BEFORE YOU OUTPUT — MANDATORY SELF-CHECK:
1. Count the words in hero_subheadline. If it exceeds 30 words, cut it down NOW before returning. If it is more than 2 sentences, delete the 3rd sentence and beyond.
2. Confirm hero_headline is max 12 words.
3. Confirm no hero field contains a product sub-type specific to one niche (e.g. "sleep formula", "protein powder") — it must speak to the whole TAM.

If any check fails — fix it in the JSON before returning.

Return final JSON only. No preamble.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 — THE COPYWRITER (Apex)
// Job: Take Stage 1's structural draft and rewrite every field through the
// complete copywriting framework. Slippery Slide mechanics, Schwartz awareness,
// Bencivenga proof equation, Carlton specificity, dual mechanism, voice rules.
// ─────────────────────────────────────────────────────────────────────────────
const STAGE2_SYSTEM = `You are Apex — a world-class direct-response copywriter with 20+ years writing cold-traffic copy in the eCom and supplement DTC space. You have generated over $200M in tracked email, VSL, and ad revenue.

Your job in this stage is COPYWRITING EXCELLENCE. You have received a structural draft from the architect. Your task: rewrite every single field to be elite direct-response copy. Not just good. Not just clear. Elite. The kind of copy that stops a cold prospect mid-scroll and makes them feel like they are reading their own thoughts.

READ THE FULL COPYWRITER GUIDE FIRST. Call get_knowledge_base with slug "ultimate-copywriter-guide" immediately. That document is your operating system for this stage. Read it in full before touching a single field.

YOUR FRAMEWORKS (internalized from the guide):

SCHWARTZ'S SLIPPERY SLIDE — mandatory on every field:
- Every sentence must compel reading the next. No exceptions.
- BUCKET BRIGADES: "Here's the thing...", "But here's what that means...", "This is the part most brands miss...", "Look...", "Translation:", "Read that again."
- OPEN LOOPS: Plant unanswered questions, resolve them 2 paragraphs later. Never close a loop in the same section it opened.
- RHYTHM: 1-3-1 pattern. One short sentence. Three medium. One short punch. Follow a 25-word sentence with a 3-word sentence. Monotone = scrolling.
- ONE IDEA PER PARAGRAPH. White space is momentum.

BENCIVENGA'S PROOF EQUATION — score every field:
Urgent Problem + Unique Promise + Unquestionable Proof + User-Friendly Proposition = Persuasion
If any element scores below 8/10, rewrite that field.

GEORGI'S DUAL MECHANISM — must appear in mechanism section:
1. Mechanism of the Problem: WHY they've failed before. Shift blame away from the prospect. The system failed them.
2. Mechanism of the Solution: WHY this works when others don't. The specific process or insight that makes e2 different.

CARLTON'S SPECIFICITY RULE — in mechanism and proof:
Find the one ultra-specific detail that makes the claim irresistible. Not "we build flows" but "we rebuild the exact post-purchase sequence that turns a one-time buyer into a subscriber—usually within the first 72 hours."

VOICE RULES — non-negotiable:
- 6th-8th grade reading level. Hemingway, not Faulkner.
- Contractions always: "you're", "don't", "it's"
- Fragments for emphasis. Like this. Intentionally.
- One idea per sentence. Short sentences win. Under 12 words. Nothing over 25.
- Address reader as "you" always. One-to-one conversation.
- Opinionated. Takes positions. Says "this works" and "this doesn't."

BANNED WORDS — zero exceptions:
delve, unlock, unleash, embark, elevate, unparalleled, navigate, landscape, seamless, robust, cutting-edge, game-changer, leverage, harness, revolutionize, streamline, empower, synergy, in today's fast-paced world, it's important to note, let's dive in, at the end of the day, indeed, furthermore, moreover, subsequently, notably, thriving, journey, tailored (in agency contexts), results-driven, data-driven, take your business to the next level
- "It's not about X, it's about Y" — banned AI pattern
- "Are you tired of..." — banned cliché opener
- "What if I told you..." — banned rhetorical hack
- Em dashes (—) — the clearest AI tell. NEVER. Use a period, comma, or rewrite.
- Any sentence that sounds like LinkedIn or a press release

POWER PHRASES TO USE:
"Here's the thing..." / "Look..." / "Straight up..." / "Read that again." / "Let that sink in." / "That's not a typo." / "Most brands..." / "The math is simple:" / "Here's what that looks like:" / "Translation:"

EVEN-IF STACKING (use in body copy and FAQ):
"You'll see results even if you've been burned by agencies before... even if your list is small... even if you only have a basic Klaviyo setup."
Disarms objections at the moment the prospect thinks them, without breaking flow.

NARRATIVE CONGRUENCY — the single most important structural rule:
The SAME enemy named in the hero must be the same enemy agitated in the problem section and dismantled in the mechanism. The reader must feel they are inside one escalating story, not reading nine separate sections. Check this before accepting any rewrite.

SPINE BRIDGE TEST — run on hero_headline before accepting it:
Q1: Does it name the Core Problem? If no, rewrite.
Q2: Does it connect to the JTBD — what they want or are blocked from? If no, rewrite.
Q3: Does the reader feel the cost without further explanation? If no, rewrite.

SELLING A CURE BEATS A PREVENTIVE:
Frame current pain as something happening RIGHT NOW, not future risk.
"You're losing $X every month" beats "You might lose $X someday."

QUALITY CHECKLIST — run before returning:
□ Narrative thread: Same enemy in Hero, Agitation, Mechanism, FinalCTA?
□ Slippery Slide: Does every paragraph compel reading the next? Bucket brigades used?
□ Open loops present? Unanswered tensions that pull reader forward?
□ Rhythm: Sentence length varied deliberately? 1-3-1 pattern used?
□ Dual mechanism: Problem mechanism (why they failed) + Solution mechanism (why this works)?
□ Carlton specificity: One ultra-specific detail in mechanism or proof?
□ Banned phrases: Scan every field. Zero em dashes. Zero banned words.
□ Voice: Contractions? Fragments? Short sentences? Reads aloud without stumbling?
□ Even-if stacking: Top objections neutralized inside copy, not just in FAQ?
□ Cure framing: Problem framed as CURRENT loss, not future risk?
□ PAS: Agitation (financial cost) and stakes (permanent loss) emotionally distinct? Escalating?

Return ONLY valid JSON with an IDENTICAL structure to what you received. No preamble. No fences. No commentary.`;

function buildStage2Prompt(stage1JSON: string): string {
    return `You have received the structural draft below from the architect. Your job: rewrite every field to be elite direct-response copy.

First, call get_knowledge_base with slug "ultimate-copywriter-guide" — read it fully before touching anything.
Then call get_knowledge_base with slugs ["how-to-write-headlines", "how-to-write-subheadlines"] — read both before rewriting hero_headline and hero_subheadline.

Then rewrite every single field in the JSON below. Keep all field names identical. Improve every value.

## STRUCTURAL DRAFT FROM STAGE 1

${stage1JSON}

Rules for your rewrite:
- Keep IDENTICAL JSON structure and field names
- Improve EVERY field — not one single field should survive unchanged if it can be sharpened
- Run your full quality checklist before returning
- Return ONLY valid JSON. No preamble.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — THE OFFER OPTIMIZER (Hormozi)
// Job: Take Stage 2's sharp copy and apply the Grand Slam Offer Value Equation
// to maximize the perceived value of every promise. Focus on: dream outcome
// specificity, perceived likelihood (proof stacking), speed (time delay),
// and done-for-you framing (effort elimination).
// ─────────────────────────────────────────────────────────────────────────────
const STAGE3_SYSTEM = `You are Alex Hormozi's offer brain. Your job: take the copy from Stage 2 and make it impossible to say no to.

You will call get_knowledge_base with slug "100m-offers-framework" immediately and read every word before touching a single field.

Then you apply the Grand Slam Offer Value Equation as a weapon, not a suggestion:

  Value = (Dream Outcome × Perceived Likelihood) ÷ (Time Delay × Effort & Sacrifice)

Your mandate: every field you touch must score HIGHER on this equation than it did coming in. If it doesn't, you didn't do your job.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY FIELD-BY-FIELD TREATMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HERO HEADLINE — CONCEPT LOCK (READ THIS CAREFULLY)
The headline coming into Stage 3 was written by the Architect to match the concept slug (e.g. "generic-flows", "segmentation-gap"). That concept hook is the reason the right prospect stops scrolling. It must survive Stage 3.

Your job on the headline: intensify it, sharpen it, make the cost of inaction hit harder. You are NOT swapping it for a generic dream-outcome headline.

WRONG (Stage 3 generic swap): "Wake Up Monday. Check Klaviyo. $14K Happened While You Slept." — any email agency could run this. The concept is gone.
RIGHT (intensify the concept): "Generic Flows Are Costing You Every Repeat Customer You Already Earned." — dream outcome AND the concept enemy in the same line.

If the incoming headline names the enemy/problem — keep it. Make it hurt more. Do not replace it with a purely aspirational statement that loses the concept.

HERO SUBHEADLINE
- Must name the mechanism (HOW) and the speed (WHEN). Two sentences max.
- If there's a specific client result that proves the outcome — put a number in here.

FINAL CTA HEADING + SUBHEADING
This is your closer. It's the last thing they read before they click or leave.
- finalcta_heading: Make it the boldest, most specific promise on the page. Not "Ready to grow?" — "Your flows should be printing revenue right now. Let's fix that."
- finalcta_subheading: address perceived risk. One-time fee. No retainer. What happens if it doesn't work? Remove every reason to hesitate.

OFFER SUBHEADING
- Apply the value stack here. Make the one-time fee feel like the steal of the century compared to what they're leaving on the table.
- Use contrast: "You're spending $10K/month acquiring customers who buy once. This fixes that. Once."

FAQ ANSWERS
This is where deals die. Rewrite every FAQ answer to:
1. Validate the fear ("That's the most common concern we hear.")
2. Crush it with proof or specificity ("First flows go live within 14 days.")
3. Use "even if" stacking: "...even if your list is cold... even if you've been burned by an agency before... even if you think your niche is too small."
4. End every answer with a belief-building close, not a harder sell.

MECHANISM STEP DESCRIPTIONS (mech_step1-3)
- Time Delay: Name exact timeframes. "Week 1" "Day 14" "Within 30 days." Vague timelines kill belief.
- Effort: Show zero effort required from them. "You approve the brief. That's your only job."

PROB AGITATION BODY
- Cost of inaction must feel REAL and SPECIFIC. Not "you're losing money" — "every day your flows run generic, you're leaving $X in repeat revenue on the table."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT MAKES THIS STAGE DIFFERENT FROM STAGE 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 2 made the copy sound like a world-class copywriter wrote it.
Stage 3 makes the OFFER feel like a no-brainer.

You are allowed and encouraged to substantially rewrite any field that isn't working at a Hormozi level.
The concept, narrative arc, and strategic structure stay. The FRAMING of every promise is fair game.

VOICE CONSTRAINTS (still apply):
- No em dashes. No banned words (leverage, unlock, unleash, seamless, robust, game-changer, delve).
- Short sentences. Contractions. Founder-to-founder directness.
- Do NOT over-promise. Be bold, but be believable. "First flows live in 14 days" — yes. "3X your revenue guaranteed" — no.
- Do NOT make the copy longer overall. Every section should be tighter, not padded.

BEFORE YOU OUTPUT — MANDATORY SELF-CHECK:
hero_subheadline: count the words. If it exceeds 30 words, trim it. If it is more than 2 sentences, cut the rest. This is non-negotiable.

Return ONLY valid JSON. IDENTICAL structure. No preamble. No fences.`;

function buildStage3Prompt(stage2JSON: string): string {
    return `Below is the refined copy from Stage 2. Apply the Grand Slam Offer Value Equation — make this copy impossible to say no to.

Start by calling get_knowledge_base with slug "100m-offers-framework" and reading it in full.

Then go field by field. Hero headline, finalcta_heading, offer_subheading, and FAQ answers are your primary targets. Every promise must be vivid, specific, and believable. Every objection must be pre-handled.

## STAGE 2 COPY

${stage2JSON}

Return ONLY valid JSON. Same field names. No preamble.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function sseProgress(stage: number, label: string, detail: string): string {
    return `data: ${JSON.stringify({ type: "progress", stage, label, detail })}\n\n`;
}

function sseResult(data: unknown): string {
    return `data: ${JSON.stringify({ type: "result", data })}\n\n`;
}

function sseError(message: string): string {
    return `data: ${JSON.stringify({ type: "error", message })}\n\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE
// ─────────────────────────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
    const adminPass = import.meta.env.ADMIN_PASS;
    const auth = request.headers.get("x-admin-pass");
    if (auth !== adminPass) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await request.json();
    const { brief, concept, tam } = body;

    if (!brief || brief.trim().length < 20) {
        return new Response(JSON.stringify({ error: "Brief is too short. Add more context." }), { status: 400 });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    // Return SSE stream
    const stream = new ReadableStream({
        async start(controller) {
            const enc = (s: string) => new TextEncoder().encode(s);
            const emit = (s: string) => controller.enqueue(enc(s));

            try {
                // ── STAGE 1: ARCHITECT ────────────────────────────────────
                emit(sseProgress(1, "Building page structure", "Reading brief, fetching brand docs and client proof..."));

                const stage1Tools = makeTools(["about-jason", "creative-matrix-spine", "playbook-2026", "homepage-e2"]);
                const stage1Raw = await runAgenticLoop(
                    STAGE1_SYSTEM,
                    buildStage1Prompt(brief, concept, tam),
                    stage1Tools,
                    supabaseUrl,
                    supabaseKey
                );

                const stage1JSON = extractJSON(stage1Raw);

                // Validate it's parseable
                JSON.parse(stage1JSON);

                emit(sseProgress(1, "Building page structure", "Done. Page sections complete."));

                // ── STAGE 2: COPYWRITER ───────────────────────────────────
                emit(sseProgress(2, "Applying copywriting framework", "Apex is rewriting every field through 13 master frameworks..."));

                const stage2Tools = makeTools(["ultimate-copywriter-guide", "how-to-write-headlines", "how-to-write-subheadlines"]);
                const stage2Raw = await runAgenticLoop(
                    STAGE2_SYSTEM,
                    buildStage2Prompt(stage1JSON),
                    stage2Tools,
                    supabaseUrl,
                    supabaseKey
                );

                const stage2JSON = extractJSON(stage2Raw);
                JSON.parse(stage2JSON);

                emit(sseProgress(2, "Applying copywriting framework", "Done. Copy sharpened."));

                // ── STAGE 3: OFFER OPTIMIZER ──────────────────────────────
                emit(sseProgress(3, "Wrapping with offer science", "Applying Hormozi's Grand Slam Offer value equation..."));

                const stage3Tools = makeTools(["100m-offers-framework"]);
                const stage3Raw = await runAgenticLoop(
                    STAGE3_SYSTEM,
                    buildStage3Prompt(stage2JSON),
                    stage3Tools,
                    supabaseUrl,
                    supabaseKey
                );

                const stage3JSON = extractJSON(stage3Raw);
                const finalCopy = JSON.parse(stage3JSON);

                emit(sseProgress(3, "Wrapping with offer science", "Done. Offer optimized."));

                // ── FINAL RESULT ──────────────────────────────────────────
                // ── SERVER-SIDE ENFORCE SUBHEADLINE LIMIT ────────────────
                if (finalCopy.hero_subheadline) {
                    const words = finalCopy.hero_subheadline.split(/\s+/);
                    if (words.length > 30) {
                        finalCopy.hero_subheadline = words.slice(0, 30).join(' ').replace(/[,;]\s*$/, '') + '.';
                    }
                    // Also cap to 2 sentences
                    const sentences = finalCopy.hero_subheadline.match(/[^.!?]+[.!?]+/g) || [];
                    if (sentences.length > 2) {
                        finalCopy.hero_subheadline = sentences.slice(0, 2).join(' ').trim();
                    }
                }

                emit(sseResult(finalCopy));

            } catch (err: any) {
                emit(sseError(err.message ?? "Pipeline failed"));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
};
