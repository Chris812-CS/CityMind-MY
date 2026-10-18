import { useState } from "react";
import type { RecommendationCategory, AnalysisResponse } from "./types/api";
import type { LocationOption } from "./constants/locations";
import { useAnalysis } from "./hooks/useAnalysis";
import type { FlatRec } from "./components/RecommendationPanel";
import { LangProvider } from "./i18n";

import Header from "./components/Header";
import InputForm from "./components/InputForm";
import SummaryBanner from "./components/SummaryBanner";
import MapPanel from "./components/MapPanel";
import RecommendationPanel from "./components/RecommendationPanel";
import PdfDownloadButton from "./components/PdfDownloadButton";
import AnalyticsDashboard from "./components/AnalyticsDashboard";

// Always English
export default function App() {
  return (
    <LangProvider lang="en">
      <AppInner />
    </LangProvider>
  );
}

function AppInner() {
  const {
    analysis,
    isLoading,
    error,
    analyze,
    lastBudgetRange,
    lastExactBudget,
    lastAdditionalContext,
  } = useAnalysis();

  const [highlightedCategory, setHighlightedCategory] = useState<RecommendationCategory | null>(null);
  const [selectedLocation, setSelectedLocation]       = useState<LocationOption | null>(null);
  const [selectedCity, setSelectedCity]               = useState<string | null>(null);
  const [editedRecs, setEditedRecs]                   = useState<FlatRec[] | null>(null);

  // Build edited analysis for PDF
  const activeRecs   = editedRecs?.filter((r) => r.status !== "Deferred") ?? null;
  const deferredRecs = editedRecs?.filter((r) => r.status === "Deferred") ?? [];
  const recCost = (r: FlatRec) =>
    r.editedBreakdown.reduce((s, i) => s + i.total, 0) || r.estimated_cost;

  const editedAnalysis: AnalysisResponse | null =
    analysis && editedRecs
      ? {
          ...analysis,
          recommendations: {
            traffic_flow:       editedRecs.filter((r) => r.category === "traffic_flow").map((r)       => ({ ...r, cost_breakdown: r.editedBreakdown, estimated_cost: recCost(r) })),
            public_transport:   editedRecs.filter((r) => r.category === "public_transport").map((r)   => ({ ...r, cost_breakdown: r.editedBreakdown, estimated_cost: recCost(r) })),
            walkability:        editedRecs.filter((r) => r.category === "walkability").map((r)        => ({ ...r, cost_breakdown: r.editedBreakdown, estimated_cost: recCost(r) })),
            policy_enforcement: editedRecs.filter((r) => r.category === "policy_enforcement").map((r) => ({ ...r, cost_breakdown: r.editedBreakdown, estimated_cost: recCost(r) })),
            affected_groups:    editedRecs.filter((r) => r.category === "affected_groups").map((r)    => ({ ...r, cost_breakdown: r.editedBreakdown, estimated_cost: recCost(r) })),
          },
          budget_estimates: {
            traffic_flow:       (activeRecs ?? []).filter((r) => r.category === "traffic_flow").reduce((s, r) => s + recCost(r), 0),
            public_transport:   (activeRecs ?? []).filter((r) => r.category === "public_transport").reduce((s, r) => s + recCost(r), 0),
            walkability:        (activeRecs ?? []).filter((r) => r.category === "walkability").reduce((s, r) => s + recCost(r), 0),
            policy_enforcement: (activeRecs ?? []).filter((r) => r.category === "policy_enforcement").reduce((s, r) => s + recCost(r), 0),
            affected_groups:    (activeRecs ?? []).filter((r) => r.category === "affected_groups").reduce((s, r) => s + recCost(r), 0),
            total:              (activeRecs ?? []).reduce((s, r) => s + recCost(r), 0),
          },
          has_edited_costs: editedRecs.some((r) => r.isEdited),
          deferred_recommendations: deferredRecs.map((r) => ({
            action: r.action,
            responsible_party: r.responsible_party,
            estimated_timeline: r.estimated_timeline,
            priority_level: r.priority_level,
            estimated_cost: recCost(r),
            rationale: r.rationale,
            cost_breakdown: r.editedBreakdown,
            category: r.category,
          })),
        }
      : analysis;

  const handleOverlayClick = (category: RecommendationCategory) => {
    setHighlightedCategory((prev) => (prev === category ? null : category));
    document
      .getElementById(`section-${category}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Budget validation
  const BUDGET_LIMITS: Record<string, number> = {
    "Under RM10k": 10_000, "RM10k-50k": 50_000, "RM50k-100k": 100_000,
    "RM100k-200k": 200_000, "RM200k-500k": 500_000, "RM500k-1mil": 1_000_000,
    "Above RM1mil": 5_000_000, "Custom / Lain-lain": 0,
  };
  const liveBudgetTotal = activeRecs
    ? activeRecs.reduce((s, r) => s + recCost(r), 0)
    : (analysis?.budget_total ?? analysis?.budget_estimates?.total ?? 0);
  const budgetLimit = lastExactBudget ?? (lastBudgetRange ? BUDGET_LIMITS[lastBudgetRange] ?? null : null);
  const overBy  = budgetLimit !== null ? liveBudgetTotal - budgetLimit : 0;
  const overPct = budgetLimit ? overBy / budgetLimit : 0;
  type BudgetStatus = "ok" | "slightly_over" | "over";
  const budgetStatus: BudgetStatus | null =
    !analysis || budgetLimit === null ? null
    : overBy <= 0 ? "ok"
    : overPct <= 0.1 ? "slightly_over"
    : "over";

  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: "100vh",
      backgroundColor: "#F1F5F9",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <Header />

      <main style={{
        flex: 1, display: "grid", gridTemplateColumns: "30fr 70fr",
        gap: "1.25rem", padding: "1.25rem", maxWidth: "1600px",
        width: "100%", margin: "0 auto", boxSizing: "border-box", alignItems: "start",
      }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <section aria-label="Analysis Input Form" style={{ backgroundColor: "#ffffff", borderRadius: "0.5rem", border: "1px solid #E2E8F0", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1E3A5F", marginBottom: "1rem", marginTop: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Analysis Form
            </h2>
            <InputForm
              onSubmit={analyze}
              isLoading={isLoading}
              onLocationChange={(loc) => { setSelectedLocation(loc); setSelectedCity(loc ? loc.value : null); }}
            />
            {error && (
              <div role="alert" style={{ marginTop: "1rem", padding: "0.75rem 1rem", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "0.375rem", color: "#DC2626", fontSize: "0.875rem" }}>
                <strong>Error: </strong>{error}
              </div>
            )}
          </section>

          <section aria-label="Location Map" style={{ backgroundColor: "#ffffff", borderRadius: "0.5rem", border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", height: "400px", flexShrink: 0 }}>
            <MapPanel
              location={selectedLocation}
              selectedCity={selectedCity}
              recommendations={analysis?.recommendations ?? null}
              highlightedCategory={highlightedCategory}
              onOverlayClick={handleOverlayClick}
            />
          </section>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative", minWidth: 0, overflow: "hidden" }}>

          {/* Loading overlay */}
          {isLoading && (
            <div style={{ position: "absolute", inset: 0, zIndex: 50, backgroundColor: "rgba(241,245,249,0.85)", borderRadius: "0.5rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", backdropFilter: "blur(2px)" }}>
              <div style={{ width: "48px", height: "48px", border: "4px solid #E2E8F0", borderTopColor: "#1D4ED8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1E3A5F" }}>Generating AI recommendations...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", opacity: isLoading ? 0.4 : 1, transition: "opacity 0.2s", pointerEvents: isLoading ? "none" : "auto" }}>

            <section aria-label="Analysis Summary">
              <SummaryBanner analysis={analysis} />
            </section>

            {/* Budget banners */}
            {budgetStatus === "ok" && analysis && (
              <div role="status" style={{ padding: "0.625rem 1rem", backgroundColor: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "0.5rem", color: "#166534", fontSize: "0.875rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span>✅</span>
                <span><strong>Within budget limit</strong> — Total: RM{liveBudgetTotal.toLocaleString()} / Limit: RM{budgetLimit?.toLocaleString()}</span>
              </div>
            )}
            {budgetStatus === "slightly_over" && analysis && (
              <div role="alert" style={{ padding: "0.625rem 1rem", backgroundColor: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: "0.5rem", color: "#92400E", fontSize: "0.875rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span><strong>Slightly over budget</strong> (RM{overBy.toLocaleString()} over limit). Consider increasing budget or deferring lower priority items.</span>
              </div>
            )}
            {budgetStatus === "over" && analysis && (
              <div role="alert" style={{ padding: "0.625rem 1rem", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "0.5rem", color: "#991B1B", fontSize: "0.875rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0 }}>🚨</span>
                <span><strong>Over budget by RM{overBy.toLocaleString()}.</strong> Please adjust costs or reduce scope. (Total: RM{liveBudgetTotal.toLocaleString()} / Limit: RM{budgetLimit?.toLocaleString()})</span>
              </div>
            )}
            {analysis?.additional_context_used === false && lastAdditionalContext && (
              <div role="alert" style={{ padding: "0.625rem 1rem", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "0.5rem", color: "#991B1B", fontSize: "0.875rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span><strong>Additional context not used</strong> — The additional context provided was not relevant and has not been considered in this analysis.</span>
              </div>
            )}

            {/* Analytics Dashboard */}
            {analysis && (
              <section aria-label="Analytics Dashboard" style={{ minWidth: 0, width: "100%", overflow: "hidden" }}>
                <AnalyticsDashboard analysis={analysis} editedRecs={editedRecs} />
              </section>
            )}

            {/* Recommendation Panel */}
            <section aria-label="Recommendations" style={{ backgroundColor: "#ffffff", borderRadius: "0.5rem", border: "1px solid #E2E8F0", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", flex: 1, overflowY: "auto" }}>
              <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1E3A5F", marginBottom: "1rem", marginTop: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Recommendations
              </h2>
              <RecommendationPanel
                key={analysis?.reference_number ?? "empty"}
                recommendations={analysis?.recommendations ?? null}
                highlightedCategory={highlightedCategory}
                onRecsChange={setEditedRecs}
              />
            </section>

            {/* PDF Download */}
            {analysis && editedAnalysis && (
              <section aria-label="Download Report">
                <PdfDownloadButton analysis={editedAnalysis} />
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
