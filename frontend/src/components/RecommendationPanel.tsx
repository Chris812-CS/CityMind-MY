import { useState, useCallback, useEffect, useRef } from "react";
import type {
  Recommendation,
  RecommendationCategory,
  Recommendations,
  PriorityLevel,
  CostBreakdownItem,
} from "../types/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<RecommendationCategory, string> = {
  traffic_flow: "🚦",
  public_transport: "🚌",
  walkability: "🚶",
  policy_enforcement: "📋",
};

const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  traffic_flow: "Traffic Flow",
  public_transport: "Transport",
  walkability: "Walkability",
  policy_enforcement: "Policy",
};

const CATEGORY_COLORS: Record<RecommendationCategory, string> = {
  traffic_flow: "#DC2626",
  public_transport: "#2563EB",
  walkability: "#16A34A",
  policy_enforcement: "#D97706",
};

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  Critical: "#DC2626",
  High: "#D97706",
  Medium: "#2563EB",
};

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
};

type RowStatus = "Pending" | "In Progress" | "Completed" | "Deferred";
const STATUS_OPTIONS: RowStatus[] = ["Pending", "In Progress", "Completed", "Deferred"];
const STATUS_DOT_COLORS: Record<RowStatus, string> = {
  Pending: "#9CA3AF",
  "In Progress": "#2563EB",
  Completed: "#16A34A",
  Deferred: "#DC2626",
};

// ---------------------------------------------------------------------------
// Flat recommendation with mutable state
// ---------------------------------------------------------------------------

