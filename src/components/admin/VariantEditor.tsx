import { useState, useEffect, useRef, useCallback } from "react";
import type { PageVariant } from "../../lib/supabase";

type Tab = "hero" | "problem" | "mechanism" | "offer" | "meta";

interface Product {
    id: string;
    slug: string;
    name: string;
    active: boolean;
}

interface Props {
    variant?: Partial<PageVariant>;
    adminPass: string;
    products?: Product[];
}

const FONT = "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─── Dark theme tokens ────────────────────────────────────────────────────────
const BG = "#0d0d0f";
const SURFACE = "#18181b";
const SURFACE2 = "#1f1f23";
const BORDER = "#2a2a2e";
const BORDER2 = "#333338";
const TEXT = "#f4f4f5";
const TEXT2 = "#a1a1aa";
const TEXT3 = "#52525b";
const ACCENT = "#818cf8"; // indigo-400
const ACCENT_DIM = "rgba(129,140,248,0.12)";
const GREEN = "#4ade80";
const GREEN_DIM = "rgba(74,222,128,0.12)";
const RED = "#f87171";

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    border: `1px solid ${BORDER2}`,
    borderRadius: "10px", fontSize: "14px", outline: "none",
    background: SURFACE2, boxSizing: "border-box", fontFamily: FONT,
    color: TEXT,
};

const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.09em", color: TEXT3, marginBottom: "6px",
    fontFamily: FONT,
};

