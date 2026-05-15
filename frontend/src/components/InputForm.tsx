import { useState } from "react";
import type {
  AnalyzeRequest,
  TrafficLevel,
  TransportProblem,
  TimePeriod,
  DayType,
  AffectedGroup,
  WeatherCondition,
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
  "Morning Peak (6-9am)",
  "Off-Peak (9am-12pm)",
  "Afternoon Peak (12-3pm)",
  "Evening Peak (3-7pm)",
  "Night (7pm-6am)",
];

const DAY_TYPES: DayType[] = ["Weekday", "Weekend", "Public Holiday"];

const AFFECTED_GROUPS: AffectedGroup[] = [
  "Commuters",
  "School children",
  "Pedestrians",
  "Cyclists",
  "Residents",
  "Commercial vehicles",
];

const WEATHER_OPTIONS: WeatherCondition[] = ["Clear", "Light Rain", "Heavy Rain", "Fog", "N/A"];

const BUDGET_RANGES: BudgetRange[] = [
  "Under RM10k",
  "RM10k-50k",
  "RM50k-100k",
  "RM100k-200k",
  "RM200k-500k",
  "RM500k-1mil",
  "Above RM1mil",
  "Custom / Lain-lain",
];

const POLICY_OPTIONS: PolicyOption[] = [
  "None",
  "Speed limit enforcement",
  "Parking enforcement",
  "Bus lane implementation",
  "Traffic signal optimization",
];

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Multi-select chip component
// ---------------------------------------------------------------------------

