# Implementation Plan: JPJ Traffic & Walkability AI Advisor

## Overview

Implement a stateless, bilingual (Bahasa Malaysia / English) web-based decision-support system for JPJ officers. The system consists of a FastAPI backend (Python) that invokes a Strands Agent on Amazon Bedrock (Claude Sonnet 4.5) and a React + TypeScript frontend with a Leaflet.js map, priority-coded recommendation cards, and a ReportLab-generated PDF report.

## Tasks

- [x] 1. Set up project structure and shared types
  - Create `backend/` directory with `main.py`, `models.py`, `sanitizer.py`, `agent.py`, `pdf_generator.py`, `reference.py`
  - Create `frontend/src/` directory with `App.tsx`, `components/`, `hooks/`, `constants/`, `types/`
  - Add `backend/requirements.txt` pinning `fastapi`, `uvicorn`, `pydantic`, `strands-agents`, `reportlab`, `hypothesis`, `pytest`, `pytest-asyncio`
  - Add `frontend/package.json` with `react`, `typescript`, `leaflet`, `react-leaflet`, `vitest`, `@testing-library/react`, `fast-check`
  - Define all Pydantic models in `backend/models.py` (`PriorityLevel`, `Conditions`, `AnalyzeRequest`, `Recommendation`, `Recommendations`, `AnalysisResponse`, `ReportRequest`)
  - Define all TypeScript types in `frontend/src/types/api.ts` (`PriorityLevel`, `RecommendationCategory`, `Recommendation`, `Recommendations`, `AnalysisResponse`, `AnalyzeRequest`, `LocationOption`)
  - _Requirements: 1.1, 4.2, 4.3, 5.1, 5.2_

- [x] 2. Implement backend input sanitization
  - [x] 2.1 Implement `sanitizer.py` with HTML tag stripping, control character removal, prompt-injection pattern removal, and 2,000-character truncation with warning flag
    - Strip HTML tags via regex `<[^>]+>`
    - Strip control characters `[\x00-\x1f\x7f]`
    - Strip prompt-injection patterns (`ignore previous instructions`, `system:`, `<|im_start|>`, `###`, `---` at line start)
    - Truncate to 2,000 chars and return `truncated: True` flag when exceeded
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.2 Write property test for sanitizer — Property 1: Sanitizer removes all disallowed content
    - **Property 1: Sanitizer removes all disallowed content**
    - Use Hypothesis to generate strings containing HTML tags, control characters, and injection patterns; assert none remain after sanitization
    - **Validates: Requirements 2.1**

  - [ ]* 2.3 Write property test for sanitizer — Property 2: Sanitizer truncates long inputs
    - **Property 2: Sanitizer truncates long inputs**
    - Use Hypothesis to generate strings longer than 2,000 characters; assert output length ≤ 2,000 and truncation flag is set
    - **Validates: Requirements 2.2**

  - [ ]* 2.4 Write unit tests for `sanitizer.py`
    - Test each stripping rule individually with known inputs
    - Test truncation boundary at exactly 2,000 and 2,001 characters
    - _Requirements: 2.1, 2.2_

- [x] 3. Implement reference number generator
  - [x] 3.1 Implement `reference.py` generating `JPJ-{YYYYMMDD}-{4-char hex}` using `uuid4()` hex prefix and UTC date
    - _Requirements: 9.5, 10.4_

  - [ ]* 3.2 Write property test for reference numbers — Property 10: Reference numbers are unique across sessions
    - **Property 10: Reference numbers are unique across sessions**
    - Use Hypothesis to call the generator N ≥ 2 times; assert all values are distinct and each matches `JPJ-\d{8}-[0-9a-fA-F]{4}`
    - **Validates: Requirements 9.5**

  - [ ]* 3.3 Write unit tests for `reference.py`
    - Test format regex match
    - Test that two consecutive calls produce different values
    - _Requirements: 9.5_

