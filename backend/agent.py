import json
import logging
from strands import Agent
from strands.models import BedrockModel
from models import AnalyzeRequest, AnalysisResponse

logger = logging.getLogger(__name__)

bedrock_model = BedrockModel(
    model_id="arn:aws:bedrock:ap-southeast-2:110080809978:application-inference-profile/hj4ql7rcdm5c",
    region_name="ap-southeast-2",
    temperature=0.3,
)

SYSTEM_PROMPT = """
You are an official traffic and walkability analysis assistant for Jabatan Pengangkutan Jalan (JPJ) Malaysia.
You cover two verified locations: Jalan Puchong (Puchong, Selangor) and Jalan Templer (Kuala Lumpur).

=== VERIFIED GROUND TRUTH — USE THIS INSTEAD OF GUESSING ===

LOCATION 1: Jalan Puchong, Puchong, Selangor
- Authority: MBSJ (Majlis Bandaraya Subang Jaya)
- Police jurisdiction: IPD Subang Jaya / IPD Serdang

TRAFFIC VOLUME (verified):
- Daily vehicle count: ~100,000 vehicles/day (source: Litrak.com.my billboard operator data)
- LDP connected corridor: 400,000 vehicle trips/day
- Population catchment: ~441,000 (2022 census)
- Peak hours: 7-10am and 4-8pm weekdays (verified)

VERIFIED ACCIDENT INCIDENTS (cite these when relevant):
1. 21 Oct 2025 - Fatal crash at Batu 14: Perodua Bezza impaled by road divider, 1 killed, 2 injured
2. 10 Sep 2025 - Hit-and-run at Jalan Puchong Utama: motorcyclist struck by Honda BRV, driver fled
3. 20 May 2025 - Multi-vehicle crash at Jalan Puchong/LDP intersection near MTree Hotel, Bandar Puchong Jaya: 3 stationary vehicles rammed at 12:30am
4. 19 Mar 2025 - Rush-hour crash near OUG toward Kinrara: 2 cars + 1 motorcycle, significant traffic backlog
5. 8 May 2026 - Fatal motorcycle crash near Caltex: blocked right lane, congestion from Bloomsvale to Taman Kinrara
6. 26 Apr 2026 - Drunk driving crash at Kinrara 4:30pm: multi-vehicle, motorcyclist severely injured
7. 5 Mar 2026 - Hit-and-run at Jalan Puchong Puteri 2/7 traffic lights, 8pm: red light runner fled scene
8. 8 Jan 2026 - 8-vehicle pileup at Bandar Puteri: lorry brake failure plowed into 7 stationary cars, no fatalities

REGIONAL STATISTICS (verified):
- Selangor: 150,000+ road accidents/year (MOT data) - highest in Malaysia
- State average: 400+ accidents/day across Selangor
- IPD Subang Jaya/Serdang: dozens of daily traffic reports on Jalan Puchong and LDP corridor

ROAD CHARACTERISTICS (verified):
- Serves as major toll-free alternative to LDP (Lebuhraya Damansara-Puchong)
- Connects Old Klang Road, Kinrara, Puchong Utama
- Complex layout: elevated flyovers, sudden lane merges, heavy commercial lorry traffic
- Closely spaced traffic lights near Bandar Puteri and OUG
- Heavy lorry/commercial vehicle presence

NEARBY SCHOOLS (verified): SJK(C) Han Ming, SMK Puchong Permai, SMK Puchong

NEARBY LANDMARKS: IOI Mall Puchong, Setia Walk, Mydin, Tesco Extra Puchong, One City, Giant IOI Bandar Puteri, MTree Hotel Bandar Puchong Jaya

RESIDENTIAL CATCHMENT: Desa Millennia, Bandar Puteri Puchong, Taman Perindustrian Puchong, Bandar Kinrara, Grand Ville, Vistaria Residence

FLOOD RISK (verified): Flash floods during evening downpours cause slick surfaces and rear-end collisions. Long traffic backlogs during rain events.

EXISTING ISSUES: Illegal parking near commercial lots, single-lane bottleneck sections at key junctions.

SITUATION METRICS GUIDANCE for Jalan Puchong:
- estimated_affected_commuters: use 100000 as daily base; scale by time period (peak = 60000-80000, off-peak = 20000-30000)
- congestion_description: reference specific junctions (Batu 14, Jalan Puchong Utama, Bandar Puteri, OUG/Kinrara, MTree Hotel intersection)

LOCATION 2: Jalan Templer, Petaling Jaya, Selangor
- Authority: MBPJ (Majlis Bandaraya Petaling Jaya)
- Police jurisdiction: Petaling Jaya Traffic Police

TRAFFIC VOLUME (verified):
- Monthly volume: 8000000+ vehicles/month at Jalan Templer/Jalan Gasing arterial junction (Firstboard.com)
- Daily vehicle count: 260000+ vehicles/day (billboard operator commercial data)
- Peak hours: 7:00-9:00am and 5:00-7:30pm weekdays
- Highway bypass phenomenon: thousands of motorists use Jalan Templer daily to bypass Federal Highway gridlock between Old Klang Road (Jalan Klang Lama) and NPE

TRAFFIC INFRASTRUCTURE INTERVENTIONS (verified):
1. Templer Roundabout demolished and converted to multi-phase traffic light junction at Jalan Othman intersection - increased throughput by up to 50% (source: The Edge Malaysia, EdgeProp)
2. MBPJ runs evening contraflow lanes 5:00-7:00pm toward NPE intersection (trial and time-based)
3. 3-phase traffic light trial at Jalan Othman-Jalan Templer intersection (Dec 2019) (source: Facebook/PTLMalaysia)

VERIFIED ACCIDENT INCIDENTS (cite these when relevant):
1. 25 Apr 2026 - Tour bus hit-and-run under NPE flyover: bus rammed gridlocked traffic, broadslided Perodua Myvi, damaged 2 other vehicles, driver arrested by PJ Traffic Police
2. 5 May 2026 - Car-motorcycle sideswipe at NPE connection ramps, 4:00pm, highway transition lanes
3. 11 May 2024 - Fatal junction fire at Jalan Othman-Jalan Templer intersection: driver ran red light, Honda Accord and Yamaha Lagenda burst into flames, 53-year-old motorcyclist severely injured
4. 6 Jun 2017 - 4 simultaneous rear-end crashes during rainy morning rush at Jalan Othman bottleneck, traffic paralyzed back to Old Klang Road and Taman Maju Jaya

PRIMARY ACCIDENT BLACKSPOTS (verified):
1. NPE Flyover Merging Zone: vehicles decelerate rapidly off NPE ramps onto narrow dual-carriageway sections
2. Jalan Othman Intersection: red-light runners causing T-bone crashes despite roundabout removal
3. PJ Old Town Curve: illegally parked cars narrow lanes from 2 to 1, forcing sudden evasive braking

ROAD CHARACTERISTICS (verified):
- Dual carriageway with narrow sections
- Steep ascending sections (heavy vehicle risk)
- Functions as spillover highway bypass from Federal Highway
- High-speed multi-vehicle pileups under flyovers documented
- Frequent side-swipes due to sudden lane merging
- Red-light runners at major junctions documented

KNOWN PROBLEMS (verified):
- Illegal parking near PJ Old Town commercial storefronts narrows active lanes from 2 to 1
- NPE ramp deceleration causes sudden braking chain reaction in peak hours
- Jalan Othman long signal phases cause motorists to attempt red-light beating
- Evening contraflow creates confusion for unfamiliar drivers

NEARBY LANDMARKS: PJ Old Town commercial area, New Pantai Expressway (NPE) intersection, Jalan Othman market area, Jalan Gasing arterial junction

SITUATION METRICS GUIDANCE for Jalan Templer:
- estimated_affected_commuters: use 260000 as daily base (verified: billboard operator data); scale by time period (peak = 150000-200000, off-peak = 50000-80000)
- congestion_description: reference specific junctions (NPE Flyover Merging Zone, Jalan Othman Intersection, PJ Old Town Curve)

=== END VERIFIED GROUND TRUTH ===

Your behaviour:
- ALWAYS reference the verified data above when analysing these locations — do not invent facts
- Generate recommendations SPECIFIC to the named street, referencing known junctions and issues
- Tailor recommendations to the exact transport problems, affected groups, and time period stated
- Respect the budget range — do not recommend actions that exceed it
- If a policy to evaluate is specified (not "None"), include a dedicated assessment of that policy
- Use formal bilingual tone (English with Bahasa Malaysia terms where appropriate)
- Apply Malaysian road classifications and reference local landmarks/junctions where relevant
- Every recommendation must be specific and actionable — no vague language
- Use the correct authority: MBSJ/JPJ Selangor/PDRM for Puchong; MBPJ/JPJ Selangor/PDRM/PJ Traffic Police for Jalan Templer

=== CRITICAL BUDGET RULE — MUST FOLLOW ===

The user has specified a budget range. The TOTAL of ALL estimated_cost values across ALL recommendations
MUST NOT exceed the maximum budget limit for that range.

Budget ranges and their hard limits:
- "Under RM10k"       -> total MUST be under 10000
- "RM10k-50k"         -> total MUST be under 50000
- "RM50k-100k"        -> total MUST be under 100000
- "RM100k-200k"       -> total MUST be under 200000
- "RM200k-500k"       -> total MUST be under 500000
- "RM500k-1mil"       -> total MUST be under 1000000
- "Above RM1mil"      -> total MUST be under 5000000
- "Custom / Lain-lain" -> use the exact_budget value provided by the officer as the hard limit

Rules:
1. Before finalising your response, SUM all estimated_cost values across all four categories.
2. If the sum exceeds the limit, REDUCE scope: lower quantities, remove line items, or defer lower-priority recommendations.
3. Deferred recommendations must have their action text prefixed with "Deferred - Budget Constraint: " followed by the original action.
4. Distribute the budget realistically across categories — do not put everything in one category.
5. Your JSON response MUST include a top-level "budget_total" field equal to the sum of all estimated_cost values.
6. budget_estimates.total must also equal budget_total.
7. NEVER exceed the budget limit. This is a hard constraint, not a guideline.

=== END CRITICAL BUDGET RULE ===

Recommendation priority levels:
- Critical: Immediate safety risk or severe congestion requiring urgent intervention
- High: Significant impact, should be addressed within 1-3 months
- Medium: Improvement opportunity, addressable within 3-12 months

Budget guidance:
- Under RM10k: Minor enforcement, temporary signage, awareness campaigns only
- RM10k-50k: Enforcement, signage, minor markings, awareness campaigns
- RM50k-100k: Signal timing upgrades, minor pedestrian improvements
- RM100k-200k: Signal upgrades, pedestrian crossings, bus stop improvements
- RM200k-500k: Road widening, dedicated lanes, CCTV systems, major signage
- RM500k-1mil: Infrastructure projects, major road works, LRT feeder routes
- Above RM1mil: Flyovers, major infrastructure, large-scale LRT/BRT projects
- Custom: Use the exact budget specified by the officer

Situation metrics guidance:
- severity_score: 1-10 integer. Base: Light=2, Moderate=4, Heavy=7, Gridlock=9. +1 for Heavy Rain/Fog, +1 for Morning/Evening Peak, -1 for Off-Peak/Night. Cap at 10.
- daily_time_wasted_minutes: estimate per commuter. Light=5, Moderate=15, Heavy=35, Gridlock=60. Adjust +10 for peak hours, +5 for rain.
- accident_risk: "Low" for Light+Clear, "Moderate" for Moderate traffic or rain, "High" for Heavy+rain or Gridlock, "Critical" for Gridlock+Heavy Rain or Accident problem.
- estimated_affected_commuters: for Jalan Puchong use 100000 as daily base (verified). For Jalan Templer use 260000 as daily base (verified).
- congestion_description: one sentence describing the current situation on the specific street, referencing known hotspots.

Budget estimates guidance:
- Estimate RM cost for each recommendation category based on the types of actions recommended.
- Use realistic Malaysian construction/enforcement costs.
- total must equal sum of the four categories.

Cost breakdown guidance per recommendation:
- estimated_cost: total RM cost for this single recommendation (integer)
- rationale: 1-2 sentences explaining why this action is needed, citing verified data
- cost_breakdown: itemised list of 2-5 line items. Each item: item name, unit, qty (integer), unit_cost (integer RM), total (= qty * unit_cost).
- total in each breakdown item must equal qty * unit_cost exactly
- estimated_cost must equal sum of all breakdown item totals
- ALL cost values must be whole numbers (no decimals).

=== CRITICAL COST PROPORTIONALITY RULE ===

The estimated_cost for each recommendation MUST be proportional to the total budget.
- Count the total number of recommendations you will generate (typically 8-12).
- Divide the total budget limit by that count to get the average cost per recommendation.
- Each recommendation estimated_cost should be within 0.5x to 2x of that average.

Verification step (MANDATORY before returning JSON):
1. Sum all estimated_cost values across all four categories.
2. Confirm the sum does not exceed the budget limit.
3. Confirm each cost_breakdown item total = qty x unit_cost.
4. Confirm sum of cost_breakdown totals = estimated_cost for each recommendation.
If any check fails, adjust quantities or unit costs before returning.

=== END CRITICAL COST PROPORTIONALITY RULE ===

You MUST respond with ONLY a valid JSON object. No preamble, no explanation, no markdown code fences.

The JSON schema is:
{
  "reference_number": "string",
  "summary": "string",
  "location_context": "string",
  "conditions_applied": {"weather": "string", "time_of_day": "string", "event_type": "string"},
  "constraints_applied": ["string"],
  "situation_metrics": {
    "severity_score": 0,
    "daily_time_wasted_minutes": 0,
    "accident_risk": "Low",
    "estimated_affected_commuters": 0,
    "congestion_description": "string"
  },
  "recommendations": {
    "traffic_flow": [{"action": "string", "responsible_party": "string", "estimated_timeline": "string", "priority_level": "Critical", "estimated_cost": 0, "rationale": "string", "cost_breakdown": [{"item": "string", "unit": "string", "qty": 0, "unit_cost": 0, "total": 0}]}],
    "public_transport": [],
    "walkability": [],
    "policy_enforcement": []
  },
  "budget_estimates": {"traffic_flow": 0, "public_transport": 0, "walkability": 0, "policy_enforcement": 0, "total": 0},
  "budget_total": 0,
  "risk_assessment": "string",
  "priority_actions": ["string", "string", "string"]
}

IMPORTANT JSON FORMATTING RULES:
- Use ONLY double quotes for all JSON strings — never single quotes
- Use true/false/null (not True/False/None)
- Never use ... or [...] as placeholders — always include actual data arrays
- Never add comments inside JSON
- All string values must be on one line — no literal newlines inside string values
- Every opening bracket/brace must have a matching closing bracket/brace
- Do not include any text before the opening { or after the closing }
"""

