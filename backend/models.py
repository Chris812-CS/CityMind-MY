from pydantic import BaseModel, ConfigDict, field_validator
from enum import Enum
from typing import Literal


class PriorityLevel(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"


# ---------------------------------------------------------------------------
# Structured request enums
# ---------------------------------------------------------------------------

TrafficLevel = Literal["Light", "Moderate", "Heavy", "Gridlock"]

TransportProblem = Literal[
    "Accident",
    "Roadwork",
    "Illegal parking",
    "Flooding",
    "Peak hour congestion",
    "School traffic",
    "Event traffic",
]

TimePeriod = Literal[
    "Morning Peak (6am-9am)",
    "Off Peak (9am-12pm)",
    "Afternoon Peak (12pm-3pm)",
    "Evening Peak (3pm-7pm)",
    "Night (7pm-6am)",
]

DayType = Literal["Weekday", "Weekend", "Public Holiday"]

BudgetRange = Literal[
    "Under RM10k",
    "RM10k-50k",
    "RM50k-100k",
    "RM100k-200k",
    "RM200k-500k",
    "RM500k-1mil",
    "Above RM1mil",
    "Custom / Lain-lain",
]

PolicyOption = Literal[
    "Speed limit enforcement",
    "Parking enforcement",
    "Bus lane implementation",
    "Traffic signal optimization",
    "None",
]


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    # Step 1 — Location
    state: str
    city: str
    street: str
    location_context: str = ""

    # Step 2 — Situation
    traffic_level: TrafficLevel
    transport_problems: list[TransportProblem]   # 1–3
    additional_context: str = ""   # optional free text, max 300 chars
    time_period: TimePeriod
    day_type: DayType

    # Step 3 — Conditions (budget only; weather/affected groups inferred by LLM)
    budget_range: BudgetRange
    exact_budget: float | None = None
    policy_to_evaluate: PolicyOption

    @field_validator("exact_budget")
    @classmethod
    def validate_exact_budget(cls, v: float | None) -> float | None:
        if v is not None:
            if v <= 0:
                raise ValueError("Budget must be greater than 0")
            if round(v, 2) != v:
                raise ValueError("Max 2 decimal places allowed")
        return v


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class Conditions(BaseModel):
    weather: str = ""
    time_of_day: str = ""
    event_type: str = ""


class CostBreakdownItem(BaseModel):
    item: str
    unit: str
    qty: float
    unit_cost: float
    total: float


class Recommendation(BaseModel):
    action: str
    responsible_party: str
    estimated_timeline: str
    priority_level: PriorityLevel
    estimated_cost: int = 0
    rationale: str = ""
    expected_impact: str = ""   # short qualitative impact, max ~10 words
    cost_breakdown: list[CostBreakdownItem] = []


class Recommendations(BaseModel):
    traffic_flow: list[Recommendation]
    public_transport: list[Recommendation]
    walkability: list[Recommendation]
    policy_enforcement: list[Recommendation]
    affected_groups: list[Recommendation] = []


class SituationMetrics(BaseModel):
    severity_score: int
    daily_time_wasted_minutes: int
    accident_risk: Literal["Low", "Moderate", "High", "Critical"]
    estimated_affected_commuters: int
    congestion_description: str
    inferred_affected_groups: list[str] = []   # e.g. ["Commuters", "School children"]


class BudgetEstimates(BaseModel):
    traffic_flow: float
    public_transport: float
    walkability: float
    policy_enforcement: float
    affected_groups: float = 0.0
    total: float


class DeferredRecommendation(BaseModel):
    action: str
    responsible_party: str
    estimated_timeline: str
    priority_level: PriorityLevel
    estimated_cost: int = 0
    rationale: str = ""
    cost_breakdown: list[CostBreakdownItem] = []
    category: str = ""


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    reference_number: str
    summary: str
    location_context: str
    conditions_applied: Conditions
    constraints_applied: list[str]
    recommendations: Recommendations
    risk_assessment: str
    priority_actions: list[str]
    situation_metrics: SituationMetrics | None = None
    budget_estimates: BudgetEstimates
    budget_total: int = 0
    warnings: list[str] = []
    has_edited_costs: bool = False
    deferred_recommendations: list[DeferredRecommendation] = []
    additional_context_used: bool = True


class ReportRequest(BaseModel):
    analysis: AnalysisResponse
