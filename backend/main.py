"""
main.py — FastAPI application entry point for the JPJ Traffic & Walkability AI Advisor.

Exposes:
  GET  /health   — liveness check
  POST /analyze  — sanitize input, invoke Strands Agent, return AnalysisResponse JSON
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from models import AnalyzeRequest, AnalysisResponse, ReportRequest
from reference import generate_reference_number
from agent import invoke_advisor
from pdf_generator import generate_pdf_report

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="JPJ Traffic & Walkability AI Advisor",
    description="AI-powered traffic and walkability analysis for JPJ officers.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                      # Vite dev server
        "http://127.0.0.1:5173",                     # alternate loopback
        "https://jpj-traffic-advisor.vercel.app",    # production Vercel domain
        "https://*.vercel.app",                       # all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health_check():
    """Liveness probe — returns 200 when the service is up."""
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalysisResponse)
def analyze(request: AnalyzeRequest):
    """
    Accept a structured analysis request and return a validated AnalysisResponse.

    HTTP 422 — missing or malformed fields (handled automatically by Pydantic).
    HTTP 500 — agent invocation failure or JSON parse/validation error.
    """
    # Generate a unique reference number for this session
    reference_number = generate_reference_number()

    # Invoke the agent
    try:
        response: AnalysisResponse = invoke_advisor(request, reference_number)
    except Exception as exc:
        logger.error("Agent invocation failed: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": str(exc)},
        )

    return response


@app.post("/report")
def report(request: ReportRequest):
    """
    Accept a full AnalysisResponse payload, generate a government-style PDF
    report in-memory, and stream it back as application/pdf.

    HTTP 500 — PDF generation failure.
    HTTP 200 — PDF bytes with Content-Disposition attachment header.
    """
    try:
        pdf_buffer = generate_pdf_report(request.analysis)
    except Exception as exc:
        logger.error("PDF generation failed: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": f"PDF generation failed: {exc}"},
        )

    filename = f"JPJ-Report-{request.analysis.reference_number}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