function MultiSelect<T extends string>({
  id,
  options,
  selected,
  onChange,
  max,
  error,
}: {
  id: string;
  options: T[];
  selected: T[];
  onChange: (val: T[]) => void;
  max?: number;
  error?: string;
}) {
  const toggle = (opt: T) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else if (!max || selected.length < max) {
      onChange([...selected, opt]);
    }
  };

  return (
    <div id={id} style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        const atMax = !!max && selected.length >= max && !active;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
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
      {error && <p style={{ ...errorTextStyle, width: "100%" }}>{error}</p>}
    </div>
  );
}

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
  const [timePeriod, setTimePeriod] = useState<TimePeriod | "">("");
  const [dayType, setDayType] = useState<DayType | "">("");
  const [affectedGroups, setAffectedGroups] = useState<AffectedGroup[]>([]);

  // Step 3 — Conditions
  const [weather, setWeather] = useState<WeatherCondition | "">("");
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
    if (affectedGroups.length === 0) e.affectedGroups = "Pilih sekurang-kurangnya 1 kumpulan / Select at least 1 group";
    if (!weather) e.weather = "Sila pilih cuaca / Please select weather";
    if (!budgetRange) e.budgetRange = "Sila pilih julat bajet / Please select budget range";
    if (budgetRange === "Custom / Lain-lain" && !exactBudget.trim()) {
      e.exactBudget = "Sila masukkan bajet tepat / Please enter exact budget";
    }
    if (exactBudget.trim()) {
      const parsed = parseFloat(exactBudget.trim());
      if (isNaN(parsed) || parsed <= 0) {
        e.exactBudget = "Bajet mesti lebih daripada 0 / Budget must be greater than 0";
      } else {
        // Check max 2 decimal places
        const decimalPart = exactBudget.trim().split(".")[1];
        if (decimalPart && decimalPart.length > 2) {
          e.exactBudget = "Sila masukkan nombor sah / Please enter a valid amount (max 2 decimal places)";
        }
      }
    }    setErrors(e);
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
      time_period: timePeriod as TimePeriod,
      day_type: dayType as DayType,
      affected_groups: affectedGroups,
      weather: weather as WeatherCondition,
      budget_range: budgetRange as BudgetRange,
      exact_budget: exactBudget.trim()
        ? parseFloat(exactBudget.trim())
        : undefined,
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
    // Auto-select street if only one option
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
        <p style={stepHeadingStyle}>Langkah 1 / Step 1 — Lokasi / Location</p>

        {/* State — derived from selected city */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Negeri / State</label>
          <div style={{
            ...selectStyle,
            backgroundColor: "#F3F4F6",
            color: "#6B7280",
            cursor: "not-allowed",
          }}>
            {city ? CITY_MAP_CONFIG[city as City].state : "— pilih daerah dahulu / select city first —"}
          </div>
        </div>

        {/* City */}
        <div style={fieldStyle}>
          <label htmlFor="city" style={labelStyle}>
            Daerah / City <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select
            id="city"
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            style={errors.city ? errorSelectStyle : selectStyle}
          >
            <option value="">-- Pilih daerah / Select city --</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.city && <p style={errorTextStyle}>{errors.city}</p>}
        </div>

        {/* Street — cascades from city */}
        <div style={fieldStyle}>
          <label htmlFor="street" style={labelStyle}>
            Jalan / Street <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select
            id="street"
            value={street}
            onChange={(e) => {
              setStreet(e.target.value);
              setErrors((prev) => ({ ...prev, street: "" }));
            }}
            disabled={!city}
            style={errors.street ? errorSelectStyle : { ...selectStyle, color: !city ? "#9CA3AF" : "#111827" }}
          >
            <option value="">
              {city ? "-- Pilih jalan / Select street --" : "-- Pilih daerah dahulu / Select city first --"}
            </option>
            {streets.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.street && <p style={errorTextStyle}>{errors.street}</p>}
        </div>
      </div>

      {/* ── STEP 2: SITUATION ── */}
      <div style={sectionStyle}>
        <p style={stepHeadingStyle}>Langkah 2 / Step 2 — Situasi / Situation</p>

        {/* Traffic level */}
        <div style={fieldStyle}>
          <label htmlFor="traffic-level" style={labelStyle}>
            Tahap Trafik / Traffic Level <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select
            id="traffic-level"
            value={trafficLevel}
            onChange={(e) => {
              setTrafficLevel(e.target.value as TrafficLevel);
              setErrors((prev) => ({ ...prev, trafficLevel: "" }));
            }}
            style={errors.trafficLevel ? errorSelectStyle : selectStyle}
          >
            <option value="">-- Pilih tahap / Select level --</option>
            {TRAFFIC_LEVELS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.trafficLevel && <p style={errorTextStyle}>{errors.trafficLevel}</p>}
        </div>

        {/* Transport problems — multi-select, max 3 */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Masalah Pengangkutan / Transport Problems <span style={{ color: "#DC2626" }}>*</span>
            <span style={{ fontWeight: 400, color: "#6B7280", marginLeft: "0.25rem" }}>(pilih 1–3)</span>
          </label>
          <MultiSelect
            id="transport-problems"
            options={TRANSPORT_PROBLEMS}
            selected={transportProblems}
            onChange={(val) => {
              setTransportProblems(val);
              setErrors((prev) => ({ ...prev, transportProblems: "" }));
            }}
            max={3}
            error={errors.transportProblems}
          />
        </div>

        {/* Time period */}
        <div style={fieldStyle}>
          <label htmlFor="time-period" style={labelStyle}>
            Tempoh Masa / Time Period <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select
            id="time-period"
            value={timePeriod}
            onChange={(e) => {
              setTimePeriod(e.target.value as TimePeriod);
              setErrors((prev) => ({ ...prev, timePeriod: "" }));
            }}
            style={errors.timePeriod ? errorSelectStyle : selectStyle}
          >
            <option value="">-- Pilih tempoh / Select period --</option>
            {TIME_PERIODS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.timePeriod && <p style={errorTextStyle}>{errors.timePeriod}</p>}
        </div>

        {/* Day type */}
        <div style={fieldStyle}>
          <label htmlFor="day-type" style={labelStyle}>
            Jenis Hari / Day Type <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select
            id="day-type"
            value={dayType}
            onChange={(e) => {
              setDayType(e.target.value as DayType);
              setErrors((prev) => ({ ...prev, dayType: "" }));
            }}
            style={errors.dayType ? errorSelectStyle : selectStyle}
          >
            <option value="">-- Pilih jenis hari / Select day type --</option>
            {DAY_TYPES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {errors.dayType && <p style={errorTextStyle}>{errors.dayType}</p>}
        </div>

        {/* Affected groups — multi-select */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Kumpulan Terjejas / Affected Groups <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <MultiSelect
            id="affected-groups"
            options={AFFECTED_GROUPS}
            selected={affectedGroups}
            onChange={(val) => {
              setAffectedGroups(val);
              setErrors((prev) => ({ ...prev, affectedGroups: "" }));
            }}
            error={errors.affectedGroups}
          />
        </div>
      </div>

      {/* ── STEP 3: CONDITIONS ── */}
      <div style={sectionStyle}>
        <p style={stepHeadingStyle}>Langkah 3 / Step 3 — Keadaan / Conditions</p>

        {/* Weather */}
        <div style={fieldStyle}>
          <label htmlFor="weather" style={labelStyle}>
            Cuaca / Weather <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select
            id="weather"
            value={weather}
            onChange={(e) => {
              setWeather(e.target.value as WeatherCondition);
              setErrors((prev) => ({ ...prev, weather: "" }));
            }}
            style={errors.weather ? errorSelectStyle : selectStyle}
          >
            <option value="">-- Pilih cuaca / Select weather --</option>
            {WEATHER_OPTIONS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          {errors.weather && <p style={errorTextStyle}>{errors.weather}</p>}
        </div>

        {/* Budget range */}
        <div style={fieldStyle}>
          <label htmlFor="budget-range" style={labelStyle}>
            Julat Bajet / Budget Range <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select
            id="budget-range"
            value={budgetRange}
            onChange={(e) => {
              setBudgetRange(e.target.value as BudgetRange);
              setErrors((prev) => ({ ...prev, budgetRange: "", exactBudget: "" }));
            }}
            style={errors.budgetRange ? errorSelectStyle : selectStyle}
          >
            <option value="">-- Pilih julat / Select range --</option>
            {BUDGET_RANGES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {errors.budgetRange && <p style={errorTextStyle}>{errors.budgetRange}</p>}
        </div>

        {/* Exact budget — always shown, overrides range limit if filled */}
        <div style={fieldStyle}>
          <label htmlFor="exact-budget" style={labelStyle}>
            Bajet Tepat / Exact Budget
            <span style={{ fontWeight: 400, color: "#6B7280", marginLeft: "0.25rem" }}>
              {budgetRange === "Custom / Lain-lain" ? (
                <span style={{ color: "#DC2626" }}> *</span>
              ) : " (pilihan / optional — overrides range)"}
            </span>
          </label>
          {/* RM prefix + number input */}
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <span style={{
              display: "flex",
              alignItems: "center",
              padding: "0 0.75rem",
              backgroundColor: "#F3F4F6",
              border: errors.exactBudget ? "1px solid #DC2626" : "1px solid #D1D5DB",
              borderRight: "none",
              borderRadius: "0.375rem 0 0 0.375rem",
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#6B7280",
              whiteSpace: "nowrap",
            }}>
              RM
            </span>
            <input
              id="exact-budget"
              type="number"
              min="0"
              step="0.01"
              value={exactBudget}
              onChange={(e) => {
                setExactBudget(e.target.value);
                setErrors((prev) => ({ ...prev, exactBudget: "" }));
              }}
              placeholder="e.g. 150000"
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                border: errors.exactBudget ? "1px solid #DC2626" : "1px solid #D1D5DB",
                borderLeft: "none",
                borderRadius: "0 0.375rem 0.375rem 0",
                fontSize: "0.9375rem",
                backgroundColor: "#fff",
                color: "#111827",
                outline: "none",
              }}
            />
          </div>
          {errors.exactBudget && <p style={errorTextStyle}>{errors.exactBudget}</p>}
          {exactBudget.trim() && !errors.exactBudget && budgetRange !== "Custom / Lain-lain" && (
            <p style={{ fontSize: "0.75rem", color: "#2563EB", marginTop: "0.25rem" }}>
              ℹ Nilai tepat akan digunakan sebagai had / Exact value will be used as limit
            </p>
          )}
        </div>

        {/* Policy to evaluate — optional */}
        <div style={fieldStyle}>
          <label htmlFor="policy" style={labelStyle}>
            Dasar untuk Dinilai / Policy to Evaluate
            <span style={{ fontWeight: 400, color: "#6B7280", marginLeft: "0.25rem" }}>(pilihan / optional)</span>
          </label>
          <select
            id="policy"
            value={policyToEvaluate}
            onChange={(e) => setPolicyToEvaluate(e.target.value as PolicyOption)}
            style={selectStyle}
          >
            {POLICY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
        style={{
          width: "100%",
          padding: "0.75rem 1.25rem",
          backgroundColor: isLoading ? "#9CA3AF" : "#1D4ED8",
          color: "#fff",
          fontWeight: 700,
          fontSize: "1rem",
          border: "none",
          borderRadius: "0.375rem",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "background-color 0.2s",
          letterSpacing: "0.02em",
        }}
      >
        {isLoading ? "Menganalisis... / Analysing..." : "Jana Cadangan / Generate Recommendations"}
      </button>
    </form>
  );
}
