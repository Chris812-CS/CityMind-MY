# Requirements Document

## Introduction

The JPJ Traffic & Walkability AI Advisor is a bilingual (Bahasa Malaysia / English) web-based decision-support system for Jabatan Pengangkutan Jalan (JPJ) officers. It accepts free-text input describing a traffic problem location, contextual conditions, and operational constraints, then uses an AI agent (Amazon Bedrock / Claude Sonnet) to generate structured, actionable recommendations across four categories: traffic flow, public transport, pedestrian walkability, and policy/enforcement. All recommendations are validated against extracted constraints before output. The system produces a React dashboard with an interactive map, priority-coded recommendation cards, and a downloadable government-style PDF report. No data is persisted between sessions.

---

## Glossary

- **Advisor**: The JPJ Traffic & Walkability AI Advisor system as a whole.
- **Agent**: The Strands Agents SDK orchestrator connected to Amazon Bedrock (Claude Sonnet 4.5) that processes inputs and generates recommendations.
- **API**: The FastAPI backend service exposing the `/analyze` endpoint.
- **Constraint**: A user-supplied restriction (budget limit, policy restriction, jurisdiction scope) that limits which recommendations are valid.
- **Dashboard**: The React frontend presenting the map, recommendation cards, and summary banner.
- **JPJ Officer**: An authenticated internal user of the Advisor belonging to Jabatan Pengangkutan Jalan.
- **Location**: A named place or coordinate area experiencing traffic issues, supplied by the JPJ Officer.
- **PDF Report**: The server-generated government-style formal report in PDF format.
- **Priority Level**: A classification of urgency — Critical, High, or Medium — assigned to each recommendation.
- **Recommendation**: A single actionable item containing an action, responsible party, estimated timeline, and priority level.
- **Reference Number**: An auto-generated unique identifier assigned to each analysis session for traceability.
- **Session**: A single stateless request-response cycle; no data is retained after the response is delivered.

---

## Requirements

### Requirement 1: Location Dropdown and Pre-Loaded Context Input

**User Story:** As a JPJ Officer, I want to select a predefined location from a dropdown and provide contextual conditions and constraints, so that I can receive AI-generated recommendations scoped to a known, pre-contextualized traffic area without free-text location entry.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input form containing a location dropdown (not a free-text field), a conditions section with dropdowns for weather, time of day, and event type, and a constraints free-text area.
2. THE location dropdown SHALL contain exactly three options and no others:
   - **Jalan Templer, Kuala Lumpur** — residential-commercial mix, school zones, narrow road, morning peak congestion toward KL city
   - **Jalan Ampang, Kuala Lumpur** — embassy corridor, KLCC proximity, event traffic from Stadium Merdeka area, high pedestrian activity
   - **Petaling Jaya / Subang Jaya** — suburban sprawl, LRT connectivity gaps, SS2 / USJ commercial zones, heavy cross-district commuter flow
3. THE Dashboard SHALL NOT provide any free-text input field for location; the dropdown SHALL be the only mechanism for location selection.
4. WHEN the JPJ Officer selects a location from the dropdown, THE Dashboard SHALL automatically load the pre-defined context for that location and include it in the request payload sent to the `/analyze` endpoint.
5. WHEN the JPJ Officer submits the form, THE Dashboard SHALL send a POST request to the `/analyze` endpoint with a JSON body containing `location` (the selected dropdown value), `location_context` (the pre-loaded context string for that location), `conditions`, and `constraints` fields.
6. IF no location has been selected from the dropdown when the form is submitted, THEN THE Dashboard SHALL display a validation error message and prevent submission.
7. IF the `conditions` or `constraints` fields are empty when the form is submitted, THEN THE Dashboard SHALL allow submission with those fields treated as empty strings.

---

### Requirement 2: Server-Side Input Sanitization

**User Story:** As a JPJ system administrator, I want all user inputs sanitized on the server before being passed to the AI model, so that prompt injection and malicious content cannot compromise the AI agent or the system.

#### Acceptance Criteria

