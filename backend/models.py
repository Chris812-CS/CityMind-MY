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
    state: str
    city: str
    street: str
    location_context: str = ""

    # Step 2 — Situation
    traffic_level: TrafficLevel
    transport_problems: list[TransportProblem]
    time_period: TimePeriod
    day_type: DayType
    affected_groups: list[AffectedGroup]

    # Step 3 — Conditions
    weather: WeatherCondition
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
    cost_breakdown: list[CostBreakdownItem] = []


class Recommendations(BaseModel):
    traffic_flow: list[Recommendation]
    public_transport: list[Recommendation]
    walkability: list[Recommendation]
    policy_enforcement: list[Recommendation]


class SituationMetrics(BaseModel):
    severity_score: int
    daily_time_wasted_minutes: int
    accident_risk: Literal["Low", "Moderate", "High", "Critical"]
    estimated_affected_commuters: int
    congestion_description: str


class BudgetEstimates(BaseModel):
    traffic_flow: float
    public_transport: float
    walkability: float
    policy_enforcement: float
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


class ReportRequest(BaseModel):
    analysis: AnalysisResponse
