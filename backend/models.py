from pydantic import BaseModel, field_validator
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
    "Morning Peak (6-9am)",
    "Off-Peak (9am-12pm)",
    "Afternoon Peak (12-3pm)",
    "Evening Peak (3-7pm)",
    "Night (7pm-6am)",
]

DayType = Literal["Weekday", "Weekend", "Public Holiday"]

AffectedGroup = Literal[
    "Commuters",
    "School children",
    "Pedestrians",
    "Cyclists",
    "Residents",
    "Commercial vehicles",
]

WeatherCondition = Literal["Clear", "Light Rain", "Heavy Rain", "Fog", "N/A"]

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
    state: str                              # e.g. "Selangor" or "W.P. Kuala Lumpur"
    city: str                               # e.g. "Puchong" or "Kuala Lumpur"
    street: str                             # e.g. "Jalan Puchong"
    location_context: str = ""             # verified context string from frontend constants

    # Step 2 — Situation
    traffic_level: TrafficLevel
    transport_problems: list[TransportProblem]   # 1–3
    time_period: TimePeriod
    day_type: DayType
    affected_groups: list[AffectedGroup]         # 1+

    # Step 3 — Conditions
    weather: WeatherCondition
    budget_range: BudgetRange
    exact_budget: float | None = None   # optional override — takes precedence over range limit
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
    cost_breakdown: list[CostBreakdownItem] = []


class Recommendations(BaseModel):
    traffic_flow: list[Recommendation]
    public_transport: list[Recommendation]
    walkability: list[Recommendation]
    policy_enforcement: list[Recommendation]


class SituationMetrics(BaseModel):
    severity_score: int                    # 1–10
    daily_time_wasted_minutes: int
    accident_risk: Literal["Low", "Moderate", "High", "Critical"]
    estimated_affected_commuters: int
    congestion_description: str


class BudgetEstimates(BaseModel):
    traffic_flow: int
    public_transport: int
    walkability: int
    policy_enforcement: int
    total: int


class DeferredRecommendation(BaseModel):
    """A recommendation that has been deferred by the officer, with its cost breakdown."""
    action: str
    responsible_party: str
    estimated_timeline: str
    priority_level: PriorityLevel
    estimated_cost: int = 0
    rationale: str = ""
    cost_breakdown: list[CostBreakdownItem] = []
    category: str = ""


class AnalysisResponse(BaseModel):
    reference_number: str
    summary: str
    location_context: str
    conditions_applied: Conditions
    constraints_applied: list[str]
    recommendations: Recommendations
    risk_assessment: str
    priority_actions: list[str]
    situation_metrics: SituationMetrics
    budget_estimates: BudgetEstimates
    budget_total: int = 0           # sum of all recommendation estimated_cost values
    warnings: list[str] = []
    has_edited_costs: bool = False  # True when officer has manually adjusted costs
    deferred_recommendations: list[DeferredRecommendation] = []  # officer-deferred items


class ReportRequest(BaseModel):
    analysis: AnalysisResponse
