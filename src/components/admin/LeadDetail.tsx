import { useState, useEffect, useRef, useCallback } from "react";
import type { Lead, Founder, Outreach, OutreachStage, ContactLogEntry } from "../../lib/supabase";

const STAGES: { key: OutreachStage; label: string; color: string; bg: string }[] = [
  { key: "new",         label: "New",         color: "#6b7280", bg: "#f3f4f6" },
  { key: "researching", label: "Researching",  color: "#3b82f6", bg: "#eff6ff" },
  { key: "dm_ready",    label: "DM Ready",     color: "#6366f1", bg: "#eef2ff" },
  { key: "dm_sent",     label: "DM Sent",      color: "#f59e0b", bg: "#fffbeb" },
  { key: "replied",     label: "Replied",      color: "#f97316", bg: "#fff7ed" },
  { key: "call_booked", label: "Call Booked",  color: "#22c55e", bg: "#f0fdf4" },
  { key: "closed_won",  label: "Closed Won",   color: "#10b981", bg: "#ecfdf5" },
  { key: "closed_lost", label: "Closed Lost",  color: "#ef4444", bg: "#fef2f2" },
  { key: "not_a_fit",   label: "Not a Fit",    color: "#94a3b8", bg: "#f8fafc" },
];

const REVENUE_OPTIONS = [
  "", "$0–250k", "$250k–1M", "$1M–5M", "$5M–20M", "$20M–50M", "$50M+"
];

interface Props {
  lead: Lead;
}