1. WHEN the API receives a request at `/analyze`, THE API SHALL sanitize the `location`, `conditions`, and `constraints` fields by stripping HTML tags, control characters, and prompt-injection patterns before passing them to the Agent.
2. IF any sanitized field exceeds 2,000 characters, THEN THE API SHALL truncate it to 2,000 characters and include a warning in the response indicating truncation occurred.
3. THE API SHALL perform all sanitization server-side; THE Dashboard SHALL NOT be relied upon as the sole sanitization layer.

---

### Requirement 3: Constraint Extraction

**User Story:** As a JPJ Officer, I want the system to automatically extract constraints from my input, so that recommendations are filtered to only those feasible within my operational limits.

#### Acceptance Criteria

1. WHEN the Agent processes a request, THE Agent SHALL extract budget limits, policy restrictions, and jurisdiction scope constraints from the `constraints` field.
2. THE Agent SHALL perform constraint extraction server-side only; THE Dashboard SHALL NOT perform constraint extraction.
3. WHEN constraints are extracted, THE Agent SHALL validate every generated recommendation against the extracted constraints before including it in the response.
4. IF a recommendation violates an extracted constraint, THEN THE Agent SHALL exclude that recommendation from the response and note the exclusion in the `constraints_applied` field of the response.

---

### Requirement 4: AI-Generated Structured Recommendations

**User Story:** As a JPJ Officer, I want the AI to generate structured recommendations across four categories, so that I have a comprehensive, actionable plan covering all aspects of the traffic problem.

#### Acceptance Criteria

1. WHEN the Agent completes analysis, THE Agent SHALL return recommendations organized into exactly four categories: `traffic_flow`, `public_transport`, `walkability`, and `policy_enforcement`.
2. THE Agent SHALL assign each recommendation a `priority_level` of exactly one of: `Critical`, `High`, or `Medium`.
3. THE Agent SHALL include for each recommendation: an `action` description, a `responsible_party`, an `estimated_timeline`, and a `priority_level`.
4. WHEN generating traffic flow recommendations, THE Agent SHALL consider signal timing adjustments, lane configuration changes, and rerouting options.
5. WHEN generating public transport recommendations, THE Agent SHALL consider feeder route additions, bus stop placement, and service frequency changes.
6. WHEN generating walkability recommendations, THE Agent SHALL consider pedestrian crossing placement, signage improvements, and lighting upgrades.
7. WHEN generating policy/enforcement recommendations, THE Agent SHALL consider speed limit changes, parking enforcement zones, and fine zone designations.
8. THE Agent SHALL use formal bilingual tone (Bahasa Malaysia and English) in all recommendation text.

---

### Requirement 5: Structured JSON Response

**User Story:** As a JPJ system integrator, I want the `/analyze` endpoint to return a well-defined JSON structure, so that the Dashboard and any downstream systems can reliably parse and display the results.

#### Acceptance Criteria

1. WHEN the API returns a successful response, THE API SHALL include the following top-level fields: `summary`, `location_context`, `conditions_applied`, `constraints_applied`, `recommendations`, `risk_assessment`, and `priority_actions`.
2. THE `recommendations` field SHALL contain exactly the four sub-fields: `traffic_flow`, `public_transport`, `walkability`, and `policy_enforcement`, each containing an array of recommendation objects.
3. IF the Agent fails to generate recommendations due to an internal error, THEN THE API SHALL return an HTTP 500 response with a JSON body containing an `error` field describing the failure.
4. IF the request body is malformed or missing required fields, THEN THE API SHALL return an HTTP 422 response with a JSON body describing the validation error.

---

### Requirement 6: Interactive Map Display

**User Story:** As a JPJ Officer, I want to see the analyzed location pinned on an interactive map with recommendation overlays, so that I can visually understand the spatial context of each recommendation.

#### Acceptance Criteria