export interface FlatRec extends Recommendation {
  implOrder: number;
  category: RecommendationCategory;
  status: RowStatus;
  editedBreakdown: CostBreakdownItem[];
  isEdited: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(" ");
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

function parseWeekStart(timeline: string): number {
  const nums = timeline.match(/\d+/g)?.map(Number) ?? [99];
  return nums[0];
}

function fmtRM(v: number): string {
  if (v >= 1_000_000) return `RM${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `RM${(v / 1_000).toFixed(0)}k`;
  return `RM${v.toLocaleString()}`;
}

export function flattenAndSort(recommendations: Recommendations): FlatRec[] {
  const cats: RecommendationCategory[] = [
    "traffic_flow",
    "public_transport",
    "walkability",
    "policy_enforcement",
  ];
  const raw: (Recommendation & { category: RecommendationCategory })[] = [];
  for (const cat of cats) {
    for (const rec of recommendations[cat]) {
      raw.push({ ...rec, category: cat });
    }
  }
  // Sort: priority first, then shortest timeline
  raw.sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority_level] - PRIORITY_ORDER[b.priority_level];
    if (pd !== 0) return pd;
    return parseWeekStart(a.estimated_timeline) - parseWeekStart(b.estimated_timeline);
  });
  return raw.map((r, i) => ({
    ...r,
    implOrder: i + 1,
    status: "Pending" as RowStatus,
    editedBreakdown: r.cost_breakdown.map((item) => ({ ...item })),
    isEdited: false,
  }));
}

// ---------------------------------------------------------------------------
// Budget summary bar
// ---------------------------------------------------------------------------

function BudgetSummaryBar({
  recs,
  onCategoryClick,
}: {
  recs: FlatRec[];
  onCategoryClick: (cat: RecommendationCategory) => void;
}) {
  const catTotals: Record<RecommendationCategory, number> = {
    traffic_flow: 0,
    public_transport: 0,
    walkability: 0,
    policy_enforcement: 0,
  };
  for (const r of recs) {
    if (r.status === "Deferred") continue; // exclude deferred from budget total
    const total = r.editedBreakdown.reduce((s, i) => s + i.total, 0) || r.estimated_cost;
    catTotals[r.category] += total;
  }
  const grandTotal = Object.values(catTotals).reduce((s, v) => s + v, 0);

  return (
    <div style={{
      backgroundColor: "#0F172A",
      borderRadius: "0.5rem",
      padding: "0.875rem 1.25rem",
      marginBottom: "1rem",
      display: "flex",
      flexWrap: "wrap",
      gap: "0.75rem",
      alignItems: "center",
    }}>
      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#F1F5F9", whiteSpace: "nowrap" }}>
        Total Budget: <span style={{ color: "#FCD34D" }}>{fmtRM(grandTotal)}</span>
      </div>
      <div style={{ width: "1px", height: "20px", backgroundColor: "#334155" }} />
      {(Object.entries(catTotals) as [RecommendationCategory, number][]).map(([cat, amt]) => (
        <button
          key={cat}
          type="button"
          onClick={() => onCategoryClick(cat)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "0.75rem",
            color: "#CBD5E1",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>{CATEGORY_ICONS[cat]}</span>
          <span style={{ color: CATEGORY_COLORS[cat], fontWeight: 600 }}>{fmtRM(amt)}</span>
          <span style={{ color: "#64748B" }}>{CATEGORY_LABELS[cat]}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable cost breakdown table
// ---------------------------------------------------------------------------

function CostBreakdownTable({
  rec,
  isEditing,
  onUpdate,
}: {
  rec: FlatRec;
  isEditing: boolean;
  onUpdate: (newBreakdown: CostBreakdownItem[]) => void;
}) {
  const items = rec.editedBreakdown;
  const rowTotal = items.reduce((s, i) => s + i.total, 0);

  const handleChange = (idx: number, field: "qty" | "unit_cost", val: string) => {
    const num = parseInt(val, 10) || 0;
    const updated = items.map((item, i) => {
      if (i !== idx) return item;
      const newItem = { ...item, [field]: num };
      newItem.total = newItem.qty * newItem.unit_cost;
      return newItem;
    });
    onUpdate(updated);
  };

  const cellStyle: React.CSSProperties = {
    padding: "0.375rem 0.5rem",
    fontSize: "0.75rem",
    borderBottom: "1px solid #F1F5F9",
    color: "#374151",
  };

  const inputStyle: React.CSSProperties = {
    width: "70px",
    padding: "2px 6px",
    fontSize: "0.75rem",
    border: "1px solid #D1D5DB",
    borderRadius: "4px",
    backgroundColor: "#FEFCE8",
    color: "#111827",
    textAlign: "right" as const,
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>
        Cost Breakdown / Pecahan Kos
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "420px" }}>
          <thead>
            <tr style={{ backgroundColor: "#F8FAFC" }}>
              {["Item", "Unit", "Qty", "Unit Cost (RM)", "Total (RM)"].map((h) => (
                <th key={h} style={{ ...cellStyle, fontWeight: 700, color: "#6B7280", fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isChanged = item.qty !== rec.cost_breakdown[idx]?.qty || item.unit_cost !== rec.cost_breakdown[idx]?.unit_cost;
              return (
                <tr key={idx} style={{ backgroundColor: isChanged && isEditing ? "#FEFCE8" : "transparent" }}>
                  <td style={cellStyle}>{item.item}</td>
                  <td style={cellStyle}>{item.unit}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        value={item.qty}
                        onChange={(e) => handleChange(idx, "qty", e.target.value)}
                        style={inputStyle}
                      />
                    ) : item.qty}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        value={item.unit_cost}
                        onChange={(e) => handleChange(idx, "unit_cost", e.target.value)}
                        style={inputStyle}
                      />
                    ) : `RM${item.unit_cost.toLocaleString()}`}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600, color: isChanged && isEditing ? "#D97706" : "#111827" }}>
                    RM{item.total.toLocaleString()}
                  </td>
                </tr>
              );
            })}
            <tr style={{ backgroundColor: "#F8FAFC", borderTop: "2px solid #E2E8F0" }}>
              <td colSpan={4} style={{ ...cellStyle, fontWeight: 700, textAlign: "right" }}>TOTAL</td>
              <td style={{ ...cellStyle, fontWeight: 800, textAlign: "right", color: "#1E3A5F" }}>
                RM{rowTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel (expanded row)
// ---------------------------------------------------------------------------

function DetailPanel({
  rec,
  onUpdateBreakdown,
  onSave,
  onReset,
}: {
  rec: FlatRec;
  onUpdateBreakdown: (newBreakdown: CostBreakdownItem[]) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, backgroundColor: "#F8FAFC" }}>
        <div style={{
          padding: "1rem 1.25rem",
          borderLeft: `4px solid ${PRIORITY_COLORS[rec.priority_level]}`,
          borderBottom: "1px solid #E2E8F0",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 2rem", marginBottom: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                Full Action / Tindakan Penuh
              </div>
              <div style={{ fontSize: "0.875rem", color: "#111827", lineHeight: 1.5 }}>{rec.action}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                Rationale / Rasional
              </div>
              <div style={{ fontSize: "0.875rem", color: "#4B5563", lineHeight: 1.5, fontStyle: "italic" }}>
                {rec.rationale || "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                Responsible Party / Pihak Bertanggungjawab
              </div>
              <div style={{ fontSize: "0.875rem", color: "#111827" }}>{rec.responsible_party}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                Timeline / Tempoh
              </div>
              <div style={{ fontSize: "0.875rem", color: "#111827" }}>{rec.estimated_timeline}</div>
            </div>
          </div>

          {rec.cost_breakdown.length > 0 && (
            <CostBreakdownTable
              rec={rec}
              isEditing={isEditing}
              onUpdate={onUpdateBreakdown}
            />
          )}

          {/* Edit controls */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  padding: "0.3125rem 0.875rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  border: "1px solid #D1D5DB",
                  borderRadius: "0.375rem",
                  backgroundColor: "#fff",
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                ✏️ Edit / Sunting
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { onSave(); setIsEditing(false); }}
                  style={{
                    padding: "0.3125rem 0.875rem",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "0.375rem",
                    backgroundColor: "#16A34A",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  ✓ Save / Simpan
                </button>
                <button
                  type="button"
                  onClick={() => { onReset(); setIsEditing(false); }}
                  style={{
                    padding: "0.3125rem 0.875rem",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    border: "1px solid #D1D5DB",
                    borderRadius: "0.375rem",
                    backgroundColor: "#fff",
                    color: "#6B7280",
                    cursor: "pointer",
                  }}
                >
                  ↺ Reset / Tetapkan Semula
                </button>
              </>
            )}
            {rec.isEdited && !isEditing && (
              <span style={{ fontSize: "0.75rem", color: "#D97706", fontStyle: "italic", alignSelf: "center" }}>
                ⚠ Costs adjusted by officer / Kos disemak oleh pegawai
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RecommendationPanelProps {
  recommendations: Recommendations | null;
  highlightedCategory: RecommendationCategory | null;
  onRecsChange?: (recs: FlatRec[]) => void;
}

export default function RecommendationPanel({
  recommendations,
  onRecsChange,
}: RecommendationPanelProps) {
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterOwner, setFilterOwner] = useState<string>("All");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [recs, setRecs] = useState<FlatRec[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  // Reset all state when recommendations change (new analysis)
  useEffect(() => {
    if (recommendations) {
      const flat = flattenAndSort(recommendations);
      setRecs(flat);
      onRecsChange?.(flat);
    } else {
      setRecs([]);
    }
    setFilterPriority("All");
    setFilterCategory("All");
    setFilterOwner("All");
    setExpandedIdx(null);
    tableRef.current?.scrollTo({ top: 0 });
  }, [recommendations]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRec = useCallback((implOrder: number, updater: (r: FlatRec) => FlatRec) => {
    setRecs((prev) => {
      const next = prev.map((r) => r.implOrder === implOrder ? updater(r) : r);
      onRecsChange?.(next);
      return next;
    });
  }, [onRecsChange]);

  if (!recommendations) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "120px",
        color: "#9CA3AF",
        fontSize: "0.875rem",
        fontStyle: "italic",
        textAlign: "center",
      }}>
        Tiada cadangan untuk dipaparkan. Sila hantar borang analisis.<br />
        No recommendations to display. Please submit the analysis form.
      </div>
    );
  }

  // Derive unique owners for the Owner dropdown
  const allOwners = Array.from(new Set(recs.map((r) => r.responsible_party))).sort();

  // Apply all 3 filters
  const filtered = recs.filter((r) => {
    if (filterPriority !== "All" && r.priority_level !== filterPriority) return false;
    if (filterCategory !== "All" && r.category !== filterCategory) return false;
    if (filterOwner !== "All" && r.responsible_party !== filterOwner) return false;
    return true;
  });

  // Counts for badges
  const priorityCounts: Record<string, number> = { All: recs.length };
  for (const p of ["Critical", "High", "Medium"]) {
    priorityCounts[p] = recs.filter((r) => r.priority_level === p).length;
  }
  const categoryCounts: Record<string, number> = { All: recs.length };
  for (const c of Object.keys(CATEGORY_LABELS) as RecommendationCategory[]) {
    categoryCounts[c] = recs.filter((r) => r.category === c).length;
  }
  const ownerCounts: Record<string, number> = { All: recs.length };
  for (const o of allOwners) {
    ownerCounts[o] = recs.filter((r) => r.responsible_party === o).length;
  }

  const ddStyle: React.CSSProperties = {
    padding: "0.3125rem 0.5rem",
    fontSize: "0.8125rem",
    border: "1px solid #D1D5DB",
    borderRadius: "0.375rem",
    backgroundColor: "#fff",
    color: "#374151",
    cursor: "pointer",
    height: "32px",
  };

  const thStyle: React.CSSProperties = {
    padding: "0.5rem 0.625rem",
    fontSize: "0.625rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#6B7280",
    backgroundColor: "#F8FAFC",
    borderBottom: "2px solid #E2E8F0",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  return (
    <div>
      {/* Budget summary bar */}
      <BudgetSummaryBar
        recs={recs}
        onCategoryClick={(cat) => setFilterCategory(filterCategory === cat ? "All" : cat)}
      />

      {/* 3 filter dropdowns in a row */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Priority */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={ddStyle}
          aria-label="Filter by priority"
        >
          <option value="All">All Priorities ({priorityCounts.All})</option>
          {["Critical", "High", "Medium"].map((p) => (
            <option key={p} value={p}>{p} ({priorityCounts[p] ?? 0})</option>
          ))}
        </select>

        {/* Category */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={ddStyle}
          aria-label="Filter by category"
        >
          <option value="All">All Categories ({categoryCounts.All})</option>
          {(Object.entries(CATEGORY_LABELS) as [RecommendationCategory, string][]).map(([key, label]) => (
            <option key={key} value={key}>{CATEGORY_ICONS[key]} {label} ({categoryCounts[key] ?? 0})</option>
          ))}
        </select>

        {/* Owner */}
        <select
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
          style={ddStyle}
          aria-label="Filter by owner"
        >
          <option value="All">All Owners ({ownerCounts.All})</option>
          {allOwners.map((o) => (
            <option key={o} value={o}>{o} ({ownerCounts[o] ?? 0})</option>
          ))}
        </select>

        {/* Reset filters */}
        {(filterPriority !== "All" || filterCategory !== "All" || filterOwner !== "All") && (
          <button
            type="button"
            onClick={() => { setFilterPriority("All"); setFilterCategory("All"); setFilterOwner("All"); }}
            style={{
              padding: "0.3125rem 0.625rem",
              fontSize: "0.75rem",
              border: "1px solid #E2E8F0",
              borderRadius: "0.375rem",
              backgroundColor: "#F8FAFC",
              color: "#6B7280",
              cursor: "pointer",
              height: "32px",
            }}
          >
            ✕ Clear
          </button>
        )}

        <span style={{ fontSize: "0.75rem", color: "#9CA3AF", marginLeft: "auto" }}>
          {filtered.length} of {recs.length} shown
        </span>
      </div>

      {/* Table */}
      <div ref={tableRef} style={{ overflowX: "auto", borderRadius: "0.5rem", border: "1px solid #E2E8F0", maxHeight: "600px", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ ...thStyle, width: "32px" }}>#</th>
              <th style={{ ...thStyle, width: "72px" }}>Priority</th>
              <th style={{ ...thStyle, width: "110px" }}>Category</th>
              <th style={thStyle}>Action</th>
              <th style={{ ...thStyle, width: "110px" }}>Owner</th>
              <th style={{ ...thStyle, width: "80px" }}>Timeline</th>
              <th style={{ ...thStyle, width: "90px" }}>Est. Cost</th>
              <th style={{ ...thStyle, width: "80px" }}>Status</th>
              <th style={{ ...thStyle, width: "24px" }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "#9CA3AF", fontSize: "0.875rem", fontStyle: "italic" }}>
                  No recommendations match this filter.
                </td>
              </tr>
            )}
            {filtered.map((rec, rowIdx) => {
              const isExpanded = expandedIdx === rec.implOrder;
              const isDeferred = rec.status === "Deferred";
              const isEven = rowIdx % 2 === 0;
              const borderColor = isDeferred ? "#D1D5DB" : PRIORITY_COLORS[rec.priority_level];
              const rowCost = rec.editedBreakdown.reduce((s, i) => s + i.total, 0) || rec.estimated_cost;
              const rowBg = isDeferred ? "#F8FAFC" : (isEven ? "#fff" : "#F9FAFB");

              const tdStyle: React.CSSProperties = {
                padding: "0.5rem 0.625rem",
                fontSize: "0.8125rem",
                borderBottom: "1px solid #F1F5F9",
                color: isDeferred ? "#9CA3AF" : "#374151",
                opacity: isDeferred ? 0.7 : 1,
              };

              return (
                <>
                  <tr
                    key={rec.implOrder}
                    style={{
                      backgroundColor: rowBg,
                      borderLeft: `4px solid ${borderColor}`,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDeferred ? "#F1F5F9" : "#EFF6FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = rowBg)}
                  >
                    <td style={{ ...tdStyle, color: "#9CA3AF", fontWeight: 700, fontSize: "0.75rem" }} onClick={() => setExpandedIdx(isExpanded ? null : rec.implOrder)}>{rec.implOrder}</td>
                    <td style={tdStyle} onClick={() => setExpandedIdx(isExpanded ? null : rec.implOrder)}>
                      <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: "9999px", fontSize: "0.625rem", fontWeight: 700, backgroundColor: PRIORITY_COLORS[rec.priority_level], color: "#fff", whiteSpace: "nowrap" }}>
                        {rec.priority_level}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }} onClick={() => setExpandedIdx(isExpanded ? null : rec.implOrder)}>
                      {CATEGORY_ICONS[rec.category]} {CATEGORY_LABELS[rec.category]}
                    </td>
                    <td style={{ ...tdStyle, maxWidth: "200px" }} onClick={() => setExpandedIdx(isExpanded ? null : rec.implOrder)}>
                      {isDeferred
                        ? <s style={{ color: "#9CA3AF" }}>{truncateWords(rec.action, 8)}</s>
                        : truncateWords(rec.action, 8)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem", color: "#4B5563" }} onClick={() => setExpandedIdx(isExpanded ? null : rec.implOrder)}>
                      {rec.responsible_party}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem", whiteSpace: "nowrap" }} onClick={() => setExpandedIdx(isExpanded ? null : rec.implOrder)}>
                      {rec.estimated_timeline}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem", fontWeight: 600, color: isDeferred ? "#9CA3AF" : (rec.isEdited ? "#D97706" : "#1E3A5F"), whiteSpace: "nowrap" }} onClick={() => setExpandedIdx(isExpanded ? null : rec.implOrder)}>
                      {isDeferred
                        ? <s>{fmtRM(rowCost)}</s>
                        : <>{fmtRM(rowCost)}{rec.isEdited && <span style={{ marginLeft: "3px", fontSize: "0.625rem" }}>✎</span>}</>}
                    </td>
                    {/* Status dot + select */}
                    <td style={{ ...tdStyle, padding: "0.25rem 0.5rem", width: "80px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                        <div title={rec.status} style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: STATUS_DOT_COLORS[rec.status], flexShrink: 0 }} />
                        <select
                          value={rec.status}
                          onChange={(e) => updateRec(rec.implOrder, (r) => ({ ...r, status: e.target.value as RowStatus }))}
                          title={rec.status}
                          style={{ fontSize: "0.6875rem", padding: "1px 2px", border: "1px solid #E2E8F0", borderRadius: "4px", backgroundColor: "#fff", color: STATUS_DOT_COLORS[rec.status], fontWeight: 600, cursor: "pointer", maxWidth: "62px" }}
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", color: "#9CA3AF", fontSize: "0.75rem" }} onClick={() => setExpandedIdx(isExpanded ? null : rec.implOrder)}>
                      {isExpanded ? "▲" : "▼"}
                    </td>
                  </tr>

                  {isExpanded && (
                    <DetailPanel
                      key={`detail-${rec.implOrder}`}
                      rec={rec}
                      onUpdateBreakdown={(newBreakdown) => updateRec(rec.implOrder, (r) => ({ ...r, editedBreakdown: newBreakdown }))}
                      onSave={() => updateRec(rec.implOrder, (r) => ({ ...r, isEdited: true }))}
                      onReset={() => updateRec(rec.implOrder, (r) => ({ ...r, editedBreakdown: r.cost_breakdown.map((i) => ({ ...i })), isEdited: false }))}
                    />
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "0.5rem", fontSize: "0.6875rem", color: "#9CA3AF", textAlign: "right" }}>
        Click row to expand · Edit costs inline · Status updates saved locally
      </div>
    </div>
  );
}
