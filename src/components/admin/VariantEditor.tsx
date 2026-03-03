import { useState, useEffect, useRef, useCallback } from "react";
import type { PageVariant } from "../../lib/supabase";

type Tab = "hero" | "problem" | "mechanism" | "offer" | "meta";

interface Props {
    variant?: Partial<PageVariant>;
    adminPass: string;
}

const FONT = "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb",
    borderRadius: "10px", fontSize: "14px", outline: "none",
    background: "#fafafa", boxSizing: "border-box", fontFamily: FONT,
    color: "#111",
};

const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.09em", color: "#9ca3af", marginBottom: "6px",
    fontFamily: FONT,
};

const STYLE_ID = "manrope-inject";
function injectStyles() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        .ve-input::placeholder, .ve-textarea::placeholder { color: #d1d5db; opacity: 1; }
        .ve-input:focus, .ve-textarea:focus { border-color: #6366f1; background: #fff; }
        .ve-textarea { resize: vertical; line-height: 1.6; }
        .ve-save-indicator { font-size: 12px; font-family: ${FONT}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
            50% { box-shadow: 0 0 0 6px rgba(99,102,241,0.25); }
        }
        @keyframes pulsedot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.7); }
        }
    `;
    document.head.appendChild(el);
}


const Field = ({ label, value, onChange, rows, hint, mono, placeholder }: {
    label: string; value: string; onChange: (v: string) => void;
    rows?: number; hint?: string; mono?: boolean; placeholder?: string;
}) => (
    <div style={{ marginBottom: "18px" }}>
        <label style={labelStyle}>{label}</label>
        {hint && <p style={{ fontSize: "11px", color: "#c4c9d4", marginBottom: "6px", fontFamily: FONT }}>{hint}</p>}
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

export default function VariantEditor({ variant, adminPass }: Props) {
    useEffect(() => { injectStyles(); }, []);

    const isEdit = !!variant?.id;
    const draftKey = isEdit ? variant!.id! : "new";
    const slugify = (v: string) => v.toLowerCase().replace(/\s/g, "-").replace(/[^a-z0-9-]/g, "");

    // ── Meta / slug fields ────────────────────────────────────────────────────
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
    const [offerSub, setOfferSub] = useState(variant?.offer_subheading ?? "");
    const [finalCtaHeading, setFinalCtaHeading] = useState(variant?.finalcta_heading ?? "");
    const [finalCtaSub, setFinalCtaSub] = useState(variant?.finalcta_subheading ?? "");

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
                    if (f.mech_heading) setMechHeading(f.mech_heading);
                    if (f.mech_subheading) setMechSub(f.mech_subheading);
                    if (f.mech_step1_label) setMechStep1Label(f.mech_step1_label);
                    if (f.mech_step1_desc) setMechStep1Desc(f.mech_step1_desc);
                    if (f.mech_step2_label) setMechStep2Label(f.mech_step2_label);
                    if (f.mech_step2_desc) setMechStep2Desc(f.mech_step2_desc);
                    if (f.mech_step3_label) setMechStep3Label(f.mech_step3_label);
                    if (f.mech_step3_desc) setMechStep3Desc(f.mech_step3_desc);
                    if (f.offer_subheading) setOfferSub(f.offer_subheading);
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

    // Always-current ref — fixes stale closure issues in debounced/event callbacks
    const latestRef = useRef({ brief, concept, tam });
    useEffect(() => { latestRef.current = { brief, concept, tam }; }, [brief, concept, tam]);

    const buildPayload = useCallback(() => ({
        brief, concept, tam,
        spine_product: spineProduct, spine_jtbd: spineJtbd,
        spine_problem: spineProblem, spine_mechanism: spineMechanism,
        hero_badge: heroBadge, hero_headline: heroHeadline,
        hero_subheadline: heroSub, hero_cta_primary: heroCtaP, hero_cta_secondary: heroCtaS,
        prob_heading: probHeading, prob_subheading: probSub,
        prob_pain_points: pain.split("\n").map(s => s.trim()).filter(Boolean),
        prob_gain_points: gain.split("\n").map(s => s.trim()).filter(Boolean),
        prob_agitation_body: probAgitation,
        prob_stakes_body: probStakes,
        mech_heading: mechHeading, mech_subheading: mechSub,
        mech_step1_label: mechStep1Label, mech_step1_desc: mechStep1Desc,
        mech_step2_label: mechStep2Label, mech_step2_desc: mechStep2Desc,
        mech_step3_label: mechStep3Label, mech_step3_desc: mechStep3Desc,
        offer_subheading: offerSub,
        finalcta_heading: finalCtaHeading, finalcta_subheading: finalCtaSub,
        faq,
        meta_title: metaTitle, meta_description: metaDesc,
    }), [brief, concept, tam, spineProduct, spineJtbd, spineProblem, spineMechanism,
        heroBadge, heroHeadline, heroSub, heroCtaP, heroCtaS,
        probHeading, probSub, pain, gain, probAgitation, probStakes,
        mechHeading, mechSub, mechStep1Label, mechStep1Desc,
        mechStep2Label, mechStep2Desc, mechStep3Label, mechStep3Desc,
        offerSub, finalCtaHeading, finalCtaSub, faq, metaTitle, metaDesc]);

    const saveDraft = useCallback((fields?: ReturnType<typeof buildPayload>) => {
        // Read from latestRef so we always capture current values, even in stale closures
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
                // Non-ok response — reset so indicator doesn't stay stuck
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
        probHeading, probSub, pain, gain, probAgitation, probStakes,
        mechHeading, mechSub, mechStep1Label, mechStep1Desc,
        mechStep2Label, mechStep2Desc, mechStep3Label, mechStep3Desc,
        offerSub, finalCtaHeading, finalCtaSub, JSON.stringify(faq), metaTitle, metaDesc,
        spineProduct, spineJtbd, spineProblem, spineMechanism];

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
            // 400ms — fast enough to catch quick navigation
            saveDraft(generated ? buildPayload() : undefined);
        }, 400);
        return () => { if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brief, concept, tam, ...allValues]);

    // Flush draft immediately on page unload (navigation, tab close, refresh)
    useEffect(() => {
        const flush = () => {
            const { brief: b, concept: c, tam: t } = latestRef.current;
            // sendBeacon is fire-and-forget, survives page unload
            const payload = JSON.stringify({
                draft_key: draftKey,
                brief: b, concept: c, tam: t,
                fields: null,
            });
            const blob = new Blob([payload], { type: "application/json" });
            // Include auth in URL param as fallback since headers aren't supported with sendBeacon
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
                body: JSON.stringify({ brief, concept, tam }),
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
                        setOfferSub(json.offer_subheading ?? "");
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
                        // Don't call saveDraft here — React state hasn't flushed yet.
                        // The useEffect debounce on allValues will fire after state updates and save correctly.
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

    return (
        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "32px 24px", fontFamily: FONT }}>
            {/* Header */}
            <div style={{ marginBottom: "32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <a href="/admin" style={{ fontSize: "13px", color: "#9ca3af", textDecoration: "none", fontFamily: FONT }}>← All variants</a>
                    <h1 style={{ fontSize: "24px", fontWeight: 800, marginTop: "10px", color: "#111", fontFamily: FONT }}>
                        {isEdit ? `Editing: /${concept}/${tam}` : "New Variant"}
                    </h1>
                </div>
                {isEdit && saveIndicator && (
                    <span className="ve-save-indicator" style={{
                        color: saveStatus === "saved" ? "#22c55e" : saveStatus === "error" ? "#ef4444" : "#9ca3af",
                        fontWeight: 600,
                    }}>{saveIndicator}</span>
                )}
            </div>

            {/* ── STEP 1: Brief ── */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "4px", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em", color: "#111" }}>
                    {isEdit ? "Regenerate from brief" : "Step 1 — Dump your brief"}
                </h2>
                <p style={{ fontSize: "13px", color: "#c4c9d4", marginBottom: "20px", fontFamily: FONT }}>
                    Paste anything — SPINE notes, Creative Matrix output, ad copy, raw ideas.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <Field label="Concept slug" value={concept} onChange={v => setConcept(slugify(v))} placeholder="unique-flows" mono />
                    <Field label="TAM slug" value={tam} onChange={v => setTam(slugify(v))} placeholder="supplements" mono />
                </div>
                {concept && tam && (
                    <p style={{ fontSize: "12px", color: "#c4c9d4", marginBottom: "16px", fontFamily: FONT }}>
                        URL: <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", color: "#6b7280" }}>/{concept}/{tam}</code>
                    </p>
                )}

                <textarea
                    value={brief}
                    onChange={e => setBrief(e.target.value)}
                    rows={12}
                    className="ve-textarea"
                    placeholder={`Dump everything here:\n\n• Creative Matrix output\n• SPINE: product, JTBD, problem, mechanism\n• The specific ad hook / UMOP\n• TAM desires and pain points\n• Raw notes, bullet points, anything\n\nClaude reads it all and writes the whole page.`}
                    style={{ ...inputStyle, background: "#f9fafb", fontSize: "14px", fontFamily: FONT }}
                />

                {/* Generate button */}
                <button
                    onClick={handleGenerate}
                    disabled={generating || brief.trim().length < 20 || !concept || !tam}
                    style={{
                        marginTop: "16px", padding: "13px 28px",
                        background: generating ? "#111" : "#111",
                        color: "#fff", border: "none", borderRadius: "10px",
                        fontSize: "14px", fontWeight: 700, cursor: generating ? "default" : "pointer",
                        opacity: brief.trim().length < 20 || !concept || !tam ? 0.4 : 1,
                        display: "flex", alignItems: "center", gap: "8px",
                        fontFamily: FONT, transition: "opacity 0.2s",
                    }}
                >
                    <span style={{ display: "inline-block", animation: generating ? "spin 1.2s linear infinite" : "none" }}>✦</span>
                    {generating ? "Running pipeline…" : generated ? "Regenerate" : "Generate with Claude →"}
                </button>

                {/* 3-stage progress indicator */}
                {generating && (
                    <div style={{
                        marginTop: "20px", padding: "20px 24px",
                        background: "#f9fafb", border: "1px solid #e5e7eb",
                        borderRadius: "14px", fontFamily: FONT,
                    }}>
                        {/* Stage steps */}
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
                                                background: isDone ? "#22c55e" : isActive ? "#111" : "#e5e7eb",
                                                color: isDone || isActive ? "#fff" : "#9ca3af",
                                                transition: "all 0.3s",
                                                animation: isActive ? "pulse-glow 1.5s ease-in-out infinite" : "none",
                                                flexShrink: 0,
                                            }}>
                                                {isDone ? "✓" : n}
                                            </div>
                                            <div style={{ marginTop: "6px", textAlign: "center" }}>
                                                <div style={{ fontSize: "11px", fontWeight: 700, color: isActive ? "#111" : isPending ? "#9ca3af" : "#374151", letterSpacing: "0.02em" }}>{label}</div>
                                                <div style={{ fontSize: "10px", color: "#c4c9d4", marginTop: "1px" }}>{sublabel}</div>
                                            </div>
                                        </div>
                                        {i < 2 && (
                                            <div style={{
                                                height: "2px", flex: "0 0 24px", margin: "0 0 22px",
                                                background: isDone ? "#22c55e" : "#e5e7eb",
                                                transition: "background 0.3s",
                                            }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Live status */}
                        {stageDetail && (
                            <p style={{
                                fontSize: "12px", color: "#6b7280", margin: 0,
                                paddingTop: "12px", borderTop: "1px solid #e5e7eb",
                                display: "flex", alignItems: "center", gap: "8px",
                            }}>
                                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1", animation: "pulsedot 1s ease-in-out infinite", flexShrink: 0 }} />
                                {stageDetail}
                            </p>
                        )}
                    </div>
                )}

                {genError && <p style={{ marginTop: "10px", fontSize: "13px", color: "#ef4444", fontFamily: FONT }}>{genError}</p>}
            </div>

            {/* ── STEP 2: Review ── */}
            {generated && (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", overflow: "hidden" }}>
                    <div style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                {isEdit && (
                                    <span style={{
                                        display: "inline-flex", alignItems: "center", gap: "5px",
                                        padding: "3px 10px", borderRadius: "20px",
                                        background: "#dcfce7", color: "#15803d",
                                        fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
                                        fontFamily: FONT,
                                    }}>
                                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                                        LIVE
                                    </span>
                                )}
                                <h2 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "2px", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em", color: "#111" }}>
                                    {isEdit ? "Edit fields" : "Step 2 — Review & edit"}
                                </h2>
                            </div>
                            <p style={{ fontSize: "12px", color: "#c4c9d4", fontFamily: FONT }}>
                                {isEdit ? "Changes auto-save as you type." : "Claude wrote this. Change anything before publishing."}
                            </p>
                        </div>
                        {isEdit && saveIndicator && (
                            <span className="ve-save-indicator" style={{
                                color: saveStatus === "saved" ? "#22c55e" : saveStatus === "error" ? "#ef4444" : "#9ca3af",
                                fontWeight: 600,
                            }}>{saveIndicator}</span>
                        )}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", overflowX: "auto" }}>
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                                padding: "12px 18px", border: "none", background: "none", cursor: "pointer",
                                fontSize: "13px", fontWeight: activeTab === t.id ? 700 : 500,
                                color: activeTab === t.id ? "#111" : "#9ca3af",
                                borderBottom: activeTab === t.id ? "2px solid #111" : "2px solid transparent",
                                marginBottom: "-1px", fontFamily: FONT, whiteSpace: "nowrap",
                            }}>{t.label}</button>
                        ))}
                    </div>

                    <div style={{ background: "#fff", padding: "28px" }}>

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
                                <div style={{ border: "1px solid #f3f4f6", borderRadius: "12px", padding: "18px", marginBottom: "18px", background: "#fafafa" }}>
                                    <p style={{ ...labelStyle, marginBottom: "14px", color: "#6366f1" }}>Step 1</p>
                                    <Field label="Label" value={mechStep1Label} onChange={setMechStep1Label} placeholder="Diagnostic Call" />
                                    <Field label="Description" value={mechStep1Desc} onChange={setMechStep1Desc} rows={3} placeholder="We map your product, your customer's pain, and what they need to hear to buy again." />
                                </div>
                                <div style={{ border: "1px solid #f3f4f6", borderRadius: "12px", padding: "18px", marginBottom: "18px", background: "#fafafa" }}>
                                    <p style={{ ...labelStyle, marginBottom: "14px", color: "#6366f1" }}>Step 2</p>
                                    <Field label="Label" value={mechStep2Label} onChange={setMechStep2Label} placeholder="Custom Flow Build" />
                                    <Field label="Description" value={mechStep2Desc} onChange={setMechStep2Desc} rows={3} placeholder="We write and build every flow around your formulation, not Klaviyo's defaults." />
                                </div>
                                <div style={{ border: "1px solid #f3f4f6", borderRadius: "12px", padding: "18px", marginBottom: "18px", background: "#fafafa" }}>
                                    <p style={{ ...labelStyle, marginBottom: "14px", color: "#6366f1" }}>Step 3</p>
                                    <Field label="Label" value={mechStep3Label} onChange={setMechStep3Label} placeholder="Launch & Compound" />
                                    <Field label="Description" value={mechStep3Desc} onChange={setMechStep3Desc} rows={3} placeholder="Flows go live. One-time fee. No retainer. Every sale they generate is pure profit added back." />
                                </div>
                            </>
                        )}

                        {/* ── Offer & CTA tab ── */}
                        {activeTab === "offer" && (
                            <>
                                <Field label="Offer subheading" value={offerSub} onChange={setOfferSub} rows={3} placeholder="Other agencies sell retainers. We build your flows once, hand them over, and they run forever." />
                                <div style={{ borderTop: "1px solid #f3f4f6", marginTop: "8px", paddingTop: "24px" }}>
                                    <p style={{ ...labelStyle, marginBottom: "14px", color: "#6b7280" }}>Final CTA Section</p>
                                    <Field label="Heading" value={finalCtaHeading} onChange={setFinalCtaHeading} rows={2} placeholder="Start Printing Revenue From Email. Without More Ad Spend." />
                                    <Field label="Subheading" value={finalCtaSub} onChange={setFinalCtaSub} rows={2} placeholder="See if your brand qualifies for the flow buildout." />
                                </div>
                                <div style={{ borderTop: "1px solid #f3f4f6", marginTop: "8px", paddingTop: "24px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                        <p style={{ ...labelStyle, color: "#6b7280", margin: 0 }}>FAQ ({faq.length} questions)</p>
                                        <button
                                            onClick={() => setFaq(prev => [...prev, { q: "", a: "" }])}
                                            style={{ fontSize: "12px", fontWeight: 700, color: "#6366f1", background: "none", border: "1px solid #e0e7ff", borderRadius: "8px", padding: "5px 12px", cursor: "pointer", fontFamily: FONT }}
                                        >+ Add question</button>
                                    </div>
                                    {faq.length === 0 && (
                                        <p style={{ fontSize: "13px", color: "#c4c9d4", fontFamily: FONT, textAlign: "center", padding: "20px" }}>
                                            Generate copy first — Claude will write brief-specific FAQs automatically.
                                        </p>
                                    )}
                                    {faq.map((item, i) => (
                                        <div key={i} style={{ border: "1px solid #f3f4f6", borderRadius: "12px", padding: "16px", marginBottom: "12px", background: "#fafafa" }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                                                <p style={{ ...labelStyle, color: "#6366f1", margin: 0 }}>Q{i + 1}</p>
                                                <button
                                                    onClick={() => setFaq(prev => prev.filter((_, idx) => idx !== i))}
                                                    style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontWeight: 600 }}
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
                                <div style={{ borderTop: "1px solid #f3f4f6", marginTop: "8px", paddingTop: "24px" }}>
                                    <p style={{ ...labelStyle, marginBottom: "14px", color: "#6b7280" }}>SPINE Summary (AI reference)</p>
                                    <Field label="Product" value={spineProduct} onChange={setSpineProduct} placeholder="Flow buildout, one-time fee" />
                                    <Field label="JTBD" value={spineJtbd} onChange={setSpineJtbd} placeholder="Automated revenue without more ad spend" />
                                    <Field label="Core Problem" value={spineProblem} onChange={setSpineProblem} placeholder="Generic flows don't connect with why the customer bought" />
                                    <Field label="Mechanism" value={spineMechanism} onChange={setSpineMechanism} placeholder="Flows built around unique product and customer pain" />
                                </div>
                                <div style={{ marginTop: "8px", padding: "14px", background: "#f9fafb", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                                    <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "6px", fontFamily: FONT }}>Live URL</p>
                                    <code style={{ fontSize: "13px", color: "#374151", fontFamily: "monospace" }}>/{concept}/{tam}</code>{" "}
                                    <a href={`/${concept}/${tam}`} target="_blank" style={{ fontSize: "12px", color: "#6366f1", textDecoration: "none", fontFamily: FONT }}>Open ↗</a>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!isEdit && (
                        <div style={{ padding: "20px 28px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "12px" }}>
                            <button onClick={handlePublish} disabled={saving} style={{
                                padding: "12px 28px", background: "#111",
                                color: "#fff", border: "none", borderRadius: "10px",
                                fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                                fontFamily: FONT,
                            }}>
                                {saving ? "Publishing…" : "Publish variant →"}
                            </button>
                            <a href="/admin" style={{ fontSize: "13px", color: "#9ca3af", textDecoration: "none", fontFamily: FONT }}>Cancel</a>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