1. WHEN the Dashboard receives a successful analysis response, THE Dashboard SHALL display a Leaflet.js map in the left panel with a pin marking the analyzed location.
2. THE Dashboard SHALL render recommendation overlays on the map corresponding to the spatial context of each recommendation category.
3. WHEN the JPJ Officer clicks a map overlay, THE Dashboard SHALL highlight the corresponding recommendation card in the right panel.
4. THE Dashboard SHALL initialize the map centered on Malaysia with a default zoom level appropriate for city-level viewing.

---

### Requirement 7: Priority-Coded Recommendation Cards

**User Story:** As a JPJ Officer, I want recommendation cards color-coded by priority, so that I can immediately identify which actions require urgent attention.

#### Acceptance Criteria

1. WHEN the Dashboard renders recommendation cards, THE Dashboard SHALL display Critical priority cards with a red color scheme, High priority cards with an amber color scheme, and Medium priority cards with a blue color scheme.
2. THE Dashboard SHALL organize recommendation cards into four labeled sections corresponding to the four recommendation categories.
3. WHEN the Dashboard renders a recommendation card, THE Dashboard SHALL display the action, responsible party, estimated timeline, and priority level badge.
4. THE Dashboard SHALL display recommendation cards in the right panel, sorted within each category by priority level from Critical to Medium.

---

### Requirement 8: Summary Banner

**User Story:** As a JPJ Officer, I want a summary banner at the top of the Dashboard showing the analyzed location, conditions, and applied constraint tags, so that I can confirm the context of the analysis at a glance.

#### Acceptance Criteria

1. WHEN the Dashboard receives a successful analysis response, THE Dashboard SHALL display a summary banner at the top of the page showing the location, conditions applied, and constraint tags.
2. THE Dashboard SHALL render each constraint as a distinct visual tag within the summary banner.
3. WHILE no analysis has been submitted, THE Dashboard SHALL display a placeholder state in the summary banner area.

---

### Requirement 9: PDF Report Generation

**User Story:** As a JPJ Officer, I want to download a formal government-style PDF report of the analysis, so that I can share findings with colleagues and use them in official documentation.

#### Acceptance Criteria

1. WHEN the JPJ Officer clicks the "Download PDF Report" button, THE Dashboard SHALL send a request to the API to generate and return a PDF file.
2. THE PDF Report SHALL include the following sections in order: header (JPJ logo placeholder, report title "Laporan Analisis Trafik dan Kemudahan Pejalan Kaki", date, reference number), Executive Summary, Location & Conditions, Constraints Applied, Traffic Flow Recommendations, Public Transport Recommendations, Walkability Recommendations, Policy/Enforcement Actions, Risk Assessment.
3. THE PDF Report SHALL display a priority badge next to each recommendation.
4. THE PDF Report SHALL include a footer on every page containing the text: "Laporan ini dijana oleh sistem AI JPJ — untuk kegunaan dalaman sahaja".
5. THE API SHALL auto-generate a unique reference number for each analysis session and include it in both the JSON response and the PDF Report.
6. IF the PDF generation fails, THEN THE API SHALL return an HTTP 500 response and THE Dashboard SHALL display an error notification to the JPJ Officer.

---

### Requirement 10: Stateless Operation and No Data Persistence

**User Story:** As a JPJ data protection officer, I want the system to operate statelessly with no data persistence, so that sensitive traffic and location data is not retained beyond the immediate session.

#### Acceptance Criteria

1. THE API SHALL NOT write any request data, response data, or session data to any persistent storage (database, file system, cache, or log file containing PII).
2. WHEN a session ends (response is delivered), THE API SHALL retain no data from that session in memory.
3. THE Dashboard SHALL NOT store analysis results in browser local storage, session storage, or cookies.
4. THE API SHALL generate the reference number in-memory for the duration of the session only.

---

### Requirement 11: JPJ Header and Branding

**User Story:** As a JPJ Officer, I want the Dashboard to display the JPJ logo and appropriate branding, so that the tool is clearly identified as an official JPJ internal system.

#### Acceptance Criteria

1. THE Dashboard SHALL display a JPJ logo placeholder in the header area of the page.
2. THE Dashboard SHALL present all UI text in formal bilingual (Bahasa Malaysia / English) tone consistent with JPJ internal communications standards.
