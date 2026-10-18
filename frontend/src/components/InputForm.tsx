import { useState } from "react";
import type {
  AnalyzeRequest,
  TrafficLevel,
  TransportProblem,
  TimePeriod,
  DayType,
  BudgetRange,
  PolicyOption,
} from "../types/api";
import {
  CITIES,
  STREETS_BY_CITY,
  CITY_MAP_CONFIG,
} from "../constants/locations";
import type { City, LocationOption } from "../constants/locations";

interface InputFormProps {
  onSubmit: (payload: AnalyzeRequest) => void;
  isLoading: boolean;
  onLocationChange?: (location: LocationOption | null) => void;
}

// ---------------------------------------------------------------------------
// Option lists
// ---------------------------------------------------------------------------

const TRAFFIC_LEVELS: TrafficLevel[] = ["Light", "Moderate", "Heavy", "Gridlock"];

const TRANSPORT_PROBLEMS: TransportProblem[] = [
  "Accident",
  "Roadwork",
  "Illegal parking",
  "Flooding",
  "Peak hour congestion",
  "School traffic",
  "Event traffic",
];

const TIME_PERIODS: TimePeriod[] = [
  "Morning Peak (6am-9am)",
  "Off Peak (9am-12pm)",
  "Afternoon Peak (12pm-3pm)",
  "Evening Peak (3pm-7pm)",
  "Night (7pm-6am)",
];

const DAY_TYPES: DayType[] = ["Weekday", "Weekend", "Public Holiday"];

const BUDGET_RANGES: BudgetRange[] = [
  "Under RM10k",
  "RM10k-50k",
  "RM50k-100k",
  "RM100k-200k",
  "RM200k-500k",
  "RM500k-1mil",
  "Above RM1mil",
  "Custom",
];

const POLICY_OPTIONS: PolicyOption[] = [
  "None",
  "Speed limit enforcement",
  "Parking enforcement",
  "Bus lane implementation",
  "Traffic signal optimization",
];

// Max length for additional context free text
const MAX_ADDITIONAL_CONTEXT = 300;

// Strip special characters — keep alphanumerics, spaces, common punctuation
function stripSpecialChars(value: string): string {
  return value.replace(/[^a-zA-Z0-9\s.,\-/()\u00C0-\u024F\u4E00-\u9FFF]/g, "");
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid #D1D5DB",
  borderRadius: "0.375rem",
  fontSize: "0.9375rem",
  backgroundColor: "#fff",
  color: "#111827",
};

const errorSelectStyle: React.CSSProperties = {
  ...selectStyle,
  border: "1px solid #DC2626",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: "0.875rem",
  marginBottom: "0.25rem",
  color: "#374151",
};

const fieldStyle: React.CSSProperties = { marginBottom: "0.875rem" };

const stepHeadingStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#6B7280",
  marginBottom: "0.75rem",
  paddingBottom: "0.375rem",
  borderBottom: "1px solid #E5E7EB",
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: "#F9FAFB",
  border: "1px solid #E5E7EB",
  borderRadius: "0.5rem",
  padding: "1rem",
  marginBottom: "1rem",
};

const errorTextStyle: React.CSSProperties = {
  color: "#DC2626",
  fontSize: "0.8125rem",
  marginTop: "0.25rem",
};

const textAreaStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid #D1D5DB",
  borderRadius: "0.375rem",
  fontSize: "0.875rem",
  backgroundColor: "#fff",
  color: "#111827",
  resize: "vertical" as const,
  fontFamily: "inherit",
  boxSizing: "border-box" as const,
};

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export default function InputForm({ onSubmit, isLoading, onLocationChange }: InputFormProps) {
  // Step 1 — Location
  const [city, setCity] = useState<City | "">("");
  const [street, setStreet] = useState("");

  // Step 2 — Situation
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel | "">("");
  const [transportProblems, setTransportProblems] = useState<TransportProblem[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [timePeriod, setTimePeriod] = useState<TimePeriod | "">("");
  const [dayType, setDayType] = useState<DayType | "">("");

  // Step 3 — Budget & Policy
  const [budgetRange, setBudgetRange] = useState<BudgetRange | "">("");
  const [exactBudget, setExactBudget] = useState<string>("");
  const [policyToEvaluate, setPolicyToEvaluate] = useState<PolicyOption>("None");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!city) e.city = "Sila pilih daerah / Please select a city";
    if (!street) e.street = "Sila pilih jalan / Please select a street";
    if (!trafficLevel) e.trafficLevel = "Sila pilih tahap trafik / Please select traffic level";
    if (transportProblems.length === 0) e.transportProblems = "Pilih sekurang-kurangnya 1 masalah / Select at least 1 problem";
    if (!timePeriod) e.timePeriod = "Sila pilih tempoh masa / Please select time period";
    if (!dayType) e.dayType = "Sila pilih jenis hari / Please select day type";
    if (!budgetRange) e.budgetRange = "Sila pilih julat bajet / Please select budget range";
    if (budgetRange === "Custom" && !exactBudget.trim()) {
      e.exactBudget = "Sila masukkan bajet tepat / Please enter exact budget";
    }
    if (exactBudget.trim()) {
      const parsed = parseFloat(exactBudget.trim());
      if (isNaN(parsed) || parsed <= 0) {
        e.exactBudget = "Bajet mesti lebih daripada 0 / Budget must be greater than 0";
      } else {
        const decimalPart = exactBudget.trim().split(".")[1];
        if (decimalPart && decimalPart.length > 2) {
          e.exactBudget = "Sila masukkan nombor sah / Please enter a valid amount (max 2 decimal places)";
        }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cityConfig = CITY_MAP_CONFIG[city as City];

    const payload: AnalyzeRequest = {
      state: cityConfig.state,
      city: city as City,
      street,
      location_context: cityConfig.context,
      traffic_level: trafficLevel as TrafficLevel,
      transport_problems: transportProblems,
      additional_context: additionalContext.trim() ? stripSpecialChars(additionalContext.trim()).slice(0, MAX_ADDITIONAL_CONTEXT) : undefined,
      time_period: timePeriod as TimePeriod,
      day_type: dayType as DayType,
      budget_range: budgetRange as BudgetRange,
      exact_budget: exactBudget.trim() ? parseFloat(exactBudget.trim()) : undefined,
      policy_to_evaluate: policyToEvaluate,
    };

    onSubmit(payload);
  };

  const handleCityChange = (val: string) => {
    const c = val as City | "";
    setCity(c);
    setErrors((prev) => ({ ...prev, city: "", street: "" }));
    const loc = c ? CITY_MAP_CONFIG[c as City] : null;
    onLocationChange?.(loc ?? null);
    if (c) {
      const streets = STREETS_BY_CITY[c as City];
      setStreet(streets.length === 1 ? streets[0] : "");
    } else {
      setStreet("");
    }
  };

  const streets = city ? STREETS_BY_CITY[city as City] : [];

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── STEP 1: LOCATION ── */}
      <div style={sectionStyle}>
        <p style={stepHeadingStyle}>Step 1 — Location</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>State</label>
          <div style={{ ...selectStyle, backgroundColor: "#F3F4F6", color: "#6B7280", cursor: "not-allowed" }}>
            {city ? CITY_MAP_CONFIG[city as City].state : "— Select city first —"}
          </div>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="city" style={labelStyle}>
            City <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select id="city" value={city} onChange={(e) => handleCityChange(e.target.value)}
            style={errors.city ? errorSelectStyle : selectStyle}>
            <option value="">-- Select city --</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.city && <p style={errorTextStyle}>{errors.city}</p>}
        </div>

        <div style={fieldStyle}>
          <label htmlFor="street" style={labelStyle}>
            Street <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select id="street" value={street}
            onChange={(e) => { setStreet(e.target.value); setErrors((prev) => ({ ...prev, street: "" })); }}
            disabled={!city}
            style={errors.street ? errorSelectStyle : { ...selectStyle, color: !city ? "#9CA3AF" : "#111827" }}>
            <option value="">{city ? "-- Select street --" : "-- Select Street First --"}</option>
            {streets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.street && <p style={errorTextStyle}>{errors.street}</p>}
        </div>
      </div>

      {/* ── STEP 2: SITUATION ── */}
      <div style={sectionStyle}>
        <p style={stepHeadingStyle}>Step 2 — Situation</p>

        {/* 1. Traffic Level */}
        <div style={fieldStyle}>
          <label htmlFor="traffic-level" style={labelStyle}>
            Traffic Level <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select id="traffic-level" value={trafficLevel}
            onChange={(e) => { setTrafficLevel(e.target.value as TrafficLevel); setErrors((prev) => ({ ...prev, trafficLevel: "" })); }}
            style={errors.trafficLevel ? errorSelectStyle : selectStyle}>
            <option value="">-- Select level --</option>
            {TRAFFIC_LEVELS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.trafficLevel && <p style={errorTextStyle}>{errors.trafficLevel}</p>}
        </div>

        {/* 2. Transport Problems — multi-select chips, max 3 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Transport Problems <span style={{ color: "#DC2626" }}>*</span>
            <span style={{ display: "block", fontWeight: 400, color: "#6B7280", marginTop: "0.125rem" }}>(Select 1–3)</span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {TRANSPORT_PROBLEMS.map((opt) => {
              const active = transportProblems.includes(opt);
              const atMax = transportProblems.length >= 3 && !active;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setTransportProblems((prev) =>
                      active ? prev.filter((p) => p !== opt) : atMax ? prev : [...prev, opt]
                    );
                    setErrors((prev) => ({ ...prev, transportProblems: "" }));
                  }}
                  disabled={atMax}
                  style={{
                    padding: "0.3125rem 0.625rem",
                    borderRadius: "9999px",
                    fontSize: "0.8125rem",
                    fontWeight: active ? 600 : 400,
                    border: active ? "1.5px solid #1D4ED8" : "1px solid #D1D5DB",
                    backgroundColor: active ? "#EFF6FF" : "#fff",
                    color: active ? "#1D4ED8" : atMax ? "#9CA3AF" : "#374151",
                    cursor: atMax ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {errors.transportProblems && <p style={errorTextStyle}>{errors.transportProblems}</p>}
        </div>

        {/* Additional context — always optional, max 300 chars */}
        <div style={fieldStyle}>
          <label htmlFor="additional-context" style={labelStyle}>
            Additional Context
            <span style={{ fontWeight: 400, color: "#6B7280", marginLeft: "0.25rem" }}>(optional)</span>
          </label>
          <textarea id="additional-context" value={additionalContext}
            onChange={(e) => {
              const stripped = stripSpecialChars(e.target.value);
              setAdditionalContext(stripped.slice(0, MAX_ADDITIONAL_CONTEXT));
            }}
            rows={2}
            maxLength={MAX_ADDITIONAL_CONTEXT}
            placeholder="Any additional context? e.g. drain exploded due to old infrastructure, ongoing since last week..."
            style={textAreaStyle} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
            <span style={{ fontSize: "0.6875rem", color: additionalContext.length >= MAX_ADDITIONAL_CONTEXT ? "#DC2626" : "#9CA3AF" }}>
              {additionalContext.length}/{MAX_ADDITIONAL_CONTEXT}
            </span>
          </div>
        </div>

        {/* 4. Time Context */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
          <div style={fieldStyle}>
            <label htmlFor="time-period" style={labelStyle}>
              Period <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <select id="time-period" value={timePeriod}
              onChange={(e) => { setTimePeriod(e.target.value as TimePeriod); setErrors((prev) => ({ ...prev, timePeriod: "" })); }}
              style={errors.timePeriod ? errorSelectStyle : selectStyle}>
              <option value="">-- Select Time --</option>
              {TIME_PERIODS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.timePeriod && <p style={errorTextStyle}>{errors.timePeriod}</p>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="day-type" style={labelStyle}>
              Day Type <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <select id="day-type" value={dayType}
              onChange={(e) => { setDayType(e.target.value as DayType); setErrors((prev) => ({ ...prev, dayType: "" })); }}
              style={errors.dayType ? errorSelectStyle : selectStyle}>
              <option value="">-- Select Day Type --</option>
              {DAY_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.dayType && <p style={errorTextStyle}>{errors.dayType}</p>}
          </div>
        </div>
      </div>

      {/* ── STEP 3: BUDGET & POLICY ── */}
      <div style={sectionStyle}>
        <p style={stepHeadingStyle}>Step 3 — Budget & Policy</p>

        {/* 5. Budget Range */}
        <div style={fieldStyle}>
          <label htmlFor="budget-range" style={labelStyle}>
            Budget Range <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select id="budget-range" value={budgetRange}
            onChange={(e) => { setBudgetRange(e.target.value as BudgetRange); setErrors((prev) => ({ ...prev, budgetRange: "", exactBudget: "" })); }}
            style={errors.budgetRange ? errorSelectStyle : selectStyle}>
            <option value="">-- Select range --</option>
            {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          {errors.budgetRange && <p style={errorTextStyle}>{errors.budgetRange}</p>}
        </div>

        {/* Exact budget */}
        <div style={fieldStyle}>
          <label htmlFor="exact-budget" style={labelStyle}>
            Exact Budget
            <span style={{ fontWeight: 400, color: "#6B7280", marginLeft: "0.25rem" }}>
              {budgetRange === "Custom"
                ? <span style={{ color: "#DC2626" }}> *</span>
                : " (optional — overrides range)"}
            </span>
          </label>
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <span style={{
              display: "flex", alignItems: "center", padding: "0 0.75rem",
              backgroundColor: "#F3F4F6",
              border: errors.exactBudget ? "1px solid #DC2626" : "1px solid #D1D5DB",
              borderRight: "none", borderRadius: "0.375rem 0 0 0.375rem",
              fontSize: "0.9375rem", fontWeight: 600, color: "#6B7280", whiteSpace: "nowrap",
            }}>RM</span>
            <input id="exact-budget" type="number" min="0" step="0.01" value={exactBudget}
              onChange={(e) => { setExactBudget(e.target.value); setErrors((prev) => ({ ...prev, exactBudget: "" })); }}
              placeholder="e.g. 150000"
              style={{
                flex: 1, padding: "0.5rem 0.75rem",
                border: errors.exactBudget ? "1px solid #DC2626" : "1px solid #D1D5DB",
                borderLeft: "none", borderRadius: "0 0.375rem 0.375rem 0",
                fontSize: "0.9375rem", backgroundColor: "#fff", color: "#111827", outline: "none",
              }} />
          </div>
          {errors.exactBudget && <p style={errorTextStyle}>{errors.exactBudget}</p>}
          {exactBudget.trim() && !errors.exactBudget && budgetRange !== "Custom" && (
            <p style={{ fontSize: "0.75rem", color: "#2563EB", marginTop: "0.25rem" }}>
              ℹ Exact value will be used as limit
            </p>
          )}
        </div>

        {/* 6. Policy to Evaluate */}
        <div style={fieldStyle}>
          <label htmlFor="policy" style={labelStyle}>
            Policy to Evaluate
            <span style={{ fontWeight: 400, color: "#6B7280", marginLeft: "0.25rem" }}>(optional)</span>
          </label>
          <select id="policy" value={policyToEvaluate}
            onChange={(e) => setPolicyToEvaluate(e.target.value as PolicyOption)}
            style={selectStyle}>
            {POLICY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* ── Submit ── */}
      <button type="submit" disabled={isLoading} aria-busy={isLoading}
        style={{
          width: "100%", padding: "0.75rem 1.25rem",
          backgroundColor: isLoading ? "#9CA3AF" : "#1D4ED8",
          color: "#fff", fontWeight: 700, fontSize: "1rem",
          border: "none", borderRadius: "0.375rem",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "background-color 0.2s", letterSpacing: "0.02em",
        }}>
        {isLoading ? "Analysing..." : "Generate Recommendations"}
      </button>
    </form>
  );
}