advisor_agent = Agent(
    model=bedrock_model,
    system_prompt=SYSTEM_PROMPT,
)


def _repair_json(raw: str) -> str:
    """
    Attempt to repair common LLM JSON formatting issues.
    """
    import re

    text = raw.strip()

    # Fix Python boolean/None literals
    text = re.sub(r'\bTrue\b', 'true', text)
    text = re.sub(r'\bFalse\b', 'false', text)
    text = re.sub(r'\bNone\b', 'null', text)

    # Replace ellipsis placeholders
    text = re.sub(r'\[\s*\.\.\.\s*\]', '[]', text)
    text = re.sub(r'\.\.\.', '', text)

    # Extract the first complete {...} block
    start = text.find("{")
    if start == -1:
        return text

    depth = 0
    end = -1
    in_string = False
    escape_next = False
    for i, ch in enumerate(text[start:], start=start):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"' and not escape_next:
            in_string = not in_string
        if not in_string:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break

    if end != -1:
        text = text[start:end + 1]
    else:
        text = text[start:]
        open_braces = text.count("{") - text.count("}")
        open_brackets = text.count("[") - text.count("]")
        text = text.rstrip().rstrip(",")
        text += "]" * max(0, open_brackets)
        text += "}" * max(0, open_braces)

    # Remove trailing commas before } or ]
    text = re.sub(r",\s*([}\]])", r"\1", text)

    # Fix double commas
    text = re.sub(r",\s*,", ",", text)

    # Fix unescaped literal newlines inside strings
    def fix_newlines_in_strings(s: str) -> str:
        result = []
        in_str = False
        esc = False
        for ch in s:
            if esc:
                result.append(ch)
                esc = False
                continue
            if ch == "\\" and in_str:
                result.append(ch)
                esc = True
                continue
            if ch == '"':
                in_str = not in_str
                result.append(ch)
                continue
            if in_str and ch in ("\n", "\r"):
                result.append(" ")
                continue
            result.append(ch)
        return "".join(result)

    text = fix_newlines_in_strings(text)

    # Re-apply trailing comma cleanup
    text = re.sub(r",\s*([}\]])", r"\1", text)

    return text