- [ ] 4. Implement Strands Agent and FastAPI `/analyze` endpoint
  - [ ] 4.1 Implement `agent.py` — initialize `BedrockModel` with Claude Sonnet 4.5 and `advisor_agent` with the bilingual system prompt; implement `invoke_advisor(request, reference_number) -> AnalysisResponse`
    - Use `model_id="us.anthropic.claude-sonnet-4-5-20251001-v1:0"`, `region_name="us-east-1"`, `temperature=0.3`
    - Build structured prompt including full JSON schema; parse response with `json.loads()` and validate against `AnalysisResponse`
    - Return HTTP 500 on parse or validation failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ] 4.2 Implement `POST /analyze` route in `main.py`
    - Sanitize all input fields via `sanitizer.py`
    - Generate reference number via `reference.py`
    - Invoke agent via `agent.py`
    - Validate response against `AnalysisResponse` Pydantic model
    - Return HTTP 422 on missing/malformed fields; HTTP 500 on agent or parse failure; HTTP 200 with warnings array when truncation occurred
    - _Requirements: 2.1, 2.2, 5.1, 5.2, 5.3, 5.4, 9.5_

  - [ ]* 4.3 Write property test for recommendation structure — Property 3: Every recommendation is structurally valid
    - **Property 3: Every recommendation is structurally valid**
    - Use Hypothesis to generate `Recommendation` dicts; assert all four fields are non-empty strings and `priority_level` is one of `Critical`, `High`, `Medium`
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 4.4 Write property test for analysis response — Property 4: Analysis response contains all required top-level fields
    - **Property 4: Analysis response contains all required top-level fields**
    - Use Hypothesis to generate `AnalysisResponse` dicts; assert all required top-level fields are present and non-null
    - **Validates: Requirements 5.1**

  - [ ]* 4.5 Write unit tests for `models.py` Pydantic validation
    - Test valid payloads pass validation
    - Test missing `location` raises `ValidationError`
    - Test invalid `priority_level` value raises `ValidationError`
    - _Requirements: 4.2, 5.1, 5.4_

  - [ ]* 4.6 Write API integration test for `POST /analyze` with mocked Strands Agent
    - Assert HTTP 200 and correct `AnalysisResponse` schema on valid input
    - Assert HTTP 422 on missing `location`
    - Assert HTTP 500 on agent failure (mock raises exception)
    - _Requirements: 5.1, 5.3, 5.4_

