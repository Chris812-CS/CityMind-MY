export type PriorityLevel = "Critical" | "High" | "Medium";

export type RecommendationCategory =
  | "traffic_flow"
  | "public_transport"
  | "walkability"
  | "policy_enforcement";

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
  | "Morning Peak (6-9am)"
  | "Off-Peak (9am-12pm)"
  | "Afternoon Peak (12-3pm)"
  | "Evening Peak (3-7pm)"
  | "Night (7pm-6am)";

export type DayType = "Weekday" | "Weekend" | "Public Holiday";

export type AffectedGroup =
  | "Commuters"
  | "School children"
  | "Pedestrians"
  | "Cyclists"
  | "Residents"
  | "Commercial vehicles";

export type WeatherCondition = "Clear" | "Light Rain" | "Heavy Rain" | "Fog" | "N/A";

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
  state: string;                  // e.g. "Selangor" or "W.P. Kuala Lumpur"
  city: string;                   // e.g. "Puchong" or "Kuala Lumpur"
  street: string;                 // e.g. "Jalan Puchong"
  location_context: string;       // verified context string from CITY_MAP_CONFIG

  // Step 2 — Situation
  traffic_level: TrafficLevel;
  transport_problems: TransportProblem[];   // 1–3 selections
  time_period: TimePeriod;
  day_type: DayType;
  affected_groups: AffectedGroup[];         // 1+ selections

  // Step 3 — Conditions
  weather: WeatherCondition;
  budget_range: BudgetRange;
  exact_budget?: number;          // optional override — float, max 2 decimal places
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
}

export type AccidentRisk = "Low" | "Moderate" | "High" | "Critical";

export interface SituationMetrics {
  severity_score: number;                    // 1–10
  daily_time_wasted_minutes: number;
  accident_risk: AccidentRisk;
  estimated_affected_commuters: number;
  congestion_description: string;
}

export interface BudgetEstimates {
  traffic_flow: number;
  public_transport: number;
  walkability: number;
  policy_enforcement: number;
  total: number;
}
