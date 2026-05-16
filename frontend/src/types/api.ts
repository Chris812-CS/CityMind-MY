export type PriorityLevel = "Critical" | "High" | "Medium";

export type RecommendationCategory =
  | "traffic_flow"
  | "public_transport"
  | "walkability"
  | "policy_enforcement"
  | "affected_groups";

// ---------------------------------------------------------------------------
// Structured request — replaces free-text conditions + constraints
// ---------------------------------------------------------------------------

export type TrafficLevel = "Light" | "Moderate" | "Heavy" | "Gridlock";

export type TransportProblem =
  | "Accident"
  | "Roadwork"
  | "Illegal parking"
  | "Flooding"
  | "Peak hour congestion"
  | "School traffic"
  | "Event traffic";

export type TimePeriod =
  | "Morning Peak (6am-9am)"
  | "Off Peak (9am-12pm)"
  | "Afternoon Peak (12pm-3pm)"
  | "Evening Peak (3pm-7pm)"
  | "Night (7pm-6am)";

export type DayType = "Weekday" | "Weekend" | "Public Holiday";

export type BudgetRange =
  | "Under RM10k"
  | "RM10k-50k"
  | "RM50k-100k"
  | "RM100k-200k"
  | "RM200k-500k"
  | "RM500k-1mil"
  | "Above RM1mil"
  | "Custom / Lain-lain";

export type PolicyOption =
  | "Speed limit enforcement"
  | "Parking enforcement"
  | "Bus lane implementation"
  | "Traffic signal optimization"
  | "None";

// ---------------------------------------------------------------------------
// Request payload
// ---------------------------------------------------------------------------

export interface AnalyzeRequest {
  // Step 1 — Location
  state: string;
  city: string;
  street: string;
  location_context: string;

  // Step 2 — Situation
  traffic_level: TrafficLevel;
  transport_problems: TransportProblem[];   // 1–3 selections
  additional_context?: string;    // optional free text, max 300 chars
  time_period: TimePeriod;
  day_type: DayType;

  // Step 3 — Conditions (budget only; weather/affected groups inferred by LLM)
  budget_range: BudgetRange;
  exact_budget?: number;
  policy_to_evaluate: PolicyOption;
}

// ---------------------------------------------------------------------------
// Response types (unchanged)
// ---------------------------------------------------------------------------

export interface Conditions {
  weather: string;
  time_of_day: string;
  event_type: string;
}

export interface CostBreakdownItem {
  item: string;
  unit: string;
  qty: number;
  unit_cost: number;
  total: number;
}

export interface Recommendation {
  action: string;
  responsible_party: string;
  estimated_timeline: string;
  priority_level: PriorityLevel;
  estimated_cost: number;
  rationale: string;
  cost_breakdown: CostBreakdownItem[];
}

export interface Recommendations {
  traffic_flow: Recommendation[];
  public_transport: Recommendation[];
  walkability: Recommendation[];
  policy_enforcement: Recommendation[];
  affected_groups: Recommendation[];
}

export interface DeferredRecommendation {
  action: string;
  responsible_party: string;
  estimated_timeline: string;
  priority_level: PriorityLevel;
  estimated_cost: number;
  rationale: string;
  cost_breakdown: CostBreakdownItem[];
  category: string;
}

export interface AnalysisResponse {
  reference_number: string;
  summary: string;
  location_context: string;
  conditions_applied: Conditions;
  constraints_applied: string[];
  recommendations: Recommendations;
  risk_assessment: string;
  priority_actions: string[];
  situation_metrics: SituationMetrics;
  budget_estimates: BudgetEstimates;
  budget_total?: number;
  warnings?: string[];
  has_edited_costs?: boolean;
  deferred_recommendations?: DeferredRecommendation[];
  additional_context_used?: boolean;  // true if LLM used the additional context, false if ignored
}

export type AccidentRisk = "Low" | "Moderate" | "High" | "Critical";

export interface SituationMetrics {
  severity_score: number;
  daily_time_wasted_minutes: number;
  accident_risk: AccidentRisk;
  estimated_affected_commuters: number;
  congestion_description: string;
  inferred_affected_groups: string[];   // e.g. ["Commuters", "School children", "Cyclists"]
}

export interface BudgetEstimates {
  traffic_flow: number;
  public_transport: number;
  walkability: number;
  policy_enforcement: number;
  affected_groups: number;
  total: number;
}