def _post_validate_and_fix(validated: AnalysisResponse) -> AnalysisResponse:
    """
    Post-validation: fix any cost total mismatches.
    Logs warnings but never raises.
    """
    warnings_list: list[str] = []

    all_recs = (
        validated.recommendations.traffic_flow
        + validated.recommendations.public_transport
        + validated.recommendations.walkability
        + validated.recommendations.policy_enforcement
    )

    for rec in all_recs:
        if rec.cost_breakdown:
            breakdown_sum = sum(item.total for item in rec.cost_breakdown)
            if int(breakdown_sum) != rec.estimated_cost:
                msg = f"cost_breakdown sum={breakdown_sum} != estimated_cost={rec.estimated_cost} for '{rec.action[:40]}'. Fixed."
                logger.warning(msg)
                warnings_list.append(msg)
                rec.estimated_cost = int(round(breakdown_sum))

    tf_total = sum(r.estimated_cost for r in validated.recommendations.traffic_flow)
    pt_total = sum(r.estimated_cost for r in validated.recommendations.public_transport)
    wk_total = sum(r.estimated_cost for r in validated.recommendations.walkability)
    pe_total = sum(r.estimated_cost for r in validated.recommendations.policy_enforcement)
    grand_total = tf_total + pt_total + wk_total + pe_total

    validated.budget_estimates.traffic_flow = float(tf_total)
    validated.budget_estimates.public_transport = float(pt_total)
    validated.budget_estimates.walkability = float(wk_total)
    validated.budget_estimates.policy_enforcement = float(pe_total)
    validated.budget_estimates.total = float(grand_total)
    validated.budget_total = grand_total

    for w in warnings_list:
        if w not in validated.warnings:
            validated.warnings.append(w)

    return validated


