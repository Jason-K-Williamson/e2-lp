import { useState, useEffect, useCallback } from "react";
import type { Lead, OutreachStage } from "../../lib/supabase";

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

const KANBAN_STAGES = STAGES.filter(s =>
  ["new","researching","dm_ready","dm_sent","replied","call_booked"].includes(s.key)
);

interface Props {
  initialLeads: Lead[];
}

type SortCol = "brand_name" | "niche" | "ads_count" | "stage" | "";

export default function LeadsBoard({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [total, setTotal] = useState(initialLeads.length);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [filterStage, setFilterStage] = useState("");
  const [filterNiche, setFilterNiche] = useState("");
  const [search, setSearch] = useState("");
  const [minAds, setMinAds] = useState("");
  const [maxAds, setMaxAds] = useState("");
  const [shopifyOnly, setShopifyOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("ads_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [importModal, setImportModal] = useState(false);
  const [importDatasetId, setImportDatasetId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number; skipped: number; total: number;
    skipReasons?: Record<string, number>;
    diagnostics?: { sampleFields?: string[]; sampleAdsCount?: number; dbErrorDetail?: string | null; note?: string | null };
    error?: string;
  } | null>(null);

  const niches = [...new Set(leads.map(l => l.niche).filter(Boolean))].sort() as string[];

  function buildParams(p: number) {
    const params = new URLSearchParams();
    if (filterStage) params.set("stage", filterStage);
    if (filterNiche) params.set("niche", filterNiche);
    if (search) params.set("search", search);
    if (minAds) params.set("minAds", minAds);
    if (maxAds) params.set("maxAds", maxAds);
    if (shopifyOnly) params.set("shopifyOnly", "true");
    params.set("page", String(p));
    return params;
  }

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setPage(1);
    const res = await fetch(`/api/leads?${buildParams(1)}`, {
      credentials: "same-origin",
    });
    if (res.ok) {
      const json = await res.json();
      setLeads(json.data ?? json);
      setTotal(json.total ?? json.length ?? 0);
      setHasMore(json.hasMore ?? false);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStage, filterNiche, search, minAds, maxAds, shopifyOnly]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    const res = await fetch(`/api/leads?${buildParams(nextPage)}`, {
      credentials: "same-origin",
    });
    if (res.ok) {
      const json = await res.json();
      setLeads(prev => [...prev, ...(json.data ?? [])]);
      setHasMore(json.hasMore ?? false);
      setPage(nextPage);
    }
    setLoadingMore(false);
  }

  useEffect(() => {
    const t = setTimeout(fetchLeads, 400);
    return () => clearTimeout(t);
  }, [fetchLeads]);

  async function togglePriority(lead: Lead) {
    const newPriority = lead.outreach?.priority === 1 ? 0 : 1;
    await fetch(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ outreach: { priority: newPriority } }),
    });
    setLeads(prev => prev.map(l => {
      if (l.id !== lead.id) return l;
      return { ...l, outreach: { ...l.outreach!, priority: newPriority } };
    }));
  }

  async function changeStage(leadId: string, stage: OutreachStage) {
    await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ outreach: { stage } }),
    });
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      return { ...l, outreach: { ...l.outreach!, stage } };
    }));
  }

  async function runImport() {
    if (!importDatasetId.trim()) return;
    setImporting(true);
    setImportResult(null);
    const res = await fetch("/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ datasetId: importDatasetId.trim(), skipLikesFilter: false }),
    });
    const result = await res.json();
    setImportResult(result);
    setImporting(false);
    if (res.ok) await fetchLeads();
  }

  function stageInfo(key: string) {
    return STAGES.find(s => s.key === key) || STAGES[0];
  }

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  const filteredLeads = [...leads].sort((a, b) => {
    if (!sortCol) return 0;
    let aVal: string | number, bVal: string | number;
    if (sortCol === "ads_count") {
      aVal = a.ads_count ?? 0;
      bVal = b.ads_count ?? 0;
    } else if (sortCol === "stage") {
      aVal = a.outreach?.stage ?? "";
      bVal = b.outreach?.stage ?? "";
    } else {
      aVal = a[sortCol] ?? "";
      bVal = b[sortCol] ?? "";
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search brand..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={inputStyle}>
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filterNiche} onChange={e => setFilterNiche(e.target.value)} style={inputStyle}>
          <option value="">All niches</option>
          {niches.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input
          type="number"
          placeholder="Min ads"
          value={minAds}
          onChange={e => setMinAds(e.target.value)}
          style={{ ...inputStyle, width: 90 }}
        />
        <input
          type="number"
          placeholder="Max ads"
          value={maxAds}
          onChange={e => setMaxAds(e.target.value)}
          style={{ ...inputStyle, width: 90 }}
        />
        <button
          onClick={() => setShopifyOnly(v => !v)}
          style={{
            ...btnGhostStyle,
            background: shopifyOnly ? "#f0fdf4" : "transparent",
            borderColor: shopifyOnly ? "#22c55e" : "#e5e7eb",
            color: shopifyOnly ? "#16a34a" : "#374151",
          }}
        >
          {shopifyOnly ? "✓ Shopify" : "Shopify"}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setView(view === "list" ? "kanban" : "list")}
            style={btnGhostStyle}
          >
            {view === "list" ? "Kanban" : "List"}
          </button>
          <button onClick={() => setImportModal(true)} style={btnPrimaryStyle}>
            Import from Apify
          </button>
        </div>
      </div>

      {/* Count */}
      <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
        {loading ? "Loading..." : `Showing ${filteredLeads.length} of ${total.toLocaleString()} leads`}
      </p>

      {/* LIST VIEW */}
      {view === "list" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {([
                  { label: "★", col: "" },
                  { label: "Brand", col: "brand_name" },
                  { label: "Niche", col: "niche" },
                  { label: "Active Ads", col: "ads_count" },
                  { label: "Shopify", col: "" },
                  { label: "Founder", col: "" },
                  { label: "Stage", col: "stage" },
                  { label: "", col: "" },
                ] as { label: string; col: SortCol }[]).map((h, i) => (
                  <th
                    key={i}
                    style={{
                      ...thStyle,
                      cursor: h.col ? "pointer" : "default",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => h.col && handleSort(h.col)}
                  >
                    {h.label}
                    {h.col && sortCol === h.col && (
                      <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => {
                const founder = lead.founders;
                const outreach = lead.outreach;
                const stage = stageInfo(outreach?.stage || "new");
                const isPriority = outreach?.priority === 1;
                return (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                    onClick={() => window.location.href = `/admin/leads/${lead.id}`}
                  >
                    <td style={tdStyle} onClick={e => { e.stopPropagation(); togglePriority(lead); }}>
                      <span style={{ fontSize: 16, color: isPriority ? "#f59e0b" : "#d1d5db", cursor: "pointer" }}>
                        {isPriority ? "★" : "☆"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{ fontWeight: 600, fontSize: 13, color: "#6366f1", cursor: "pointer", textDecoration: "none" }}
                        onClick={e => { e.stopPropagation(); window.open(lead.website_url || `https://${lead.domain}`, "_blank"); }}
                      >
                        {lead.brand_name}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{lead.domain}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{lead.niche || "—"}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: "#374151" }}>
                        {(lead.ads_count ?? 0).toLocaleString()} ads
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: lead.is_shopify ? "#22c55e" : "#d1d5db" }}>
                        {lead.is_shopify ? "✓" : "—"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: "#374151" }}>
                        {founder?.first_name || founder?.full_name || <span style={{ color: "#d1d5db" }}>—</span>}
                      </span>
                      {founder?.instagram_handle && (
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>@{founder.instagram_handle}</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 9px",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        background: stage.bg,
                        color: stage.color,
                      }}>
                        {stage.label}
                      </span>
                    </td>
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      <select
                        value={outreach?.stage || "new"}
                        onChange={e => changeStage(lead.id, e.target.value as OutreachStage)}
                        style={{ fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 6px", background: "#fff" }}
                      >
                        {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                    No leads found. Import from Apify to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Load More */}
          {hasMore && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{ ...btnGhostStyle, opacity: loadingMore ? 0.6 : 1 }}
              >
                {loadingMore ? "Loading..." : `Load more (${total - leads.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16 }}>
          {KANBAN_STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.outreach?.stage === stage.key);
            return (
              <div key={stage.key} style={{ minWidth: 240, flex: "0 0 240px" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 10, padding: "6px 10px",
                  background: stage.bg, borderRadius: 8,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: stage.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {stage.label}
                  </span>
                  <span style={{ fontSize: 11, color: stage.color, marginLeft: "auto", fontWeight: 700 }}>
                    {stageLeads.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stageLeads.map(lead => {
                    const founder = lead.founders;
                    const outreach = lead.outreach;
                    return (
                      <div
                        key={lead.id}
                        onClick={() => window.location.href = `/admin/leads/${lead.id}`}
                        style={{
                          background: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                          padding: "12px 14px",
                          cursor: "pointer",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#c7d2fe";
                          (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(99,102,241,.1)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
                          (e.currentTarget as HTMLElement).style.boxShadow = "none";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#111" }}>{lead.brand_name}</div>
                          <span
                            style={{ fontSize: 14, color: outreach?.priority === 1 ? "#f59e0b" : "#e5e7eb", cursor: "pointer" }}
                            onClick={e => { e.stopPropagation(); togglePriority(lead); }}
                          >
                            {outreach?.priority === 1 ? "★" : "☆"}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{lead.niche}</div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                          {(lead.ads_count ?? 0).toLocaleString()} active ads
                        </div>
                        {founder?.instagram_handle && (
                          <div style={{ fontSize: 11, color: "#6366f1", marginTop: 4 }}>
                            @{founder.instagram_handle}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {stageLeads.length === 0 && (
                    <div style={{ fontSize: 12, color: "#d1d5db", textAlign: "center", padding: "20px 0" }}>
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* IMPORT MODAL */}
      {importModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div
            style={{
              background: "#fff", borderRadius: 16, padding: 32, width: 440,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Import from Apify</h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              Paste your Apify dataset ID. Active brands with 3+ ads will be imported.
            </p>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Dataset ID
            </label>
            <input
              value={importDatasetId}
              onChange={e => setImportDatasetId(e.target.value)}
              placeholder="e.g. JNSEeQFrWEiaUB4Q3"
              style={{ ...inputStyle, width: "100%", marginBottom: 12 }}
            />
            {importResult && (
              <div style={{
                background: importResult.inserted > 0 ? "#f0fdf4" : "#fff7ed",
                border: `1px solid ${importResult.inserted > 0 ? "#bbf7d0" : "#fed7aa"}`,
                borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13,
              }}>
                {importResult.error ? (
                  <div style={{ color: "#ef4444" }}>Error: {importResult.error}</div>
                ) : (
                  <>
                    <div style={{ marginBottom: 6 }}>
                      <strong style={{ color: importResult.inserted > 0 ? "#16a34a" : "#92400e" }}>
                        {importResult.inserted} imported
                      </strong>
                      <span style={{ color: "#6b7280" }}> · {importResult.skipped} skipped · {importResult.total} total</span>
                    </div>
                    {importResult.skipReasons && (
                      <div style={{ fontSize: 11, color: "#6b7280", display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                        {Object.entries(importResult.skipReasons)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => (
                            <span key={k}><strong style={{ color: "#374151" }}>{v}</strong> {k.replace(/_/g, " ")}</span>
                          ))}
                      </div>
                    )}
                    {importResult.diagnostics?.note && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#b45309", fontStyle: "italic" }}>
                        {importResult.diagnostics.note}
                      </div>
                    )}
                    {importResult.diagnostics?.dbErrorDetail && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
                        DB Error: {importResult.diagnostics.dbErrorDetail}
                      </div>
                    )}
                    {importResult.diagnostics?.sampleFields && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ fontSize: 11, color: "#6b7280", cursor: "pointer" }}>Dataset fields</summary>
                        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, wordBreak: "break-all" }}>
                          {importResult.diagnostics.sampleFields.join(", ")}
                        </div>
                      </details>
                    )}
                  </>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setImportModal(false); setImportResult(null); }} style={btnGhostStyle}>
                Cancel
              </button>
              <button onClick={runImport} disabled={importing} style={{ ...btnPrimaryStyle, opacity: importing ? 0.7 : 1 }}>
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  background: "#fff",
  color: "#111",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#9ca3af",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  verticalAlign: "middle",
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
