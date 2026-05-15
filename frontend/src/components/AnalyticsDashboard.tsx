import { useMemo } from "react";
import type { AnalysisResponse, AccidentRisk, RecommendationCategory, PriorityLevel } from "../types/api";
import type { FlatRec } from "./RecommendationPanel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Cell, Tooltip, ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Colour constants
// ---------------------------------------------------------------------------
const CATEGORY_COLORS: Record<RecommendationCategory, string> = {
  traffic_flow: "#DC2626",
  public_transport: "#2563EB",
  walkability: "#16A34A",
  policy_enforcement: "#D97706",
};

// CATEGORY_LABELS used in TimelineChart only
const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  traffic_flow: "Traffic Flow",
  public_transport: "Public Transport",
  walkability: "Walkability",
  policy_enforcement: "Policy",
} as const;
void CATEGORY_LABELS; // suppress unused warning — used in ganttData.cat

const RISK_COLORS: Record<AccidentRisk, string> = {
  Low: "#16A34A",
  Moderate: "#D97706",
  High: "#DC2626",
  Critical: "#7C3AED",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function fmtRM(v: number): string {
  return v >= 1_000_000
    ? `RM${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `RM${(v / 1_000).toFixed(0)}k`
    : `RM${v}`;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "0.5rem",
      border: "1px solid #E2E8F0",
      padding: "1.25rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: "0.75rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "#6B7280",
      marginBottom: "1rem",
      marginTop: 0,
    }}>
      {children}
    </h3>
  );
}

const summaryStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#64748B",
  fontStyle: "italic",
  textAlign: "center",
  marginTop: "0.625rem",
  lineHeight: 1.5,
};

// ---------------------------------------------------------------------------
// Section 1 — Situation Severity
// ---------------------------------------------------------------------------
function SeverityBadge({ score }: { score: number }) {
  const color = score >= 8 ? "#DC2626" : score >= 6 ? "#D97706" : score >= 4 ? "#2563EB" : "#16A34A";
  const label = score >= 8 ? "Critical" : score >= 6 ? "High" : score >= 4 ? "Moderate" : "Low";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{
        width: "72px", height: "72px", borderRadius: "50%",
        backgroundColor: color, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: `0 0 0 4px ${color}33`,
      }}>
        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.85)", fontWeight: 600, letterSpacing: "0.05em" }}>/10</span>
      </div>
      <div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color }}>{label} Severity</div>
        <div style={{ fontSize: "0.8125rem", color: "#6B7280", marginTop: "0.125rem" }}>Tahap Keterukan / Severity Level</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      flex: 1, backgroundColor: "#F8FAFC", borderRadius: "0.375rem",
      border: `1px solid ${color}33`, padding: "0.875rem", textAlign: "center",
    }}>
      <div style={{ fontSize: "1.375rem", fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151", marginTop: "0.25rem" }}>{label}</div>
      <div style={{ fontSize: "0.6875rem", color: "#9CA3AF", marginTop: "0.125rem" }}>{sub}</div>
    </div>
  );
}

function SituationSection({ analysis }: { analysis: AnalysisResponse }) {
  const m = analysis.situation_metrics;
  return (
    <Card>
      <SectionTitle>Situasi Semasa / Current Situation</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <SeverityBadge score={m.severity_score} />
          <p style={{ fontSize: "0.875rem", color: "#4B5563", flex: 1, minWidth: "200px", margin: 0, lineHeight: 1.5 }}>
            {m.congestion_description}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <StatCard label="Time Wasted / Masa Terbuang" value={`${m.daily_time_wasted_minutes} min`} sub="per commuter daily" color="#D97706" />
          <StatCard label="Accident Risk / Risiko Kemalangan" value={m.accident_risk} sub="current conditions" color={RISK_COLORS[m.accident_risk]} />
          <StatCard label="Affected Commuters / Pengguna Terjejas" value={m.estimated_affected_commuters.toLocaleString()} sub="estimated daily" color="#2563EB" />
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Row 1 Left — Category bar chart (derived from editedRecs)
// ---------------------------------------------------------------------------
function CategoryBarChart({ analysis, editedRecs }: { analysis: AnalysisResponse; editedRecs: FlatRec[] | null }) {
  const cats: { key: RecommendationCategory; name: string }[] = [
    { key: "traffic_flow", name: "Traffic Flow" },
    { key: "public_transport", name: "Public Transport" },
    { key: "walkability", name: "Walkability" },
    { key: "policy_enforcement", name: "Policy" },
  ];

  // Count from editedRecs if available, else fall back to analysis — exclude deferred
  const data = cats.map((c) => {
    const count = editedRecs
      ? editedRecs.filter((r) => r.category === c.key && r.status !== "Deferred").length
      : analysis.recommendations[c.key].length;
    return { name: c.name, count, fill: CATEGORY_COLORS[c.key] };
  });

  const total = data.reduce((s, d) => s + d.count, 0);
  const top = data.reduce((a, b) => (a.count >= b.count ? a : b));

  return (
    <Card>
      <SectionTitle>Recommendations by Category / Cadangan mengikut Kategori</SectionTitle>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6B7280" }} />
          <Tooltip formatter={(v: number) => [`${v} recommendations`, "Count"]} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={summaryStyle}>
        Highest focus area: <strong>{top.name}</strong> — Total: {total} recommendations across 4 categories<br />
        <em>Fokus tertinggi: {top.name} — Jumlah: {total} cadangan merentasi 4 kategori</em>
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Row 1 Right — Budget bar chart (derived from editedRecs — live updates)
// ---------------------------------------------------------------------------
function BudgetChart({ analysis, editedRecs }: { analysis: AnalysisResponse; editedRecs: FlatRec[] | null }) {
  // Derive live budget totals from editedRecs (single source of truth)
  const liveBudget = useMemo(() => {
    if (!editedRecs) return analysis.budget_estimates;
    // Exclude deferred recs from budget
    const active = editedRecs.filter((r) => r.status !== "Deferred");
    const calc = (cat: RecommendationCategory) =>
      active
        .filter((r) => r.category === cat)
        .reduce((s, r) => s + (r.editedBreakdown.reduce((si, i) => si + i.total, 0) || r.estimated_cost), 0);
    const tf = calc("traffic_flow");
    const pt = calc("public_transport");
    const wk = calc("walkability");
    const pe = calc("policy_enforcement");
    return { traffic_flow: tf, public_transport: pt, walkability: wk, policy_enforcement: pe, total: tf + pt + wk + pe };
  }, [editedRecs, analysis.budget_estimates]);

  const data = [
    { name: "Traffic Flow", amount: liveBudget.traffic_flow, fill: CATEGORY_COLORS.traffic_flow },
    { name: "Public Transport", amount: liveBudget.public_transport, fill: CATEGORY_COLORS.public_transport },
    { name: "Walkability", amount: liveBudget.walkability, fill: CATEGORY_COLORS.walkability },
    { name: "Policy", amount: liveBudget.policy_enforcement, fill: CATEGORY_COLORS.policy_enforcement },
  ];

  const top = data.reduce((a, c) => (a.amount >= c.amount ? a : c));

  return (
    <Card>
      <SectionTitle>Budget Allocation / Peruntukan Bajet</SectionTitle>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} />
          <YAxis tickFormatter={fmtRM} tick={{ fontSize: 9, fill: "#6B7280" }} />
          <Tooltip formatter={(v: number) => [fmtRM(v), "Estimated Budget"]} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={summaryStyle}>
        Largest allocation: <strong>{top.name}</strong> at {fmtRM(top.amount)} — Total estimated budget: {fmtRM(liveBudget.total)}<br />
        <em>Peruntukan terbesar: {top.name} pada {fmtRM(top.amount)} — Jumlah anggaran bajet: {fmtRM(liveBudget.total)}</em>
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Row 2 — Full-width SVG Gantt chart (month-based, parallel/sequential)
// ---------------------------------------------------------------------------

interface GanttItem {
  id: number;
  label: string;
  fullAction: string;
  priority: PriorityLevel;
  category: RecommendationCategory;
  startMonth: number;
  durationMonths: number;
  isIndependent: boolean;
  dependsOn: number | null; // id of item this depends on
}

function classifyItem(action: string, category: RecommendationCategory, priority: PriorityLevel): {
  isIndependent: boolean;
  isAssessment: boolean;
  isConstruction: boolean;
} {
  const a = action.toLowerCase();
  const isAssessment = /audit|assess|study|survey|review|inspect|evaluat/.test(a);
  const isConstruction = /install|construct|build|widen|upgrade|lay|pave|erect/.test(a);
  const isPolicy = category === "policy_enforcement";
  const isEnforcement = /enforce|patrol|fine|penalt|monitor|deploy officer/.test(a);
  const isIndependent = isPolicy || isEnforcement || isAssessment || priority === "Critical";
  return { isIndependent, isAssessment, isConstruction };
}

function buildGanttItems(analysis: AnalysisResponse): GanttItem[] {
  const cats: RecommendationCategory[] = ["traffic_flow", "public_transport", "walkability", "policy_enforcement"];
  const allRecs: { rec: typeof analysis.recommendations.traffic_flow[0]; cat: RecommendationCategory }[] = [];
  for (const cat of cats) {
    for (const rec of analysis.recommendations[cat]) {
      allRecs.push({ rec, cat });
    }
  }

  // Sort: Critical first, then High, then Medium
  const PORDER: Record<PriorityLevel, number> = { Critical: 0, High: 1, Medium: 2 };
  allRecs.sort((a, b) => PORDER[a.rec.priority_level] - PORDER[b.rec.priority_level]);

  const items: GanttItem[] = [];
  let idCounter = 1;

  // First pass: assign IDs and classify
  const classified = allRecs.map(({ rec, cat }) => {
    const { isIndependent, isAssessment, isConstruction } = classifyItem(rec.action, cat, rec.priority_level);
    return { rec, cat, id: idCounter++, isIndependent, isAssessment, isConstruction };
  });

  // Find assessment items (they must come first for construction items)
  const assessmentIds = classified.filter((c) => c.isAssessment).map((c) => c.id);

  for (const c of classified) {
    const p = c.rec.priority_level;
    let startMonth: number;
    let durationMonths: number;
    let dependsOn: number | null = null;

    // Duration: parse from timeline string, convert weeks → months (÷4), min 1
    const nums = c.rec.estimated_timeline.match(/\d+/g)?.map(Number) ?? [4];
    const weeks = nums.length >= 2 ? nums[1] : nums[0];
    durationMonths = Math.max(1, Math.round(weeks / 4));

    if (p === "Critical") {
      startMonth = 1;
    } else if (p === "High") {
      if (c.isConstruction && assessmentIds.length > 0) {
        // Depends on last assessment item
        const lastAssessId = assessmentIds[assessmentIds.length - 1];
        const lastAssess = items.find((i) => i.id === lastAssessId);
        startMonth = lastAssess ? lastAssess.startMonth + lastAssess.durationMonths : 2;
        dependsOn = lastAssessId;
      } else if (c.isIndependent) {
        startMonth = 1; // parallel with Critical
      } else {
        // Depends on Critical items finishing
        const criticalItems = items.filter((i) => i.priority === "Critical");
        const maxCritEnd = criticalItems.length > 0
          ? Math.max(...criticalItems.map((i) => i.startMonth + i.durationMonths - 1))
          : 1;
        startMonth = maxCritEnd + 1;
        if (criticalItems.length > 0) dependsOn = criticalItems[criticalItems.length - 1].id;
      }
    } else {
      // Medium: start at month 3 or after High items
      const highItems = items.filter((i) => i.priority === "High");
      const maxHighEnd = highItems.length > 0
        ? Math.max(...highItems.map((i) => i.startMonth + i.durationMonths - 1))
        : 2;
      startMonth = Math.max(3, maxHighEnd + 1);
      if (highItems.length > 0) dependsOn = highItems[highItems.length - 1].id;
    }

    items.push({
      id: c.id,
      label: `${c.id}. ${truncate(c.rec.action, 28)}`,
      fullAction: c.rec.action,
      priority: p,
      category: c.cat,
      startMonth,
      durationMonths,
      isIndependent: c.isIndependent,
      dependsOn,
    });
  }

  return items;
}

const GANTT_PRIORITY_COLORS: Record<PriorityLevel, string> = {
  Critical: "#DC2626",
  High: "#F97316",
  Medium: "#2563EB",
};

function GanttChart({ analysis, editedRecs }: { analysis: AnalysisResponse; editedRecs?: FlatRec[] | null }) {
  const items = useMemo(() => {
    const allItems = buildGanttItems(analysis);
    // Remove deferred items — get their IDs from editedRecs
    if (!editedRecs) return allItems;
    const deferredLabels = new Set(
      editedRecs.filter((r) => r.status === "Deferred").map((r) => r.action)
    );
    return allItems.filter((item) => !deferredLabels.has(item.fullAction));
  }, [analysis, editedRecs]);

  const latestEnd = items.length > 0
    ? Math.max(...items.map((i) => i.startMonth + i.durationMonths - 1))
    : 8;
  const TOTAL_MONTHS = Math.max(8, latestEnd + 1);

  // Shared cell styles
  const thStyle: React.CSSProperties = {
    padding: "8px 6px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#374151",
    backgroundColor: "#F1F5F9",
    borderBottom: "2px solid #D1D5DB",
    borderRight: "1px solid #E2E8F0",
    textAlign: "center",
    whiteSpace: "nowrap",
    minWidth: "60px",
  };

  const tdEmptyStyle = (isEven: boolean, colIdx: number): React.CSSProperties => ({
    backgroundColor: colIdx % 2 === 0
      ? (isEven ? "#FAFAFA" : "#FFFFFF")
      : (isEven ? "#F3F6FA" : "#F8FAFC"),
    borderRight: "1px solid #F1F5F9",
    borderBottom: "1px solid #F1F5F9",
    height: "40px",
    padding: 0,
  });

  return (
    <Card>
      <SectionTitle>Implementation Timeline / Jadual Pelaksanaan (Month-Based)</SectionTitle>

      {/* Scrollable container — never overflows */}
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table style={{
          minWidth: "900px",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          width: `${280 + TOTAL_MONTHS * 80}px`,
        }}>
          <colgroup>
            <col style={{ width: "280px" }} />
            {Array.from({ length: TOTAL_MONTHS }, (_, i) => (
              <col key={i} style={{ width: "80px" }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              {/* Sticky label header */}
              <th style={{
                ...thStyle,
                width: "280px",
                position: "sticky",
                left: 0,
                zIndex: 2,
                textAlign: "left",
                paddingLeft: "12px",
                borderRight: "2px solid #D1D5DB",
              }}>
                # Action / Tindakan
              </th>
              {Array.from({ length: TOTAL_MONTHS }, (_, i) => (
                <th key={i} style={{
                  ...thStyle,
                  backgroundColor: i % 2 === 0 ? "#F1F5F9" : "#E8EDF5",
                }}>
                  M{i + 1}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {items.map((item, rowIdx) => {
              const isEven = rowIdx % 2 === 0;
              const color = GANTT_PRIORITY_COLORS[item.priority];
              const rowBg = isEven ? "#FAFAFA" : "#FFFFFF";

              // Build cells: one per month column
              // Cells before bar: empty
              // Bar cells: colSpan = durationMonths, colored
              // Cells after bar: empty
              const beforeCols = item.startMonth - 1;
              const barCols    = item.durationMonths;
              const afterCols  = TOTAL_MONTHS - beforeCols - barCols;

              return (
                <tr key={item.id}>
                  {/* Sticky label cell */}
                  <td style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    backgroundColor: rowBg,
                    borderRight: "2px solid #D1D5DB",
                    borderBottom: "1px solid #F1F5F9",
                    padding: "0 8px 0 12px",
                    height: "40px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "280px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: color,
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: "11px", color: "#374151" }}>{item.label}</span>
                    </div>
                  </td>

                  {/* Empty cells before bar */}
                  {Array.from({ length: beforeCols }, (_, i) => (
                    <td key={`pre-${i}`} style={tdEmptyStyle(isEven, item.startMonth - 1 - i)} />
                  ))}

                  {/* Bar cell — spans durationMonths columns */}
                  {barCols > 0 && (
                    <td
                      colSpan={barCols}
                      title={`${item.fullAction} — Month ${item.startMonth} to ${item.startMonth + barCols - 1}`}
                      style={{
                        backgroundColor: color,
                        opacity: 0.88,
                        borderRadius: "4px",
                        borderBottom: "1px solid #F1F5F9",
                        padding: "0 4px",
                        height: "40px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        cursor: "default",
                      }}
                    >
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#fff",
                        whiteSpace: "nowrap",
                      }}>
                        {item.durationMonths}mo
                      </span>
                    </td>
                  )}

                  {/* Empty cells after bar */}
                  {Array.from({ length: Math.max(0, afterCols) }, (_, i) => (
                    <td key={`post-${i}`} style={tdEmptyStyle(isEven, item.startMonth + barCols + i)} />
                  ))}
                </tr>
              );
            })}

            {/* Bottom axis label row */}
            <tr>
              <td style={{
                position: "sticky",
                left: 0,
                backgroundColor: "#F8FAFC",
                borderTop: "1px solid #E2E8F0",
                padding: "4px 12px",
                fontSize: "10px",
                color: "#9CA3AF",
                fontStyle: "italic",
              }} />
              <td
                colSpan={TOTAL_MONTHS}
                style={{
                  borderTop: "1px solid #E2E8F0",
                  backgroundColor: "#F8FAFC",
                  textAlign: "center",
                  padding: "4px",
                  fontSize: "10px",
                  color: "#9CA3AF",
                  fontStyle: "italic",
                }}
              >
                Bulan / Month
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend — color only */}
      <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.875rem", flexWrap: "wrap", alignItems: "center" }}>
        {(["Critical", "High", "Medium"] as PriorityLevel[]).map((p) => (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "#4B5563" }}>
            <div style={{ width: "18px", height: "10px", borderRadius: "3px", backgroundColor: GANTT_PRIORITY_COLORS[p] }} />
            {p}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
interface AnalyticsDashboardProps {
  analysis: AnalysisResponse;
  editedRecs?: FlatRec[] | null;
}

export default function AnalyticsDashboard({ analysis, editedRecs }: AnalyticsDashboardProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Section 1 — Current Situation */}
      <SituationSection analysis={analysis} />

      {/* Row 1 — Two bar charts side by side, equal width */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <CategoryBarChart analysis={analysis} editedRecs={editedRecs ?? null} />
        <BudgetChart analysis={analysis} editedRecs={editedRecs ?? null} />
      </div>

      {/* Row 2 — Full-width HTML table Gantt (month-based, parallel/sequential) */}
      <GanttChart analysis={analysis} editedRecs={editedRecs} />
    </div>
  );
}