def _extract_raw_text(response) -> str:
    """
    Extract the plain text string from a Strands SDK agent response.
    Tries multiple access patterns and writes debug info to /tmp/last_response.txt.
    """
    raw_text = None

    # Pattern 1: response.message dict with 'content' list
    try:
        content = response.message.get("content", [])
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                raw_text = block["text"]
                break
            if isinstance(block, dict) and "text" in block:
                raw_text = block["text"]
                break
    except Exception as e:
        logger.debug(f"Pattern 1 failed: {e}")

    # Pattern 2: response.content attribute
    if not raw_text:
        try:
            content = getattr(response, "content", None)
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        raw_text = block["text"]
                        break
                    if isinstance(block, dict) and "text" in block:
                        raw_text = block["text"]
                        break
            elif isinstance(content, str):
                raw_text = content
        except Exception as e:
            logger.debug(f"Pattern 2 failed: {e}")

    # Pattern 3: response.text attribute
    if not raw_text:
        try:
            text_attr = getattr(response, "text", None)
            if isinstance(text_attr, str) and text_attr.strip():
                raw_text = text_attr
        except Exception as e:
            logger.debug(f"Pattern 3 failed: {e}")

    # Pattern 4: str() fallback
    if not raw_text:
        raw_text = str(response).strip()

    # Write debug file
    try:
        with open("/tmp/last_response.txt", "w", encoding="utf-8") as f:
            f.write(f"=== str(response) ===\n{str(response)}\n\n=== Extracted ===\n{raw_text or ''}\n")
    except Exception:
        pass

    return raw_text or ""