- [ ] 5. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement PDF report generator and `/report` endpoint
  - [ ] 6.1 Implement `pdf_generator.py` using ReportLab Platypus to generate the government-style PDF in-memory
    - Include all nine required sections in order (header with JPJ logo placeholder, Executive Summary, Location & Conditions, Constraints Applied, four recommendation tables, Risk Assessment)
    - Apply priority badge colors: Critical `#DC2626`, High `#D97706`, Medium `#2563EB`
    - Add footer "Laporan ini dijana oleh sistem AI JPJ — untuk kegunaan dalaman sahaja" on every page
    - Return `io.BytesIO` bytes; do not write to disk
    - _Requirements: 9.2, 9.3, 9.4, 10.1_

  - [ ] 6.2 Implement `POST /report` route in `main.py`
    - Accept `ReportRequest` body; call `pdf_generator.py`; stream response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="JPJ-Report-{reference_number}.pdf"`
    - Return HTTP 500 with `{"error": "PDF generation failed: ..."}` on failure
    - _Requirements: 9.1, 9.5, 9.6_

  - [ ]* 6.3 Write property test for PDF report — Property 9: PDF report contains all required sections and priority badges
    - **Property 9: PDF report contains all required sections and priority badges**
    - Use Hypothesis to generate valid `AnalysisResponse` objects; assert PDF bytes start with `%PDF`, contain all required section header strings, all priority level texts, and the footer string
    - **Validates: Requirements 9.2, 9.3, 9.4**

  - [ ]* 6.4 Write unit tests for `pdf_generator.py`
    - Test PDF bytes are non-empty and start with `%PDF`
    - Test all required section headers are present using a mock `AnalysisResponse`
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ]* 6.5 Write integration test for `POST /report`
    - Assert `Content-Type: application/pdf` and non-empty bytes on valid input
    - _Requirements: 9.1_

- [ ] 7. Implement frontend constants, types, and `useAnalysis` hook
  - [x] 7.1 Populate `frontend/src/constants/locations.ts` with the three pre-defined `LocationOption` entries (Jalan Templer, Jalan Ampang, Petaling Jaya / Subang Jaya) including coordinates and context strings
    - _Requirements: 1.2, 1.4_

  - [ ] 7.2 Implement `frontend/src/hooks/useAnalysis.ts` — manage API call to `POST /analyze`, loading state, error state, and analysis result state
    - _Requirements: 1.5, 5.3_

- [ ] 8. Implement frontend input form
  - [ ] 8.1 Implement `InputForm.tsx` with location dropdown (three options only), weather/time-of-day/event-type condition dropdowns, and constraints free-text area
    - Validate that a location is selected before submission; display "Sila pilih lokasi / Please select a location" error if not
    - Auto-populate `location_context` from `LOCATIONS` constant on selection
    - Allow submission with empty `conditions` and `constraints`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

  - [ ]* 8.2 Write unit tests for `InputForm`
    - Test submitting without location shows validation error and prevents submission
    - Test selecting a location populates `location_context` in the payload
    - _Requirements: 1.3, 1.6_

- [ ] 9. Implement frontend map panel
  - [ ] 9.1 Implement `MapPanel.tsx` using `react-leaflet` — display pin at location coordinates, render four colored circle overlays (red/North traffic_flow, blue/East public_transport, green/South walkability, orange/West policy_enforcement), handle overlay click to dispatch `onOverlayClick`
    - Initialize map centered on `[3.1390, 101.6869]` at zoom 12
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 9.2 Write unit tests for `MapPanel`
    - Test that clicking an overlay calls `onOverlayClick` with the correct category string
    - _Requirements: 6.3_

- [ ] 10. Implement frontend recommendation cards and panel
  - [ ] 10.1 Implement `RecommendationCard.tsx` — display action, responsible party, estimated timeline, and priority badge; apply red class for Critical, amber for High, blue for Medium
    - _Requirements: 7.1, 7.3_

  - [ ] 10.2 Implement `RecommendationPanel.tsx` — render four labeled category sections; sort cards within each section Critical → High → Medium; apply highlight class when `isHighlighted` is true
    - _Requirements: 7.2, 7.4_

  - [ ]* 10.3 Write property test for recommendation card color coding — Property 5: Recommendation cards are color-coded by priority
    - **Property 5: Recommendation cards are color-coded by priority**
    - Use fast-check to generate `Recommendation` objects with arbitrary `priority_level`; assert rendered card applies correct color class (red/amber/blue)
    - **Validates: Requirements 7.1**

  - [ ]* 10.4 Write property test for recommendation card content — Property 6: Recommendation cards display all required fields
    - **Property 6: Recommendation cards display all required fields**
    - Use fast-check to generate `Recommendation` objects; assert rendered card text content includes `action`, `responsible_party`, `estimated_timeline`, and `priority_level`
    - **Validates: Requirements 7.3**

  - [ ]* 10.5 Write property test for recommendation sort order — Property 7: Recommendation cards are sorted by priority within each category
    - **Property 7: Recommendation cards are sorted by priority within each category**
    - Use fast-check to generate lists of recommendations with mixed priority levels; assert rendered order within each category section is Critical → High → Medium
    - **Validates: Requirements 7.4**

  - [ ]* 10.6 Write unit tests for `RecommendationCard`
    - Test Critical renders with red class, High with amber, Medium with blue
    - _Requirements: 7.1_

- [ ] 11. Implement frontend summary banner and header
  - [ ] 11.1 Implement `SummaryBanner.tsx` — display location, conditions applied, and one distinct visual tag per constraint; show placeholder state when no analysis has been submitted
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 11.2 Implement `Header.tsx` — display JPJ logo placeholder and bilingual title in formal Bahasa Malaysia / English tone
    - _Requirements: 11.1, 11.2_

  - [ ]* 11.3 Write property test for summary banner constraint tags — Property 8: Summary banner renders one tag per constraint
    - **Property 8: Summary banner renders one tag per constraint**
    - Use fast-check to generate arrays of N constraint strings (N ≥ 0); assert rendered `SummaryBanner` contains exactly N distinct constraint tag elements
    - **Validates: Requirements 8.2**

  - [ ]* 11.4 Write unit tests for `SummaryBanner`
    - Test constraint tags render as distinct elements
    - Test placeholder state renders when no analysis is present
    - _Requirements: 8.2, 8.3_

- [ ] 12. Implement PDF download button and wire App together
  - [ ] 12.1 Implement `PdfDownloadButton.tsx` — on click, POST current `AnalysisResponse` to `/report`, trigger browser download of returned PDF bytes; display error notification if request fails
    - _Requirements: 9.1, 9.6_

  - [ ] 12.2 Implement `App.tsx` — compose `Header`, `InputForm`, `SummaryBanner`, `MapPanel`, `RecommendationPanel`, `PdfDownloadButton`; wire `useAnalysis` hook; pass `highlightedCategory` state between `MapPanel` and `RecommendationPanel`
    - Ensure no analysis results are stored in `localStorage`, `sessionStorage`, or cookies
    - _Requirements: 6.3, 7.2, 10.1, 10.2, 10.3_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests (Hypothesis for backend, fast-check for frontend) validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The system is intentionally stateless — no database, no file writes, no session storage at any layer
- AWS credentials must be configured for agent integration tests (Requirement 3.1 / 4.1)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "7.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "4.1", "7.2"] },
    { "id": 2, "tasks": ["4.2", "4.3", "4.4", "4.5", "8.1"] },
    { "id": 3, "tasks": ["4.6", "6.1", "8.2", "9.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "9.2", "10.1"] },
    { "id": 5, "tasks": ["6.5", "10.2", "11.1", "11.2"] },
    { "id": 6, "tasks": ["10.3", "10.4", "10.5", "10.6", "11.3", "11.4"] },
    { "id": 7, "tasks": ["12.1"] },
    { "id": 8, "tasks": ["12.2"] }
  ]
}
```
