import React from "react";
import type { AnalysisResponse } from "../types/api";

interface SummaryBannerProps {
  analysis: AnalysisResponse | null;
}

const tagStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: "9999px",
  fontSize: "12px",
  fontWeight: 600,
  backgroundColor: "#1e3a5f",
  color: "#93c5fd",
  border: "1px solid #2563eb",
  whiteSpace: "nowrap",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#94a3b8",
  marginBottom: "4px",
};

const SummaryBanner: React.FC<SummaryBannerProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div style={{ backgroundColor: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: "8px", padding: "16px 20px", color: "#64748b", fontSize: "14px", textAlign: "center" }}>
        Please submit an analysis
      </div>
    );
  }

  const { conditions_applied, constraints_applied } = analysis;

  return (
    <div style={{ backgroundColor: "#0f172a", borderRadius: "8px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px", color: "#f1f5f9" }}>
      <div>
        <div style={labelStyle}>Location</div>
        <span style={{ fontSize: "15px", fontWeight: 600 }}>{analysis.location_context}</span>
      </div>
      <div>
        <div style={labelStyle}>Conditions</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {conditions_applied.weather && <span style={{ ...tagStyle, backgroundColor: "#1e3a5f", color: "#93c5fd", border: "1px solid #2563eb" }}>{conditions_applied.weather}</span>}
          {conditions_applied.time_of_day && <span style={{ ...tagStyle, backgroundColor: "#1e3a2f", color: "#86efac", border: "1px solid #16a34a" }}>{conditions_applied.time_of_day}</span>}
          {conditions_applied.event_type && <span style={{ ...tagStyle, backgroundColor: "#3b1f1f", color: "#fca5a5", border: "1px solid #dc2626" }}>{conditions_applied.event_type}</span>}
        </div>
      </div>
      {constraints_applied.length > 0 && (
        <div>
          <div style={labelStyle}>Constraints</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {constraints_applied.map((c, i) => (
              <span key={i} style={{ ...tagStyle, backgroundColor: "#2d1f3d", color: "#d8b4fe", border: "1px solid #7c3aed" }}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryBanner;