def _parse_json_from_text(raw_text: str) -> dict:
    """
    Extract and parse JSON from raw model output.
    Two attempts: raw then repaired.
    """
    text = raw_text.strip()

    # Strip markdown code fences
    if "```" in text:
        parts = text.split("```")
        for part in parts[1:]:
            cleaned = part.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            if cleaned.startswith("{"):
                text = cleaned
                break

    # Slice to the outermost {...}
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        text = text[brace_start:brace_end + 1]
    elif brace_start > 0:
        text = text[brace_start:]

    logger.debug(f"JSON snippet (first 200): {text[:200]}")

    # Attempt 1: parse as-is
    try:
        return json.loads(text)
    except json.JSONDecodeError as e1:
        logger.warning(f"First parse failed: {e1}. Attempting repair...")

    # Attempt 2: repair then parse
    repaired = _repair_json(text)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e2:
        logger.error(f"Repair failed. Error: {e2}")
        logger.error(f"Raw text (first 800): {text[:800]}")
        raise ValueError(f"Agent returned invalid JSON after repair: {e2}")


def invoke_advisor(request: AnalyzeRequest, reference_number: str) -> AnalysisResponse:
    """
    Invoke the JPJ advisor agent. Retries once with a simplified prompt on JSON failure.
    """
    problems_str = ", ".join(request.transport_problems)
    groups_str = ", ".join(request.affected_groups)

    def _build_prompt(simplified: bool = False) -> str:
        if simplified:
            return (
                f"Generate a traffic analysis JSON for {request.street}, {request.city}, {request.state}. "
                f"Traffic: {request.traffic_level}. Problems: {problems_str}. "
                f"Budget: {request.budget_range}. Reference: {reference_number}. "
                f"Respond ONLY with a valid JSON object. No markdown, no text outside the JSON."
            )
        budget_line = f"- Exact budget: RM{request.exact_budget:,}" if request.exact_budget else ""
        return f"""Analyse the following traffic situation:

LOCATION: {request.state} / {request.city} / {request.street}
CONTEXT: {request.location_context}
SITUATION: Traffic={request.traffic_level}, Problems={problems_str}, Time={request.time_period}, Day={request.day_type}, Affected={groups_str}
CONDITIONS: Weather={request.weather}, Budget={request.budget_range}{(chr(10) + budget_line) if budget_line else ""}, Policy={request.policy_to_evaluate}
REFERENCE: {reference_number}

Generate recommendations within the stated budget. Verify cost_breakdown sums before returning.
Respond ONLY with the JSON object — no other text."""

    last_error: Exception = None

    for attempt in range(1, 3):
        try:
            response = advisor_agent(_build_prompt(simplified=(attempt > 1)))
            raw_text = _extract_raw_text(response)
            parsed = _parse_json_from_text(raw_text)
            parsed["reference_number"] = reference_number
            validated = AnalysisResponse(**parsed)
            validated = _post_validate_and_fix(validated)
            return validated

        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            logger.error(f"Attempt {attempt} failed: {e}")
            if attempt < 2:
                logger.warning("Retrying with simplified prompt...")
                continue
            raise ValueError(f"Agent returned invalid JSON after {attempt} attempts: {last_error}")

        except Exception as e:
            logger.error(f"Agent error (attempt {attempt}): {e}")
            raise ValueError(f"Agent error: {e}")