export default function LeadDetail({ lead: initialLead }: Props) {
  const [lead, setLead] = useState<Lead>(initialLead);
  const [founder, setFounder] = useState<Founder>(initialLead.founders || {} as Founder);
  const [outreach, setOutreach] = useState<Outreach>(initialLead.outreach || {} as Outreach);
  const [tab, setTab] = useState<"founder" | "dm" | "pipeline">("founder");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dmCopy, setDmCopy] = useState(initialLead.founders?.dm_copy || "");
  const [generating, setGenerating] = useState(false);
  const [logNote, setLogNote] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerSave(leadPatch?: Partial<Lead>, founderPatch?: Partial<Founder>, outreachPatch?: Partial<Outreach>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      doSave(leadPatch, founderPatch, outreachPatch);
    }, 1200);
  }

  async function doSave(leadPatch?: Partial<Lead>, founderPatch?: Partial<Founder>, outreachPatch?: Partial<Outreach>) {
    setSaving(true);
    const body: any = {};
    if (leadPatch) Object.assign(body, leadPatch);
    if (founderPatch) body.founder = founderPatch;
    if (outreachPatch) body.outreach = outreachPatch;

    await fetch(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateLead(patch: Partial<Lead>) {
    setLead(prev => ({ ...prev, ...patch }));
    triggerSave(patch);
  }

  function updateFounder(patch: Partial<Founder>) {
    setFounder(prev => ({ ...prev, ...patch }));
    triggerSave(undefined, patch);
  }

  function updateOutreach(patch: Partial<Outreach>) {
    setOutreach(prev => ({ ...prev, ...patch }));
    triggerSave(undefined, undefined, patch);
  }

  async function generateDM() {
    setGenerating(true);
    const res = await fetch(`/api/leads/${lead.id}/generate-dm`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (res.ok) {
      const data = await res.json();
      setDmCopy(data.dm_copy);
      setOutreach(prev => ({ ...prev, stage: "dm_ready" }));
    }
    setGenerating(false);
  }

  async function markDMSent() {
    setFounder(prev => ({ ...prev, dm_sent: true, dm_sent_at: new Date().toISOString() }));
    setOutreach(prev => ({ ...prev, stage: "dm_sent" }));
    await doSave(
      undefined,
      { dm_sent: true, dm_sent_at: new Date().toISOString() },
      { stage: "dm_sent" }
    );
  }

  async function addContactLog() {
    if (!logNote.trim()) return;
    const entry: ContactLogEntry = { ts: new Date().toISOString(), note: logNote.trim() };
    const newLog = [...(outreach.contact_log || []), entry];
    setOutreach(prev => ({ ...prev, contact_log: newLog }));
    setLogNote("");
    await doSave(undefined, undefined, { contact_log: newLog });
  }

  async function saveDmCopy() {
    await fetch(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ founder: { dm_copy: dmCopy } }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const stage = STAGES.find(s => s.key === outreach.stage) || STAGES[0];

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Back + status bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <a href="/admin/leads" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>
          ← All leads
        </a>
        <span style={{
          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em",
          background: stage.bg, color: stage.color,
        }}>
          {stage.label}
        </span>
        {saving && <span style={{ fontSize: 12, color: "#9ca3af" }}>Saving...</span>}
        {saved && !saving && <span style={{ fontSize: 12, color: "#22c55e" }}>Saved</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 }}>

        {/* LEFT PANEL — Lead info */}
        <div>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{lead.brand_name}</h2>
            <a
              href={lead.website_url || `https://${lead.domain}`}
              target="_blank"
              rel="noopener"
              style={{ fontSize: 13, color: "#6366f1", textDecoration: "none" }}
            >
              {lead.domain} ↗
            </a>
            {lead.facebook_page && (
              <div style={{ marginTop: 6 }}>
                <a href={lead.facebook_page} target="_blank" rel="noopener" style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}>
                  Facebook page ↗
                </a>
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={fieldRowStyle}>
                <label style={labelStyle}>Niche</label>
                <input
                  value={lead.niche || ""}
                  onChange={e => updateLead({ niche: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. fashion brands"
                />
              </div>

              <div style={fieldRowStyle}>
                <label style={labelStyle}>Page likes</label>
                <input
                  type="number"
                  value={lead.page_likes || 0}
                  onChange={e => updateLead({ page_likes: parseInt(e.target.value) || 0 })}
                  style={inputStyle}
                />
              </div>

              <div style={fieldRowStyle}>
                <label style={labelStyle}>Revenue est.</label>
                <select value={lead.revenue_estimate || ""} onChange={e => updateLead({ revenue_estimate: e.target.value })} style={inputStyle}>
                  {REVENUE_OPTIONS.map(o => <option key={o} value={o}>{o || "— select —"}</option>)}
                </select>
              </div>

              <div style={fieldRowStyle}>
                <label style={labelStyle}>Shopify</label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={lead.is_shopify}
                    onChange={e => updateLead({ is_shopify: e.target.checked })}
                  />
                  <span style={{ fontSize: 13, color: "#374151" }}>Confirmed Shopify</span>
                </label>
              </div>

              <div style={fieldRowStyle}>
                <label style={labelStyle}>Klaviyo</label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={lead.klaviyo_confirmed}
                    onChange={e => updateLead({ klaviyo_confirmed: e.target.checked })}
                  />
                  <span style={{ fontSize: 13, color: "#374151" }}>Using Klaviyo</span>
                </label>
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={lead.notes || ""}
                  onChange={e => updateLead({ notes: e.target.value })}
                  rows={3}
                  style={{ ...inputStyle, width: "100%", resize: "vertical", marginTop: 6 }}
                  placeholder="Internal notes about this lead..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Tabs */}
        <div>
          <div style={cardStyle}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: 20, gap: 0 }}>
              {(["founder", "dm", "pipeline"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "10px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "none",
                    border: "none",
                    borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent",
                    color: tab === t ? "#6366f1" : "#9ca3af",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "color 0.15s",
                  }}
                >
                  {t === "dm" ? "DM Copy" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* FOUNDER TAB */}
            {tab === "founder" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Full name</label>
                  <input value={founder.full_name || ""} onChange={e => updateFounder({ full_name: e.target.value })} style={inputStyle} placeholder="Jane Smith" />
                </div>
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>First name</label>
                  <input value={founder.first_name || ""} onChange={e => updateFounder({ first_name: e.target.value })} style={inputStyle} placeholder="Jane" />
                </div>
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Instagram</label>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 13 }}>@</span>
                    <input
                      value={founder.instagram_handle || ""}
                      onChange={e => updateFounder({ instagram_handle: e.target.value.replace("@", "") })}
                      style={{ ...inputStyle, paddingLeft: 26, width: "100%" }}
                      placeholder="handle"
                    />
                  </div>
                </div>
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Email</label>
                  <input value={founder.email || ""} onChange={e => updateFounder({ email: e.target.value })} style={inputStyle} type="email" placeholder="jane@brand.com" />
                </div>
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>LinkedIn</label>
                  <input value={founder.linkedin_url || ""} onChange={e => updateFounder({ linkedin_url: e.target.value })} style={inputStyle} placeholder="https://linkedin.com/in/..." />
                </div>
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Title</label>
                  <input value={founder.title || ""} onChange={e => updateFounder({ title: e.target.value })} style={inputStyle} placeholder="Founder & CEO" />
                </div>
              </div>
            )}

            {/* DM TAB */}
            {tab === "dm" && (
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button
                    onClick={generateDM}
                    disabled={generating}
                    style={{ ...btnPrimaryStyle, opacity: generating ? 0.7 : 1 }}
                  >
                    {generating ? "Generating..." : dmCopy ? "Regenerate DM" : "Generate DM"}
                  </button>
                  {founder.dm_sent ? (
                    <span style={{ fontSize: 12, color: "#22c55e", display: "flex", alignItems: "center" }}>
                      ✓ DM sent {founder.dm_sent_at ? new Date(founder.dm_sent_at).toLocaleDateString() : ""}
                    </span>
                  ) : dmCopy ? (
                    <button onClick={markDMSent} style={btnGhostStyle}>
                      Mark as Sent
                    </button>
                  ) : null}
                </div>

                {dmCopy ? (
                  <>
                    <textarea
                      value={dmCopy}
                      onChange={e => setDmCopy(e.target.value)}
                      rows={8}
                      style={{ ...inputStyle, width: "100%", resize: "vertical", fontSize: 14, lineHeight: 1.6 }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={saveDmCopy} style={btnGhostStyle}>Save edits</button>
                      <button
                        onClick={() => navigator.clipboard.writeText(dmCopy)}
                        style={btnGhostStyle}
                      >
                        Copy to clipboard
                      </button>
                    </div>
                    {founder.instagram_handle && (
                      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 10 }}>
                        Send to: <a href={`https://instagram.com/${founder.instagram_handle}`} target="_blank" rel="noopener" style={{ color: "#6366f1" }}>@{founder.instagram_handle}</a>
                      </p>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>No DM generated yet.</p>
                    <p style={{ fontSize: 12 }}>Fill in founder info first, then generate.</p>
                  </div>
                )}
              </div>
            )}

            {/* PIPELINE TAB */}
            {tab === "pipeline" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Stage</label>
                  <select
                    value={outreach.stage || "new"}
                    onChange={e => updateOutreach({ stage: e.target.value as OutreachStage })}
                    style={inputStyle}
                  >
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Priority</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={outreach.priority === 1}
                      onChange={e => updateOutreach({ priority: e.target.checked ? 1 : 0 })}
                    />
                    <span style={{ fontSize: 13, color: "#374151" }}>High priority ★</span>
                  </label>
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Deal value</label>
                  <input
                    type="number"
                    value={outreach.deal_value || ""}
                    onChange={e => updateOutreach({ deal_value: parseFloat(e.target.value) || null } as any)}
                    style={inputStyle}
                    placeholder="5000"
                  />
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Call date</label>
                  <input
                    type="datetime-local"
                    value={outreach.call_date ? outreach.call_date.slice(0, 16) : ""}
                    onChange={e => updateOutreach({ call_date: e.target.value ? new Date(e.target.value).toISOString() : null } as any)}
                    style={inputStyle}
                  />
                </div>

                {outreach.stage === "closed_lost" || outreach.stage === "not_a_fit" ? (
                  <div>
                    <label style={labelStyle}>Lost reason</label>
                    <input
                      value={outreach.lost_reason || ""}
                      onChange={e => updateOutreach({ lost_reason: e.target.value })}
                      style={{ ...inputStyle, width: "100%", marginTop: 6 }}
                      placeholder="Why did this not close?"
                    />
                  </div>
                ) : null}

                <div>
                  <label style={labelStyle}>Pipeline notes</label>
                  <textarea
                    value={outreach.notes || ""}
                    onChange={e => updateOutreach({ notes: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, width: "100%", resize: "vertical", marginTop: 6 }}
                    placeholder="Notes specific to the deal..."
                  />
                </div>

                {/* Contact log */}
                <div>
                  <label style={{ ...labelStyle, display: "block", marginBottom: 8 }}>Contact log</label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input
                      value={logNote}
                      onChange={e => setLogNote(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addContactLog(); }}
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="Add note..."
                    />
                    <button onClick={addContactLog} style={btnGhostStyle}>Add</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(outreach.contact_log || []).slice().reverse().map((entry, i) => (
                      <div key={i} style={{
                        background: "#f9fafb", borderRadius: 8, padding: "8px 12px", fontSize: 12,
                      }}>
                        <span style={{ color: "#9ca3af", marginRight: 8 }}>
                          {new Date(entry.ts).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span style={{ color: "#374151" }}>{entry.note}</span>
                      </div>
                    ))}
                    {(outreach.contact_log || []).length === 0 && (
                      <p style={{ fontSize: 12, color: "#d1d5db" }}>No contact logged yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
};

const fieldRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  width: 90,
  flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "7px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  background: "#fff",
  color: "#111",
};

const btnPrimaryStyle: React.CSSProperties = {
  background: "#6366f1",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhostStyle: React.CSSProperties = {
  background: "transparent",
  color: "#374151",
  border: "1px solid #e5e7eb",
  padding: "8px 16px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