const STYLE_ID = "manrope-inject";
function injectStyles() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        .ve-input::placeholder, .ve-textarea::placeholder { color: #3f3f46; opacity: 1; }
        .ve-input:focus, .ve-textarea:focus { border-color: ${ACCENT} !important; background: #202027 !important; }
        .ve-textarea { resize: vertical; line-height: 1.6; }
        .ve-save-indicator { font-size: 12px; font-family: ${FONT}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(129,140,248,0); }
            50% { box-shadow: 0 0 0 6px rgba(129,140,248,0.25); }
        }
        @keyframes pulsedot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.7); }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333338; border-radius: 3px; }
    `;
    document.head.appendChild(el);
}


const Field = ({ label, value, onChange, rows, hint, mono, placeholder }: {
    label: string; value: string; onChange: (v: string) => void;
    rows?: number; hint?: string; mono?: boolean; placeholder?: string;
}) => (
    <div style={{ marginBottom: "18px" }}>
        <label style={labelStyle}>{label}</label>
        {hint && <p style={{ fontSize: "11px", color: TEXT3, marginBottom: "6px", fontFamily: FONT }}>{hint}</p>}
        {rows ? (
            <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
                placeholder={placeholder} className="ve-textarea"
                style={{ ...inputStyle, fontFamily: mono ? "monospace" : FONT }} />
        ) : (
            <input value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} className="ve-input"
                style={{ ...inputStyle, fontFamily: mono ? "monospace" : FONT, fontSize: mono ? "13px" : "14px" }} />
        )}
    </div>
);

export default function VariantEditor({ variant, adminPass, products = [] }: Props) {
    useEffect(() => { injectStyles(); }, []);

    const isEdit = !!variant?.id;
    const draftKey = isEdit ? variant!.id! : "new";
    const slugify = (v: string) => v.toLowerCase().replace(/\s/g, "-").replace(/[^a-z0-9-]/g, "");

    // ── Meta / slug fields ────────────────────────────────────────────────────
    const [productSlug, setProductSlug] = useState((variant as any)?.product_slug ?? products[0]?.slug ?? "flows");
    const [concept, setConcept] = useState(variant?.concept ?? "");
    const [tam, setTam] = useState(variant?.tam ?? "");
    const [brief, setBrief] = useState(variant?.brief ?? "");

    // ── UI state ──────────────────────────────────────────────────────────────
    const [generated, setGenerated] = useState(isEdit);
    const [activeTab, setActiveTab] = useState<Tab>("hero");
    const [generating, setGenerating] = useState(false);
    const [generateStage, setGenerateStage] = useState<0 | 1 | 2 | 3>(0);
    const [stageDetail, setStageDetail] = useState("");
    const [genError, setGenError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");

    // ── Hero fields ───────────────────────────────────────────────────────────
    const [heroBadge, setHeroBadge] = useState(variant?.hero_badge ?? "");
    const [heroHeadline, setHeroHeadline] = useState(variant?.hero_headline ?? "");
    const [heroSub, setHeroSub] = useState(variant?.hero_subheadline ?? "");
    const [heroCtaP, setHeroCtaP] = useState(variant?.hero_cta_primary ?? "");
    const [heroCtaS, setHeroCtaS] = useState(variant?.hero_cta_secondary ?? "");

    // ── Problem fields ────────────────────────────────────────────────────────
    const [probHeading, setProbHeading] = useState(variant?.prob_heading ?? "");
    const [probSub, setProbSub] = useState(variant?.prob_subheading ?? "");
    const [pain, setPain] = useState((variant?.prob_pain_points ?? []).join("\n"));
    const [gain, setGain] = useState((variant?.prob_gain_points ?? []).join("\n"));
    const [probAgitation, setProbAgitation] = useState(variant?.prob_agitation_body ?? "");
    const [probStakes, setProbStakes] = useState(variant?.prob_stakes_body ?? "");

    // ── Mechanism fields ──────────────────────────────────────────────────────
    const [mechHeading, setMechHeading] = useState(variant?.mech_heading ?? "");
    const [mechSub, setMechSub] = useState(variant?.mech_subheading ?? "");
    const [mechStep1Label, setMechStep1Label] = useState(variant?.mech_step1_label ?? "");
    const [mechStep1Desc, setMechStep1Desc] = useState(variant?.mech_step1_desc ?? "");
    const [mechStep2Label, setMechStep2Label] = useState(variant?.mech_step2_label ?? "");
    const [mechStep2Desc, setMechStep2Desc] = useState(variant?.mech_step2_desc ?? "");
    const [mechStep3Label, setMechStep3Label] = useState(variant?.mech_step3_label ?? "");
    const [mechStep3Desc, setMechStep3Desc] = useState(variant?.mech_step3_desc ?? "");

    // ── Offer / FinalCTA fields ───────────────────────────────────────────────
    const [offerHeading, setOfferHeading] = useState(variant?.offer_heading ?? "");
    const [offerSub, setOfferSub] = useState(variant?.offer_subheading ?? "");
    const [offerSummaryTitle, setOfferSummaryTitle] = useState(variant?.offer_summary_title ?? "");
    const [offerSummaryBody, setOfferSummaryBody] = useState(variant?.offer_summary_body ?? "");
    const [offerCards, setOfferCards] = useState<any[]>(variant?.offer_cards ?? []);
    const [finalCtaHeading, setFinalCtaHeading] = useState(variant?.finalcta_heading ?? "");
    const [finalCtaSub, setFinalCtaSub] = useState(variant?.finalcta_subheading ?? "");
    const [probTrapLabel, setProbTrapLabel] = useState(variant?.prob_trap_label ?? "");
    const [probBeforeLabel, setProbBeforeLabel] = useState(variant?.prob_before_label ?? "");
    const [mechStep1Bullets, setMechStep1Bullets] = useState((variant?.mech_step1_bullets ?? []).join("\n"));
    const [mechStep2Bullets, setMechStep2Bullets] = useState((variant?.mech_step2_bullets ?? []).join("\n"));
    const [mechStep3Bullets, setMechStep3Bullets] = useState((variant?.mech_step3_bullets ?? []).join("\n"));

    // ── FAQ ───────────────────────────────────────────────────────────────────
    const [faq, setFaq] = useState<{ q: string; a: string }[]>(variant?.faq ?? []);

    // ── Meta / SPINE fields ───────────────────────────────────────────────────
    const [metaTitle, setMetaTitle] = useState(variant?.meta_title ?? "");
    const [metaDesc, setMetaDesc] = useState(variant?.meta_description ?? "");
    const [spineProduct, setSpineProduct] = useState(variant?.spine_product ?? "");
    const [spineJtbd, setSpineJtbd] = useState(variant?.spine_jtbd ?? "");
    const [spineProblem, setSpineProblem] = useState(variant?.spine_problem ?? "");
    const [spineMechanism, setSpineMechanism] = useState(variant?.spine_mechanism ?? "");

    // ── Load draft on mount ───────────────────────────────────────────────────
    useEffect(() => {
        fetch(`/api/drafts?key=${encodeURIComponent(draftKey)}`, {
            headers: { "x-admin-pass": adminPass },
        })
            .then(r => r.json())
            .then(d => {
                if (!d) return;
                if (d.brief) setBrief(d.brief);
                if (d.concept && !isEdit) setConcept(d.concept);
                if (d.tam && !isEdit) setTam(d.tam);
                const f = d.fields;
                if (f) {
                    if (f.hero_badge) setHeroBadge(f.hero_badge);
                    if (f.hero_headline) setHeroHeadline(f.hero_headline);
                    if (f.hero_subheadline) setHeroSub(f.hero_subheadline);
                    if (f.hero_cta_primary) setHeroCtaP(f.hero_cta_primary);
                    if (f.hero_cta_secondary) setHeroCtaS(f.hero_cta_secondary);
                    if (f.prob_heading) setProbHeading(f.prob_heading);
                    if (f.prob_subheading) setProbSub(f.prob_subheading);
                    if (f.prob_pain_points) setPain(f.prob_pain_points.join("\n"));
                    if (f.prob_gain_points) setGain(f.prob_gain_points.join("\n"));
                    if (f.prob_agitation_body) setProbAgitation(f.prob_agitation_body);
                    if (f.prob_stakes_body) setProbStakes(f.prob_stakes_body);
                    if (f.prob_trap_label) setProbTrapLabel(f.prob_trap_label);
                    if (f.prob_before_label) setProbBeforeLabel(f.prob_before_label);
                    if (f.mech_heading) setMechHeading(f.mech_heading);
                    if (f.mech_subheading) setMechSub(f.mech_subheading);
                    if (f.mech_step1_label) setMechStep1Label(f.mech_step1_label);
                    if (f.mech_step1_desc) setMechStep1Desc(f.mech_step1_desc);
                    if (f.mech_step1_bullets) setMechStep1Bullets(f.mech_step1_bullets.join("\n"));
                    if (f.mech_step2_label) setMechStep2Label(f.mech_step2_label);
                    if (f.mech_step2_desc) setMechStep2Desc(f.mech_step2_desc);
                    if (f.mech_step2_bullets) setMechStep2Bullets(f.mech_step2_bullets.join("\n"));
                    if (f.mech_step3_label) setMechStep3Label(f.mech_step3_label);
                    if (f.mech_step3_desc) setMechStep3Desc(f.mech_step3_desc);
                    if (f.mech_step3_bullets) setMechStep3Bullets(f.mech_step3_bullets.join("\n"));
                    if (f.offer_heading) setOfferHeading(f.offer_heading);
                    if (f.offer_subheading) setOfferSub(f.offer_subheading);
                    if (f.offer_summary_title) setOfferSummaryTitle(f.offer_summary_title);
                    if (f.offer_summary_body) setOfferSummaryBody(f.offer_summary_body);
                    if (f.offer_cards && Array.isArray(f.offer_cards)) setOfferCards(f.offer_cards);
                    if (f.finalcta_heading) setFinalCtaHeading(f.finalcta_heading);
                    if (f.finalcta_subheading) setFinalCtaSub(f.finalcta_subheading);
                    if (f.faq && Array.isArray(f.faq) && f.faq.length > 0) setFaq(f.faq);
                    if (f.meta_title) setMetaTitle(f.meta_title);
                    if (f.meta_description) setMetaDesc(f.meta_description);
                    if (f.spine_product) setSpineProduct(f.spine_product);
                    if (f.spine_jtbd) setSpineJtbd(f.spine_jtbd);
                    if (f.spine_problem) setSpineProblem(f.spine_problem);
                    if (f.spine_mechanism) setSpineMechanism(f.spine_mechanism);
                    setGenerated(true);
                }
            })
            .catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const latestRef = useRef({ brief, concept, tam });
    useEffect(() => { latestRef.current = { brief, concept, tam }; }, [brief, concept, tam]);

    const buildPayload = useCallback(() => ({
        brief, concept, tam, product_slug: productSlug,
        spine_product: spineProduct, spine_jtbd: spineJtbd,
        spine_problem: spineProblem, spine_mechanism: spineMechanism,
        hero_badge: heroBadge, hero_headline: heroHeadline,
        hero_subheadline: heroSub, hero_cta_primary: heroCtaP, hero_cta_secondary: heroCtaS,
        prob_heading: probHeading, prob_subheading: probSub,
        prob_trap_label: probTrapLabel, prob_before_label: probBeforeLabel,
        prob_pain_points: pain.split("\n").map(s => s.trim()).filter(Boolean),
        prob_gain_points: gain.split("\n").map(s => s.trim()).filter(Boolean),
        prob_agitation_body: probAgitation,
        prob_stakes_body: probStakes,
        mech_heading: mechHeading, mech_subheading: mechSub,
        mech_step1_label: mechStep1Label, mech_step1_desc: mechStep1Desc,
        mech_step1_bullets: mechStep1Bullets.split("\n").map(s => s.trim()).filter(Boolean),
        mech_step2_label: mechStep2Label, mech_step2_desc: mechStep2Desc,
        mech_step2_bullets: mechStep2Bullets.split("\n").map(s => s.trim()).filter(Boolean),
        mech_step3_label: mechStep3Label, mech_step3_desc: mechStep3Desc,
        mech_step3_bullets: mechStep3Bullets.split("\n").map(s => s.trim()).filter(Boolean),
        offer_heading: offerHeading, offer_subheading: offerSub,
        offer_summary_title: offerSummaryTitle, offer_summary_body: offerSummaryBody,
        offer_cards: offerCards,
        finalcta_heading: finalCtaHeading, finalcta_subheading: finalCtaSub,
        faq,
        meta_title: metaTitle, meta_description: metaDesc,
    }), [brief, concept, tam, productSlug, spineProduct, spineJtbd, spineProblem, spineMechanism,
        heroBadge, heroHeadline, heroSub, heroCtaP, heroCtaS,
        probHeading, probSub, probTrapLabel, probBeforeLabel, pain, gain, probAgitation, probStakes,
        mechHeading, mechSub, mechStep1Label, mechStep1Desc, mechStep1Bullets,
        mechStep2Label, mechStep2Desc, mechStep2Bullets, mechStep3Label, mechStep3Desc, mechStep3Bullets,
        offerHeading, offerSub, offerSummaryTitle, offerSummaryBody, offerCards,
        finalCtaHeading, finalCtaSub, faq, metaTitle, metaDesc]);

    const saveDraft = useCallback((fields?: ReturnType<typeof buildPayload>) => {
        const { brief: b, concept: c, tam: t } = latestRef.current;
        setDraftStatus("saving");
        return fetch("/api/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
            body: JSON.stringify({ draft_key: draftKey, brief: b, concept: c, tam: t, fields: fields ?? null }),
        }).then(r => {
            if (r.ok) {
                setDraftStatus("saved");
                setTimeout(() => setDraftStatus("idle"), 2000);
            } else {
                setDraftStatus("idle");
            }
        }).catch(() => {
            setDraftStatus("idle");
        });
    }, [adminPass, draftKey]);

    const doSave = useCallback(async (payload: ReturnType<typeof buildPayload>) => {
        setSaveStatus("saving");
        const res = await fetch(isEdit ? `/api/variants/${variant!.id}` : "/api/variants", {
            method: isEdit ? "PUT" : "POST",
            headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
            setSaveStatus("error");
        }
    }, [isEdit, variant, adminPass]);

    const allValues = [brief, heroBadge, heroHeadline, heroSub, heroCtaP, heroCtaS,
        probHeading, probSub, probTrapLabel, probBeforeLabel, pain, gain, probAgitation, probStakes,
        mechHeading, mechSub, mechStep1Label, mechStep1Desc, mechStep1Bullets,
        mechStep2Label, mechStep2Desc, mechStep2Bullets, mechStep3Label, mechStep3Desc, mechStep3Bullets,
        offerHeading, offerSub, offerSummaryTitle, offerSummaryBody, JSON.stringify(offerCards),
        finalCtaHeading, finalCtaSub, JSON.stringify(faq), metaTitle, metaDesc,
        spineProduct, spineJtbd, spineProblem, spineMechanism, productSlug];

    const initializedRef = useRef(false);
    useEffect(() => {
        if (!isEdit || !generated) return;
        if (!initializedRef.current) { initializedRef.current = true; return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            doSave(buildPayload());
        }, 1200);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, allValues);

    const draftInitRef = useRef(false);
    useEffect(() => {
        if (!draftInitRef.current) { draftInitRef.current = true; return; }
        if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
        draftDebounceRef.current = setTimeout(() => {
            saveDraft(generated ? buildPayload() : undefined);
        }, 400);
        return () => { if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brief, concept, tam, ...allValues]);

    useEffect(() => {
        const flush = () => {
            const { brief: b, concept: c, tam: t } = latestRef.current;
            const payload = JSON.stringify({
                draft_key: draftKey,
                brief: b, concept: c, tam: t,
                fields: null,
            });
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon(`/api/drafts-beacon?pass=${encodeURIComponent(adminPass)}`, blob);
        };
        window.addEventListener("beforeunload", flush);
        return () => window.removeEventListener("beforeunload", flush);
    }, [draftKey, adminPass]);

    const handleGenerate = async () => {
        setGenerating(true);
        setGenerateStage(0);
        setStageDetail("");
        setGenError(null);

        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
                body: JSON.stringify({ brief, concept, tam, product_slug: productSlug }),
            });

            if (!res.ok) {
                const j = await res.json();
                setGenError(j.error ?? "Generation failed");
                setGenerating(false);
                return;
            }

            if (!res.body) { setGenError("No stream received"); setGenerating(false); return; }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const raw = line.slice(6).trim();
                    if (!raw) continue;
                    let msg: any;
                    try { msg = JSON.parse(raw); } catch { continue; }

                    if (msg.type === "progress") {
                        setGenerateStage(msg.stage as 1 | 2 | 3);
                        setStageDetail(msg.detail ?? msg.label);
                    } else if (msg.type === "result") {
                        const json = msg.data;
                        setHeroBadge(json.hero_badge ?? "");
                        setHeroHeadline(json.hero_headline ?? "");
                        setHeroSub(json.hero_subheadline ?? "");
                        setHeroCtaP(json.hero_cta_primary ?? "");
                        setHeroCtaS(json.hero_cta_secondary ?? "");
                        setProbHeading(json.prob_heading ?? "");
                        setProbSub(json.prob_subheading ?? "");
                        setPain((json.prob_pain_points ?? []).join("\n"));
                        setGain((json.prob_gain_points ?? []).join("\n"));
                        setProbAgitation(json.prob_agitation_body ?? "");
                        setProbStakes(json.prob_stakes_body ?? "");
                        setMechHeading(json.mech_heading ?? "");
                        setMechSub(json.mech_subheading ?? "");
                        setMechStep1Label(json.mech_step1_label ?? "");
                        setMechStep1Desc(json.mech_step1_desc ?? "");
                        setMechStep2Label(json.mech_step2_label ?? "");
                        setMechStep2Desc(json.mech_step2_desc ?? "");
                        setMechStep3Label(json.mech_step3_label ?? "");
                        setMechStep3Desc(json.mech_step3_desc ?? "");
                        setMechStep1Bullets((json.mech_step1_bullets ?? []).join("\n"));
                        setMechStep2Bullets((json.mech_step2_bullets ?? []).join("\n"));
                        setMechStep3Bullets((json.mech_step3_bullets ?? []).join("\n"));
                        setOfferHeading(json.offer_heading ?? "");
                        setOfferSub(json.offer_subheading ?? "");
                        setOfferSummaryTitle(json.offer_summary_title ?? "");
                        setOfferSummaryBody(json.offer_summary_body ?? "");
                        if (Array.isArray(json.offer_cards)) setOfferCards(json.offer_cards);
                        setProbTrapLabel(json.prob_trap_label ?? "");
                        setProbBeforeLabel(json.prob_before_label ?? "");
                        setFinalCtaHeading(json.finalcta_heading ?? "");
                        setFinalCtaSub(json.finalcta_subheading ?? "");
                        if (Array.isArray(json.faq) && json.faq.length > 0) setFaq(json.faq);
                        setMetaTitle(json.meta_title ?? "");
                        setMetaDesc(json.meta_description ?? "");
                        setSpineProduct(json.spine_product ?? "");
                        setSpineJtbd(json.spine_jtbd ?? "");
                        setSpineProblem(json.spine_problem ?? "");
                        setSpineMechanism(json.spine_mechanism ?? "");
                        setGenerated(true);
                        setActiveTab("hero");
                    } else if (msg.type === "error") {
                        setGenError(msg.message ?? "Generation failed");
                    }
                }
            }
        } catch (err: any) {
            setGenError(err.message ?? "Network error");
        } finally {
            setGenerating(false);
            setGenerateStage(0);
        }
    };

    const handlePublish = async () => {
        setSaving(true);
        const res = await fetch("/api/variants", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-pass": adminPass },
            body: JSON.stringify(buildPayload()),
        });
        setSaving(false);
        if (res.ok) {
            fetch(`/api/drafts?key=${encodeURIComponent(draftKey)}`, {
                method: "DELETE", headers: { "x-admin-pass": adminPass },
            }).catch(() => { });
            setTimeout(() => { window.location.href = "/admin"; }, 700);
        }
        else { const j = await res.json(); alert(j.error ?? "Save failed"); }
    };

    const saveIndicator = saveStatus === "saving" ? "⏳ Saving…"
        : saveStatus === "saved" ? "✓ Saved"
            : saveStatus === "error" ? "⚠ Save failed"
                : draftStatus === "saving" ? "⏳ Drafting…"
                    : draftStatus === "saved" ? "✓ Draft saved" : "";

    const tabs: { id: Tab; label: string }[] = [
        { id: "hero", label: "🎯 Hero" },
        { id: "problem", label: "⚡ Problem" },
        { id: "mechanism", label: "⚙️ Mechanism" },
        { id: "offer", label: "💰 Offer & CTA" },
        { id: "meta", label: "🔍 Meta" },
    ];

    // ── Shared card style ─────────────────────────────────────────────────────
    const card: React.CSSProperties = {
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: "16px",
        padding: "28px",
        marginBottom: "16px",
    };

    return (
        <div style={{ maxWidth: "820px", margin: "0 auto", padding: "32px 24px", fontFamily: FONT, background: BG, minHeight: "100vh" }}>
            {/* Header */}
            <div style={{ marginBottom: "32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <a href="/admin" style={{ fontSize: "13px", color: TEXT3, textDecoration: "none", fontFamily: FONT }}>← All variants</a>
                    <h1 style={{ fontSize: "24px", fontWeight: 800, marginTop: "10px", color: TEXT, fontFamily: FONT }}>
                        {isEdit ? `Editing: /${concept}/${tam}` : "New Variant"}
                    </h1>
                </div>
                {isEdit && saveIndicator && (
                    <span className="ve-save-indicator" style={{
                        color: saveStatus === "saved" ? GREEN : saveStatus === "error" ? RED : TEXT3,
                        fontWeight: 600,
                    }}>{saveIndicator}</span>
                )}
            </div>

            {/* ── Product selector ── */}
            {!isEdit && products.length > 0 && (
                <div style={card}>
                    <h2 style={{ fontSize: "11px", fontWeight: 800, marginBottom: "4px", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.08em", color: ACCENT }}>
                        Product
                    </h2>
                    <p style={{ fontSize: "13px", color: TEXT2, marginBottom: "18px", fontFamily: FONT }}>
                        Pick the product you're writing copy for. Claude reads its full description before generating.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                        {products.map(p => (
                            <button
                                key={p.slug}
                                onClick={() => setProductSlug(p.slug)}
                                style={{
                                    padding: "14px 16px",
                                    border: productSlug === p.slug ? `2px solid ${ACCENT}` : `1px solid ${BORDER2}`,
                                    borderRadius: "12px",
                                    background: productSlug === p.slug ? ACCENT_DIM : SURFACE2,
                                    cursor: "pointer", textAlign: "left", fontFamily: FONT,
                                    transition: "all 0.15s",
                                }}
                            >
                                <div style={{ fontSize: "14px", fontWeight: 700, color: productSlug === p.slug ? ACCENT : TEXT, marginBottom: "3px" }}>{p.name}</div>
                                <div style={{ fontSize: "11px", color: TEXT3, fontFamily: "monospace" }}>{p.slug}</div>
                            </button>
                        ))}
                    </div>
                    {productSlug && (
                        <p style={{ marginTop: "12px", fontSize: "11px", color: TEXT3, fontFamily: FONT }}>
                            Selected: <code style={{ background: SURFACE2, padding: "2px 7px", borderRadius: "5px", color: ACCENT }}>{productSlug}</code>
                        </p>
                    )}
                </div>
            )}

            {/* ── STEP 1: Brief ── */}
            <div style={card}>
                <h2 style={{ fontSize: "11px", fontWeight: 800, marginBottom: "4px", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.08em", color: ACCENT }}>
                    {isEdit ? "Regenerate from brief" : "Step 1 — Brief"}
                </h2>
                <p style={{ fontSize: "13px", color: TEXT2, marginBottom: "20px", fontFamily: FONT }}>
                    Paste anything — SPINE notes, Creative Matrix output, ad copy, raw ideas.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <Field label="Concept slug" value={concept} onChange={v => setConcept(slugify(v))} placeholder="unique-flows" mono />
                    <Field label="TAM slug" value={tam} onChange={v => setTam(slugify(v))} placeholder="supplements" mono />
                </div>
                {concept && tam && (
                    <p style={{ fontSize: "12px", color: TEXT3, marginBottom: "16px", fontFamily: FONT }}>
                        URL: <code style={{ background: SURFACE2, padding: "2px 6px", borderRadius: "4px", color: TEXT2 }}>/{concept}/{tam}</code>
                    </p>
                )}

                <textarea
                    value={brief}
                    onChange={e => setBrief(e.target.value)}
                    rows={12}
                    className="ve-textarea"
                    placeholder={`Dump everything here:\n\n• Creative Matrix output\n• SPINE: product, JTBD, problem, mechanism\n• The specific ad hook / UMOP\n• TAM desires and pain points\n• Raw notes, bullet points, anything\n\nClaude reads it all and writes the whole page.`}
                    style={{ ...inputStyle, fontSize: "14px", fontFamily: FONT }}
                />

                {/* Generate button */}
                <button
                    onClick={handleGenerate}
                    disabled={generating || brief.trim().length < 20 || !concept || !tam}
                    style={{
                        marginTop: "16px", padding: "13px 28px",
                        background: generating ? SURFACE2 : ACCENT,
                        color: generating ? TEXT2 : "#0d0d0f",
                        border: `1px solid ${generating ? BORDER2 : ACCENT}`,
                        borderRadius: "10px",
                        fontSize: "14px", fontWeight: 800, cursor: generating ? "default" : "pointer",
                        opacity: brief.trim().length < 20 || !concept || !tam ? 0.35 : 1,
                        display: "flex", alignItems: "center", gap: "8px",
                        fontFamily: FONT, transition: "opacity 0.2s, background 0.2s",
                        letterSpacing: "0.01em",
                    }}
                >
                    <span style={{ display: "inline-block", animation: generating ? "spin 1.2s linear infinite" : "none" }}>✦</span>
                    {generating ? "Running pipeline…" : generated ? "Regenerate" : "Generate with Claude →"}
                </button>

                {/* 3-stage progress indicator */}
                {generating && (
                    <div style={{
                        marginTop: "20px", padding: "20px 24px",
                        background: SURFACE2, border: `1px solid ${BORDER}`,
                        borderRadius: "14px", fontFamily: FONT,
                    }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0", marginBottom: "16px" }}>
                            {[
                                { n: 1, label: "Architect", sublabel: "Brief → structure" },
                                { n: 2, label: "Copywriter", sublabel: "13 frameworks" },
                                { n: 3, label: "Offer Optimizer", sublabel: "Hormozi wrap" },
                            ].map(({ n, label, sublabel }, i) => {
                                const isActive = generateStage === n;
                                const isDone = generateStage > n;
                                const isPending = generateStage < n;
                                return (
                                    <div key={n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                                            <div style={{
                                                width: "32px", height: "32px", borderRadius: "50%",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: "12px", fontWeight: 700, lineHeight: 1,
                                                background: isDone ? GREEN_DIM : isActive ? ACCENT_DIM : SURFACE,
                                                color: isDone ? GREEN : isActive ? ACCENT : TEXT3,
                                                border: `1px solid ${isDone ? GREEN : isActive ? ACCENT : BORDER2}`,
                                                transition: "all 0.3s",
                                                animation: isActive ? "pulse-glow 1.5s ease-in-out infinite" : "none",
                                                flexShrink: 0,
                                            }}>
                                                {isDone ? "✓" : n}
                                            </div>
                                            <div style={{ marginTop: "6px", textAlign: "center" }}>
                                                <div style={{ fontSize: "11px", fontWeight: 700, color: isActive ? TEXT : isPending ? TEXT3 : TEXT2, letterSpacing: "0.02em" }}>{label}</div>
                                                <div style={{ fontSize: "10px", color: TEXT3, marginTop: "1px" }}>{sublabel}</div>
                                            </div>
                                        </div>
                                        {i < 2 && (
                                            <div style={{
                                                height: "1px", flex: "0 0 24px", margin: "0 0 22px",
                                                background: isDone ? GREEN : BORDER2,
                                                transition: "background 0.3s",
                                            }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {stageDetail && (
                            <p style={{
                                fontSize: "12px", color: TEXT2, margin: 0,
                                paddingTop: "12px", borderTop: `1px solid ${BORDER}`,
                                display: "flex", alignItems: "center", gap: "8px",
                            }}>
                                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: ACCENT, animation: "pulsedot 1s ease-in-out infinite", flexShrink: 0 }} />
                                {stageDetail}
                            </p>
                        )}
                    </div>
                )}

                {genError && <p style={{ marginTop: "10px", fontSize: "13px", color: RED, fontFamily: FONT }}>{genError}</p>}
            </div>

            {/* ── STEP 2: Review ── */}
            {generated && (
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", background: SURFACE }}>
                    <div style={{ background: SURFACE2, borderBottom: `1px solid ${BORDER}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                {isEdit && (
                                    <span style={{
                                        display: "inline-flex", alignItems: "center", gap: "5px",
                                        padding: "3px 10px", borderRadius: "20px",
                                        background: GREEN_DIM, color: GREEN,
                                        fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
                                        fontFamily: FONT,
                                    }}>
                                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: GREEN, display: "inline-block" }} />
                                        LIVE
                                    </span>
                                )}
                                <h2 style={{ fontSize: "11px", fontWeight: 800, marginBottom: "2px", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.08em", color: ACCENT }}>
                                    {isEdit ? "Edit fields" : "Step 2 — Review & edit"}
                                </h2>
                            </div>
                            <p style={{ fontSize: "12px", color: TEXT3, fontFamily: FONT }}>
                                {isEdit ? "Changes auto-save as you type." : "Claude wrote this. Change anything before publishing."}
                            </p>
                        </div>
                        {isEdit && saveIndicator && (
                            <span className="ve-save-indicator" style={{
                                color: saveStatus === "saved" ? GREEN : saveStatus === "error" ? RED : TEXT3,
                                fontWeight: 600,
                            }}>{saveIndicator}</span>
                        )}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, background: SURFACE, overflowX: "auto" }}>
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                                padding: "12px 18px", border: "none", background: "none", cursor: "pointer",
                                fontSize: "13px", fontWeight: activeTab === t.id ? 700 : 500,
                                color: activeTab === t.id ? TEXT : TEXT3,
                                borderBottom: activeTab === t.id ? `2px solid ${ACCENT}` : "2px solid transparent",
                                marginBottom: "-1px", fontFamily: FONT, whiteSpace: "nowrap",
                                transition: "color 0.15s",
                            }}>{t.label}</button>
                        ))}
                    </div>

                    <div style={{ background: SURFACE, padding: "28px" }}>

                        {/* ── Hero tab ── */}
                        {activeTab === "hero" && (
                            <>
                                <Field label="Badge" value={heroBadge} onChange={setHeroBadge} placeholder="2 Spots Left — Intake Closes Friday" />
                                <Field label="Headline" value={heroHeadline} onChange={setHeroHeadline} rows={2} placeholder="Generic Flows Are Why You're Still Addicted to Ads." />
                                <Field label="Subheadline" value={heroSub} onChange={setHeroSub} rows={3} placeholder="We build flows around your unique formulation, not Klaviyo templates." />
                                <Field label="Primary CTA" value={heroCtaP} onChange={setHeroCtaP} placeholder="See If You Qualify →" />
                                <Field label="Secondary CTA" value={heroCtaS} onChange={setHeroCtaS} placeholder="How It Works" />
                            </>
                        )}

                        {/* ── Problem tab ── */}
                        {activeTab === "problem" && (
                            <>
                                <Field label="Section heading" value={probHeading} onChange={setProbHeading} rows={2} placeholder='Generic Flows Are Killing Your Repeat Purchase Rate' />
                                <Field label="Section subheading" value={probSub} onChange={setProbSub} rows={2} placeholder="You spent real money getting that customer. But generic flows forget your product exists." />
                                <Field label='Pain points ("Before" column)' value={pain} onChange={setPain} rows={5} hint="One item per line." placeholder={"Same 'thanks for your order' every brand sends\nPost-purchase flow ignores why they bought\nUnique formulation buried under generic template\nBuyers disappear after first purchase"} />
                                <Field label='Gain points ("After" column)' value={gain} onChange={setGain} rows={5} hint="One item per line." placeholder={"First email speaks to your product and their pain\nEvery flow beat references why they actually bought\nYour formulation drives every single message\nBuyers return because the flow gave them a reason"} />
                                <Field label="Agitation paragraph" value={probAgitation} onChange={setProbAgitation} rows={4} hint="Financial cost of inaction now. Profit, CAC, revenue — not email metrics." placeholder="Every month of generic flows is another cohort of buyers who'll never come back..." />
                                <Field label="Stakes callout" value={probStakes} onChange={setProbStakes} rows={3} hint="What happens if they don't act. Permanent loss framing — more intense than agitation." placeholder="The longer this stays broken, the more expensive acquisition becomes..." />
                            </>
                        )}

                        {/* ── Mechanism tab ── */}
                        {activeTab === "mechanism" && (
                            <>
                                <Field label="Section heading" value={mechHeading} onChange={setMechHeading} rows={2} placeholder="How We Build Flows That Actually Convert" />
                                <Field label="Section subheading" value={mechSub} onChange={setMechSub} rows={2} placeholder="Not retainer-style maintenance. A one-time build engineered around your product." />
                                {[
                                    { n: 1, label: mechStep1Label, setLabel: setMechStep1Label, desc: mechStep1Desc, setDesc: setMechStep1Desc },
                                    { n: 2, label: mechStep2Label, setLabel: setMechStep2Label, desc: mechStep2Desc, setDesc: setMechStep2Desc },
                                    { n: 3, label: mechStep3Label, setLabel: setMechStep3Label, desc: mechStep3Desc, setDesc: setMechStep3Desc },
                                ].map(({ n, label, setLabel, desc, setDesc }) => (
                                    <div key={n} style={{ border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "18px", marginBottom: "18px", background: SURFACE2 }}>
                                        <p style={{ ...labelStyle, marginBottom: "14px", color: ACCENT }}>Step {n}</p>
                                        <Field label="Label" value={label} onChange={setLabel} placeholder="Diagnostic Call" />
                                        <Field label="Description" value={desc} onChange={setDesc} rows={3} placeholder="We map your product, your customer's pain, and what they need to hear to buy again." />
                                    </div>
                                ))}
                            </>
                        )}

                        {/* ── Offer & CTA tab ── */}
                        {activeTab === "offer" && (
                            <>
                                <Field label="Offer subheading" value={offerSub} onChange={setOfferSub} rows={3} placeholder="Other agencies sell retainers. We build your flows once, hand them over, and they run forever." />
                                <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: "8px", paddingTop: "24px" }}>
                                    <p style={{ ...labelStyle, marginBottom: "14px", color: TEXT2 }}>Final CTA Section</p>
                                    <Field label="Heading" value={finalCtaHeading} onChange={setFinalCtaHeading} rows={2} placeholder="Start Printing Revenue From Email. Without More Ad Spend." />
                                    <Field label="Subheading" value={finalCtaSub} onChange={setFinalCtaSub} rows={2} placeholder="See if your brand qualifies for the flow buildout." />
                                </div>
                                <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: "8px", paddingTop: "24px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                        <p style={{ ...labelStyle, color: TEXT2, margin: 0 }}>FAQ ({faq.length} questions)</p>
                                        <button
                                            onClick={() => setFaq(prev => [...prev, { q: "", a: "" }])}
                                            style={{ fontSize: "12px", fontWeight: 700, color: ACCENT, background: ACCENT_DIM, border: `1px solid ${ACCENT}26`, borderRadius: "8px", padding: "5px 12px", cursor: "pointer", fontFamily: FONT }}
                                        >+ Add question</button>
                                    </div>
                                    {faq.length === 0 && (
                                        <p style={{ fontSize: "13px", color: TEXT3, fontFamily: FONT, textAlign: "center", padding: "20px" }}>
                                            Generate copy first — Claude will write brief-specific FAQs automatically.
                                        </p>
                                    )}
                                    {faq.map((item, i) => (
                                        <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "16px", marginBottom: "12px", background: SURFACE2 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                                                <p style={{ ...labelStyle, color: ACCENT, margin: 0 }}>Q{i + 1}</p>
                                                <button
                                                    onClick={() => setFaq(prev => prev.filter((_, idx) => idx !== i))}
                                                    style={{ fontSize: "11px", color: RED, background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontWeight: 600 }}
                                                >✕ Remove</button>
                                            </div>
                                            <div style={{ marginBottom: "10px" }}>
                                                <label style={labelStyle}>Question</label>
                                                <input
                                                    value={item.q}
                                                    onChange={e => setFaq(prev => prev.map((x, idx) => idx === i ? { ...x, q: e.target.value } : x))}
                                                    placeholder="What objection does this TAM have?"
                                                    className="ve-input"
                                                    style={{ ...inputStyle, fontFamily: FONT }}
                                                />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Answer</label>
                                                <textarea
                                                    value={item.a}
                                                    onChange={e => setFaq(prev => prev.map((x, idx) => idx === i ? { ...x, a: e.target.value } : x))}
                                                    rows={3}
                                                    placeholder="Direct, honest answer that disarms the objection..."
                                                    className="ve-textarea"
                                                    style={{ ...inputStyle, fontFamily: FONT }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── Meta tab ── */}
                        {activeTab === "meta" && (
                            <>
                                <Field label="Page title" value={metaTitle} onChange={setMetaTitle} placeholder="e2 Agency — Supplement Email Flows That Print Revenue" />
                                <Field label="Meta description" value={metaDesc} onChange={setMetaDesc} rows={3} placeholder="Stop running ads to customers you already won. Get flows built around your formulation." />
                                <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: "8px", paddingTop: "24px" }}>
                                    <p style={{ ...labelStyle, marginBottom: "14px", color: TEXT2 }}>SPINE Summary (AI reference)</p>
                                    <Field label="Product" value={spineProduct} onChange={setSpineProduct} placeholder="Flow buildout, one-time fee" />
                                    <Field label="JTBD" value={spineJtbd} onChange={setSpineJtbd} placeholder="Automated revenue without more ad spend" />
                                    <Field label="Core Problem" value={spineProblem} onChange={setSpineProblem} placeholder="Generic flows don't connect with why the customer bought" />
                                    <Field label="Mechanism" value={spineMechanism} onChange={setSpineMechanism} placeholder="Flows built around unique product and customer pain" />
                                </div>
                                <div style={{ marginTop: "8px", padding: "14px", background: SURFACE2, borderRadius: "10px", border: `1px solid ${BORDER}` }}>
                                    <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: TEXT3, marginBottom: "6px", fontFamily: FONT }}>Live URL</p>
                                    <code style={{ fontSize: "13px", color: TEXT2, fontFamily: "monospace" }}>/{productSlug}/{concept}/{tam}</code>{" "}
                                    <a href={`/${productSlug}/${concept}/${tam}`} target="_blank" style={{ fontSize: "12px", color: ACCENT, textDecoration: "none", fontFamily: FONT }}>Open ↗</a>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!isEdit && (
                        <div style={{ padding: "20px 28px", borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "12px", background: SURFACE2 }}>
                            <button onClick={handlePublish} disabled={saving} style={{
                                padding: "12px 28px", background: ACCENT,
                                color: "#0d0d0f", border: "none", borderRadius: "10px",
                                fontSize: "14px", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
                                fontFamily: FONT, letterSpacing: "0.01em",
                            }}>
                                {saving ? "Publishing…" : "Publish variant →"}
                            </button>
                            <a href="/admin" style={{ fontSize: "13px", color: TEXT3, textDecoration: "none", fontFamily: FONT }}>Cancel</a>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                body { background: ${BG}; }
            `}</style>
        </div>
    );
}
