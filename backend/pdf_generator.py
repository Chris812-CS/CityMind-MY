"""
PDF report generator for CityMind MY — JPJ Traffic & Walkability AI Advisor.
Generates a government-style PDF entirely in-memory using ReportLab Platypus.
"""

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from models import AnalysisResponse

# ---------------------------------------------------------------------------
# Colour constants
# ---------------------------------------------------------------------------
PRIORITY_COLORS = {
    "Critical": colors.HexColor("#DC2626"),
    "High": colors.HexColor("#D97706"),
    "Medium": colors.HexColor("#2563EB"),
}

HEADER_BG = colors.HexColor("#1E3A5F")   # dark navy for section headers
LIGHT_GREY = colors.HexColor("#F3F4F6")
MID_GREY = colors.HexColor("#D1D5DB")
LOGO_GREY = colors.HexColor("#9CA3AF")

FOOTER_TEXT = "Laporan ini dijana oleh sistem AI JPJ — untuk kegunaan dalaman sahaja"

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
def _build_styles():
    base = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=base["Title"],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#1E3A5F"),
        spaceAfter=4,
        alignment=TA_CENTER,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=base["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#6B7280"),
        alignment=TA_CENTER,
        spaceAfter=2,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=base["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.white,
        backColor=HEADER_BG,
        spaceBefore=12,
        spaceAfter=6,
        leftIndent=-4,
        rightIndent=-4,
        borderPad=4,
    )

    body_style = ParagraphStyle(
        "BodyText",
        parent=base["Normal"],
        fontSize=9,
        leading=13,
        spaceAfter=4,
    )

    label_style = ParagraphStyle(
        "LabelText",
        parent=base["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#374151"),
        fontName="Helvetica-Bold",
    )

    bullet_style = ParagraphStyle(
        "BulletText",
        parent=base["Normal"],
        fontSize=9,
        leading=13,
        leftIndent=12,
        bulletIndent=0,
        spaceAfter=2,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=base["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.white,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=base["Normal"],
        fontSize=8,
        leading=11,
        alignment=TA_LEFT,
    )

    badge_style = ParagraphStyle(
        "BadgeText",
        parent=base["Normal"],
        fontSize=8,
        leading=11,
        textColor=colors.white,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )

    return {
        "title": title_style,
        "subtitle": subtitle_style,
        "section": section_heading,
        "body": body_style,
        "label": label_style,
        "bullet": bullet_style,
        "table_header": table_header_style,
        "table_cell": table_cell_style,
        "badge": badge_style,
    }


# ---------------------------------------------------------------------------
# Footer / header canvas callback
# ---------------------------------------------------------------------------
def _make_page_decorator(footer_text: str):
    """Return a canvas callback that draws the footer on every page."""

    def _on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica-Oblique", 7)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawCentredString(
            PAGE_W / 2,
            12 * mm,
            footer_text,
        )
        # Thin separator line above footer
        canvas.setStrokeColor(MID_GREY)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, 15 * mm, PAGE_W - MARGIN, 15 * mm)
        # Page number
        canvas.setFont("Helvetica", 7)
        canvas.drawRightString(
            PAGE_W - MARGIN,
            12 * mm,
            f"Muka surat {doc.page}",
        )
        canvas.restoreState()

    return _on_page


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------
def _logo_placeholder(width=120, height=60):
    """Return a Table that renders as a grey rectangle logo placeholder."""
    logo_table = Table(
        [[Paragraph("<b>JPJ</b>", ParagraphStyle(
            "LogoText",
            fontSize=18,
            textColor=colors.white,
            alignment=TA_CENTER,
        ))]],
        colWidths=[width],
        rowHeights=[height],
    )
    logo_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LOGO_GREY),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#6B7280")),
    ]))
    return logo_table


def _build_header_section(analysis: AnalysisResponse, styles: dict) -> list:
    """Build the report header: logo, title, date, reference number."""
    elements = []

    # Logo placeholder centred
    logo = _logo_placeholder(120, 60)
    logo_wrapper = Table([[logo]], colWidths=[PAGE_W - 2 * MARGIN])
    logo_wrapper.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(logo_wrapper)
    elements.append(Spacer(1, 6 * mm))

    # Report title
    elements.append(Paragraph(
        "Laporan Analisis Trafik dan Kemudahan Pejalan Kaki",
        styles["title"],
    ))

    # Date and reference number
    date_str = datetime.now().strftime("%d/%m/%Y")
    elements.append(Paragraph(
        f"Tarikh: {date_str}",
        styles["subtitle"],
    ))
    elements.append(Paragraph(
        f"No. Rujukan: {analysis.reference_number}",
        styles["subtitle"],
    ))

    elements.append(Spacer(1, 8 * mm))
    return elements


def _build_executive_summary(analysis: AnalysisResponse, styles: dict) -> list:
    elements = []
    elements.append(Paragraph("Executive Summary", styles["section"]))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(analysis.summary, styles["body"]))
    elements.append(Spacer(1, 4 * mm))
    return elements


def _build_location_conditions(analysis: AnalysisResponse, styles: dict) -> list:
    elements = []
    elements.append(Paragraph("Location &amp; Conditions", styles["section"]))
    elements.append(Spacer(1, 2 * mm))

    cond = analysis.conditions_applied

    data = [
        [Paragraph("Lokasi / Location:", styles["label"]),
         Paragraph(analysis.reference_number.split("-")[0] if False else
                   _get_location_name(analysis), styles["body"])],
        [Paragraph("Konteks Lokasi / Location Context:", styles["label"]),
         Paragraph(analysis.location_context or "—", styles["body"])],
        [Paragraph("Cuaca / Weather:", styles["label"]),
         Paragraph(cond.weather or "—", styles["body"])],
        [Paragraph("Masa / Time of Day:", styles["label"]),
         Paragraph(cond.time_of_day or "—", styles["body"])],
        [Paragraph("Jenis Acara / Event Type:", styles["label"]),
         Paragraph(cond.event_type or "—", styles["body"])],
    ]

    col_w = PAGE_W - 2 * MARGIN
    tbl = Table(data, colWidths=[col_w * 0.32, col_w * 0.68])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT_GREY]),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1, 4 * mm))
    return elements


def _get_location_name(analysis: AnalysisResponse) -> str:
    """Extract a human-readable location name from the analysis."""
    # The location name is not directly stored in AnalysisResponse,
    # but location_context usually starts with or references the location.
    # We use the reference number prefix as a fallback identifier.
    # Callers that have the original request should pass the location directly.
    return analysis.location_context.split(".")[0] if analysis.location_context else "—"


def _build_constraints(analysis: AnalysisResponse, styles: dict) -> list:
    elements = []
    elements.append(Paragraph("Constraints Applied", styles["section"]))
    elements.append(Spacer(1, 2 * mm))

    if not analysis.constraints_applied:
        elements.append(Paragraph("Tiada kekangan dikenalpasti / No constraints identified.", styles["body"]))
    else:
        for constraint in analysis.constraints_applied:
            elements.append(Paragraph(
                f"• {constraint}",
                styles["bullet"],
            ))

    elements.append(Spacer(1, 4 * mm))
    return elements


def _priority_badge_cell(priority: str, badge_style: ParagraphStyle) -> Paragraph:
    """Return a Paragraph styled as a coloured priority badge."""
    bg_color = PRIORITY_COLORS.get(priority, colors.HexColor("#6B7280"))
    # Use ReportLab's inline colour tag for background simulation via a nested table
    return Paragraph(
        f'<font color="white"><b>{priority}</b></font>',
        ParagraphStyle(
            f"Badge_{priority}",
            parent=badge_style,
            backColor=bg_color,
            textColor=colors.white,
            borderPad=3,
            alignment=TA_CENTER,
        ),
    )


def _build_recommendations_table(
    title: str,
    recommendations: list,
    styles: dict,
    has_edited_costs: bool = False,
) -> list:
    """Build a section with a heading, recommendations table, and per-rec cost breakdowns."""
    elements = []
    elements.append(Paragraph(title, styles["section"]))
    elements.append(Spacer(1, 2 * mm))

    if not recommendations:
        elements.append(Paragraph(
            "Tiada cadangan / No recommendations available.",
            styles["body"],
        ))
        elements.append(Spacer(1, 4 * mm))
        return elements

    col_w = PAGE_W - 2 * MARGIN

    for rec_idx, rec in enumerate(recommendations):
        priority_str = rec.priority_level.value if hasattr(rec.priority_level, "value") else str(rec.priority_level)
        bg = PRIORITY_COLORS.get(priority_str, colors.HexColor("#6B7280"))

        # Recommendation header row with priority badge
        rec_header_data = [[
            Paragraph(f"<b>{rec_idx + 1}. {rec.action}</b>", styles["table_cell"]),
            Paragraph(rec.responsible_party, styles["table_cell"]),
            Paragraph(rec.estimated_timeline, styles["table_cell"]),
            Paragraph(f'<font color="white"><b>{priority_str}</b></font>',
                      ParagraphStyle(f"Badge_{priority_str}", parent=styles["badge"],
                                     backColor=bg, textColor=colors.white, borderPad=2, alignment=TA_CENTER)),
        ]]
        rec_tbl = Table(rec_header_data, colWidths=[col_w * 0.44, col_w * 0.22, col_w * 0.18, col_w * 0.16])
        rec_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GREY),
            ("BACKGROUND", (3, 0), (3, 0), bg),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, MID_GREY),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(rec_tbl)

        # Expected impact line (if available)
        impact = getattr(rec, 'expected_impact', '') or ''
        if impact.strip():
            elements.append(Paragraph(
                f"<i>Expected Impact / Impak Dijangka: {impact}</i>",
                ParagraphStyle("ImpactLine", parent=styles["body"], fontSize=8,
                               textColor=colors.HexColor("#4B5563"),
                               fontName="Helvetica-Oblique", spaceBefore=2, spaceAfter=2,
                               leftIndent=5),
            ))

        # Cost breakdown table (if available)
        breakdown = getattr(rec, 'cost_breakdown', [])
        if breakdown:
            # Edited note
            if has_edited_costs:
                elements.append(Paragraph(
                    "* Kos disemak oleh pegawai / Cost reviewed by officer",
                    ParagraphStyle("EditedNote", parent=styles["body"], fontSize=7,
                                   textColor=colors.HexColor("#D97706"), spaceAfter=2),
                ))

            elements.append(Paragraph(
                "Pecahan Kos / Cost Breakdown:",
                ParagraphStyle("BreakdownLabel", parent=styles["body"], fontSize=8,
                               fontName="Helvetica-Bold", spaceBefore=3, spaceAfter=2),
            ))

            bd_col_w = [col_w * 0.40, col_w * 0.15, col_w * 0.20, col_w * 0.25]
            bd_header = [
                Paragraph("Item", styles["table_header"]),
                Paragraph("Qty", styles["table_header"]),
                Paragraph("Unit Cost (RM)", styles["table_header"]),
                Paragraph("Total (RM)", styles["table_header"]),
            ]
            bd_rows = [bd_header]
            row_total = 0
            for item in breakdown:
                item_total = getattr(item, 'total', 0)
                row_total += item_total
                bd_rows.append([
                    Paragraph(str(item.item), styles["table_cell"]),
                    Paragraph(str(item.qty), styles["table_cell"]),
                    Paragraph(f"RM {item.unit_cost:,}", styles["table_cell"]),
                    Paragraph(f"RM {item_total:,}", styles["table_cell"]),
                ])
            # Total row
            bd_rows.append([
                Paragraph("<b>JUMLAH / TOTAL</b>", styles["table_cell"]),
                Paragraph("", styles["table_cell"]),
                Paragraph("", styles["table_cell"]),
                Paragraph(f"<b>RM {row_total:,}</b>", styles["table_cell"]),
            ])

            bd_tbl = Table(bd_rows, colWidths=bd_col_w, repeatRows=1)
            bd_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#374151")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 7),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.3, MID_GREY),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, LIGHT_GREY]),
                ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F0F9FF")),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]))
            elements.append(bd_tbl)

        elements.append(Spacer(1, 3 * mm))

    elements.append(Spacer(1, 2 * mm))
    return elements


def _build_situation_metrics(analysis: AnalysisResponse, styles: dict) -> list:
    """Section 5 — Current Situation metrics table."""
    elements = []
    elements.append(Paragraph("Situasi Semasa / Current Situation", styles["section"]))
    elements.append(Spacer(1, 2 * mm))

    m = analysis.situation_metrics
    col_w = PAGE_W - 2 * MARGIN

    severity_color = (
        colors.HexColor("#DC2626") if m.severity_score >= 8 else
        colors.HexColor("#D97706") if m.severity_score >= 6 else
        colors.HexColor("#2563EB") if m.severity_score >= 4 else
        colors.HexColor("#16A34A")
    )
    severity_label = (
        "Critical" if m.severity_score >= 8 else
        "High" if m.severity_score >= 6 else
        "Moderate" if m.severity_score >= 4 else
        "Low"
    )

    risk_colors = {
        "Low": colors.HexColor("#16A34A"),
        "Moderate": colors.HexColor("#D97706"),
        "High": colors.HexColor("#DC2626"),
        "Critical": colors.HexColor("#7C3AED"),
    }
    risk_color = risk_colors.get(m.accident_risk, colors.HexColor("#6B7280"))

    data = [
        [Paragraph("<b>Metrik / Metric</b>", styles["table_header"]),
         Paragraph("<b>Nilai / Value</b>", styles["table_header"])],
        [Paragraph("Tahap Keterukan / Severity Score", styles["table_cell"]),
         Paragraph(f'<font color="white"><b>{m.severity_score}/10 — {severity_label}</b></font>',
                   ParagraphStyle("SevCell", parent=styles["table_cell"],
                                  backColor=severity_color, textColor=colors.white, borderPad=3))],
        [Paragraph("Masa Terbuang / Daily Time Wasted", styles["table_cell"]),
         Paragraph(f"{m.daily_time_wasted_minutes} min per commuter", styles["table_cell"])],
        [Paragraph("Risiko Kemalangan / Accident Risk", styles["table_cell"]),
         Paragraph(f'<font color="white"><b>{m.accident_risk}</b></font>',
                   ParagraphStyle("RiskCell", parent=styles["table_cell"],
                                  backColor=risk_color, textColor=colors.white, borderPad=3))],
        [Paragraph("Pengguna Terjejas / Affected Commuters", styles["table_cell"]),
         Paragraph(f"{m.estimated_affected_commuters:,} (estimated daily)", styles["table_cell"])],
        [Paragraph("Keterangan / Description", styles["table_cell"]),
         Paragraph(m.congestion_description or "—", styles["table_cell"])],
    ]

    # Append inferred affected groups row if available
    groups = getattr(m, 'inferred_affected_groups', []) or []
    if groups:
        data.append([
            Paragraph("Kumpulan Terjejas / Affected Groups", styles["table_cell"]),
            Paragraph(", ".join(groups), styles["body"]),
        ])

    tbl = Table(data, colWidths=[col_w * 0.40, col_w * 0.60])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1, 4 * mm))
    return elements


def _build_visual_analysis(analysis: AnalysisResponse, styles: dict, deferred_actions: set) -> list:
    """Section 6 — Visual Analysis: category counts, budget allocation, gantt summary tables."""
    elements = []
    elements.append(Paragraph("Analisis Visual / Visual Analysis", styles["section"]))
    elements.append(Spacer(1, 2 * mm))

    col_w = PAGE_W - 2 * MARGIN

    # ── Chart 1: Recommendations by Category (active only) ──
    elements.append(Paragraph(
        "Cadangan mengikut Kategori / Recommendations by Category (Active)",
        ParagraphStyle("ChartTitle", parent=styles["body"], fontSize=9,
                       fontName="Helvetica-Bold", spaceAfter=3),
    ))

    cat_labels = [
        ("traffic_flow", "🚦 Traffic Flow"),
        ("public_transport", "🚌 Public Transport"),
        ("walkability", "🚶 Walkability"),
        ("policy_enforcement", "📋 Policy & Enforcement"),
        ("affected_groups", "👥 Affected Groups"),
    ]
    cat_data = [
        [Paragraph("<b>Kategori</b>", styles["table_header"]),
         Paragraph("<b>Bilangan Aktif / Active Count</b>", styles["table_header"])],
    ]
    for key, label in cat_labels:
        recs = getattr(analysis.recommendations, key, [])
        active_count = sum(1 for r in recs if r.action not in deferred_actions)
        cat_data.append([
            Paragraph(label, styles["table_cell"]),
            Paragraph(str(active_count), styles["table_cell"]),
        ])
    cat_tbl = Table(cat_data, colWidths=[col_w * 0.70, col_w * 0.30])
    cat_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, MID_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
    ]))
    elements.append(cat_tbl)
    elements.append(Spacer(1, 3 * mm))

    # ── Chart 2: Budget Allocation (active only) ──
    elements.append(Paragraph(
        "Peruntukan Bajet / Budget Allocation (Active Only)",
        ParagraphStyle("ChartTitle2", parent=styles["body"], fontSize=9,
                       fontName="Helvetica-Bold", spaceAfter=3),
    ))

    def _active_cost(recs):
        total = 0
        for r in recs:
            if r.action in deferred_actions:
                continue
            bd = getattr(r, 'cost_breakdown', [])
            total += sum(getattr(i, 'total', 0) for i in bd) if bd else getattr(r, 'estimated_cost', 0)
        return total

    tf = _active_cost(analysis.recommendations.traffic_flow)
    pt = _active_cost(analysis.recommendations.public_transport)
    wk = _active_cost(analysis.recommendations.walkability)
    pe = _active_cost(analysis.recommendations.policy_enforcement)
    ag = _active_cost(getattr(analysis.recommendations, 'affected_groups', []) or [])
    active_total = tf + pt + wk + pe + ag

    budget_data = [
        [Paragraph("<b>Kategori</b>", styles["table_header"]),
         Paragraph("<b>Anggaran Kos (RM)</b>", styles["table_header"])],
        [Paragraph("🚦 Traffic Flow", styles["table_cell"]), Paragraph(f"RM {tf:,}", styles["table_cell"])],
        [Paragraph("🚌 Public Transport", styles["table_cell"]), Paragraph(f"RM {pt:,}", styles["table_cell"])],
        [Paragraph("🚶 Walkability", styles["table_cell"]), Paragraph(f"RM {wk:,}", styles["table_cell"])],
        [Paragraph("📋 Policy & Enforcement", styles["table_cell"]), Paragraph(f"RM {pe:,}", styles["table_cell"])],
        [Paragraph("👥 Affected Groups", styles["table_cell"]), Paragraph(f"RM {ag:,}", styles["table_cell"])],
        [Paragraph("<b>JUMLAH AKTIF / ACTIVE TOTAL</b>", styles["table_cell"]),
         Paragraph(f"<b>RM {active_total:,}</b>", styles["table_cell"])],
    ]
    budget_tbl = Table(budget_data, colWidths=[col_w * 0.65, col_w * 0.35])
    budget_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, MID_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, LIGHT_GREY]),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EFF6FF")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(budget_tbl)
    elements.append(Spacer(1, 4 * mm))
    return elements


def _build_budget_summary(analysis: AnalysisResponse, styles: dict) -> list:
    """Build a total budget summary table, excluding deferred recommendations."""
    elements = []
    elements.append(Paragraph("Ringkasan Bajet / Budget Summary", styles["section"]))
    elements.append(Spacer(1, 2 * mm))

    col_w = PAGE_W - 2 * MARGIN

    # Deferred recs are stored as extra attribute on analysis (set by frontend)
    deferred_recs = list(getattr(analysis, 'deferred_recommendations', None) or [])
    deferred_actions = {getattr(r, 'action', '') for r in deferred_recs}

    def _cat_total_active(recs: list) -> int:
        """Sum costs excluding deferred items."""
        total = 0
        for r in recs:
            if r.action in deferred_actions:
                continue
            breakdown = getattr(r, 'cost_breakdown', [])
            cost = sum(getattr(i, 'total', 0) for i in breakdown) if breakdown else getattr(r, 'estimated_cost', 0)
            total += cost
        return total

    def _cat_total_deferred(recs: list) -> int:
        total = 0
        for r in recs:
            if r.action not in deferred_actions:
                continue
            breakdown = getattr(r, 'cost_breakdown', [])
            cost = sum(getattr(i, 'total', 0) for i in breakdown) if breakdown else getattr(r, 'estimated_cost', 0)
            total += cost
        return total

    all_recs = (
        list(analysis.recommendations.traffic_flow) +
        list(analysis.recommendations.public_transport) +
        list(analysis.recommendations.walkability) +
        list(analysis.recommendations.policy_enforcement) +
        list(getattr(analysis.recommendations, 'affected_groups', []) or [])
    )

    tf = _cat_total_active(analysis.recommendations.traffic_flow)
    pt = _cat_total_active(analysis.recommendations.public_transport)
    wk = _cat_total_active(analysis.recommendations.walkability)
    pe = _cat_total_active(analysis.recommendations.policy_enforcement)
    ag = _cat_total_active(getattr(analysis.recommendations, 'affected_groups', []) or [])
    grand = tf + pt + wk + pe + ag

    deferred_total = sum(_cat_total_deferred([r]) for r in all_recs)

    rows = [
        [Paragraph("<b>Kategori / Category</b>", styles["table_header"]),
         Paragraph("<b>Anggaran Kos / Est. Cost (RM)</b>", styles["table_header"])],
        [Paragraph("🚦 Aliran Trafik / Traffic Flow", styles["table_cell"]),
         Paragraph(f"RM {int(tf):,}", styles["table_cell"])],
        [Paragraph("🚌 Pengangkutan Awam / Public Transport", styles["table_cell"]),
         Paragraph(f"RM {int(pt):,}", styles["table_cell"])],
        [Paragraph("🚶 Kemudahan Pejalan Kaki / Walkability", styles["table_cell"]),
         Paragraph(f"RM {int(wk):,}", styles["table_cell"])],
        [Paragraph("📋 Dasar & Penguatkuasaan / Policy & Enforcement", styles["table_cell"]),
         Paragraph(f"RM {int(pe):,}", styles["table_cell"])],
        [Paragraph("👥 Kumpulan Terjejas / Affected Groups", styles["table_cell"]),
         Paragraph(f"RM {int(ag):,}", styles["table_cell"])],
        [Paragraph("<b>JUMLAH KESELURUHAN / GRAND TOTAL</b>",
                   ParagraphStyle("GrandTotalText", parent=styles["table_cell"],
                                  textColor=colors.white, fontName="Helvetica-Bold")),
         Paragraph(f"<b>RM {int(grand):,}</b>",
                   ParagraphStyle("GrandTotalAmt", parent=styles["table_cell"],
                                  textColor=colors.white, fontName="Helvetica-Bold"))],
    ]

    tbl = Table(rows, colWidths=[col_w * 0.65, col_w * 0.35])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, LIGHT_GREY]),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#1a2744")),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(tbl)

    # Deferred total note + combined total
    if deferred_total > 0:
        elements.append(Spacer(1, 2 * mm))
        combined_total = grand + deferred_total
        deferred_rows = [
            [Paragraph("Ditangguhkan / Deferred", styles["table_cell"]),
             Paragraph(f"RM {int(deferred_total):,}", styles["table_cell"])],
            [Paragraph("<b>Jumlah Keseluruhan Termasuk Ditangguhkan / Total Including Deferred</b>",
                       ParagraphStyle("CombinedTotalText", parent=styles["table_cell"],
                                      textColor=colors.white, fontName="Helvetica-Bold")),
             Paragraph(f"<b>RM {int(combined_total):,}</b>",
                       ParagraphStyle("CombinedTotalAmt", parent=styles["table_cell"],
                                      textColor=colors.white, fontName="Helvetica-Bold"))],
        ]
        combined_tbl = Table(deferred_rows, colWidths=[col_w * 0.65, col_w * 0.35])
        combined_tbl.setStyle(TableStyle([
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, MID_GREY),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#6B7280")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#1a2744")),
            ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ]))
        elements.append(combined_tbl)

    elements.append(Spacer(1, 4 * mm))
    return elements


def _build_deferred_section(analysis: AnalysisResponse, styles: dict) -> list:
    """Build a separate section for deferred recommendations."""
    deferred_recs = list(getattr(analysis, 'deferred_recommendations', None) or [])
    if not deferred_recs:
        return []

    elements = []
    elements.append(Paragraph(
        "Cadangan Ditangguhkan / Deferred Recommendations",
        styles["section"],
    ))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(
        "Ditangguhkan disebabkan kekangan bajet / Deferred due to budget constraints",
        ParagraphStyle("DeferredSubtitle", parent=styles["body"], fontSize=8,
                       textColor=colors.HexColor("#6B7280"), fontName="Helvetica-Oblique",
                       spaceAfter=6),
    ))

    col_w = PAGE_W - 2 * MARGIN
    deferred_total = 0

    for idx, rec in enumerate(deferred_recs):
        action = getattr(rec, 'action', getattr(rec, 'fullAction', '—'))
        responsible = getattr(rec, 'responsible_party', '—')
        timeline = getattr(rec, 'estimated_timeline', '—')
        priority = getattr(rec, 'priority_level', '—')
        if hasattr(priority, 'value'):
            priority = priority.value
        breakdown = getattr(rec, 'editedBreakdown', None) or getattr(rec, 'cost_breakdown', [])
        cost = sum(getattr(i, 'total', 0) for i in breakdown) if breakdown else getattr(rec, 'estimated_cost', 0)
        deferred_total += cost

        row_data = [[
            Paragraph(f"<strike>{idx + 1}. {action}</strike>", styles["table_cell"]),
            Paragraph(responsible, styles["table_cell"]),
            Paragraph(timeline, styles["table_cell"]),
            Paragraph(f"RM {int(cost):,}", styles["table_cell"]),
        ]]
        row_tbl = Table(row_data, colWidths=[col_w * 0.44, col_w * 0.22, col_w * 0.18, col_w * 0.16])
        row_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#9CA3AF")),
            ("GRID", (0, 0), (-1, -1), 0.3, MID_GREY),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(row_tbl)
        elements.append(Spacer(1, 1 * mm))

    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(
        f"<b>Jumlah Ditangguhkan / Deferred Total: RM {int(deferred_total):,}</b>",
        ParagraphStyle("DeferredTotal", parent=styles["body"], fontSize=9,
                       textColor=colors.HexColor("#6B7280")),
    ))
    elements.append(Spacer(1, 4 * mm))
    return elements


# ---------------------------------------------------------------------------
# Gantt chart — ReportLab canvas drawing
# ---------------------------------------------------------------------------

def _classify_gantt_item(action: str, category: str, priority: str) -> dict:
    """Classify a recommendation for Gantt sequencing."""
    a = action.lower()
    import re
    is_assessment = bool(re.search(r'audit|assess|study|survey|review|inspect|evaluat', a))
    is_construction = bool(re.search(r'install|construct|build|widen|upgrade|lay|pave|erect', a))
    is_policy = category == "policy_enforcement"
    is_enforcement = bool(re.search(r'enforce|patrol|fine|penalt|monitor|deploy officer', a))
    is_independent = is_policy or is_enforcement or is_assessment or priority == "Critical"
    return {
        "is_independent": is_independent,
        "is_assessment": is_assessment,
        "is_construction": is_construction,
    }


def _build_gantt_items(analysis: AnalysisResponse) -> list:
    """Build Gantt item list with start months and dependencies."""
    import re
    cats = ["traffic_flow", "public_transport", "walkability", "policy_enforcement", "affected_groups"]
    priority_order = {"Critical": 0, "High": 1, "Medium": 2}

    all_recs = []
    for cat in cats:
        for rec in getattr(analysis.recommendations, cat):
            p = rec.priority_level.value if hasattr(rec.priority_level, "value") else str(rec.priority_level)
            all_recs.append({"rec": rec, "cat": cat, "priority": p})

    all_recs.sort(key=lambda x: priority_order.get(x["priority"], 99))

    items = []
    id_counter = 1
    classified = []
    for entry in all_recs:
        rec = entry["rec"]
        cat = entry["cat"]
        p = entry["priority"]
        cl = _classify_gantt_item(rec.action, cat, p)
        classified.append({**entry, "id": id_counter, **cl})
        id_counter += 1

    assessment_ids = [c["id"] for c in classified if c["is_assessment"]]

    for c in classified:
        p = c["priority"]
        rec = c["rec"]

        # Duration: parse weeks from timeline, convert to months
        nums = [int(n) for n in re.findall(r'\d+', rec.estimated_timeline)]
        weeks = nums[-1] if nums else 4
        duration_months = max(1, round(weeks / 4))

        depends_on = None
        if p == "Critical":
            start_month = 1
        elif p == "High":
            if c["is_construction"] and assessment_ids:
                last_assess_id = assessment_ids[-1]
                last_assess = next((i for i in items if i["id"] == last_assess_id), None)
                start_month = (last_assess["start_month"] + last_assess["duration_months"]) if last_assess else 2
                depends_on = last_assess_id
            elif c["is_independent"]:
                start_month = 1
            else:
                critical_items = [i for i in items if i["priority"] == "Critical"]
                max_crit_end = max((i["start_month"] + i["duration_months"] - 1 for i in critical_items), default=1)
                start_month = max_crit_end + 1
                if critical_items:
                    depends_on = critical_items[-1]["id"]
        else:  # Medium
            high_items = [i for i in items if i["priority"] == "High"]
            max_high_end = max((i["start_month"] + i["duration_months"] - 1 for i in high_items), default=2)
            start_month = max(3, max_high_end + 1)
            if high_items:
                depends_on = high_items[-1]["id"]

        label = f"{c['id']}. {rec.action[:30]}{'…' if len(rec.action) > 30 else ''}"
        items.append({
            "id": c["id"],
            "label": label,
            "full_action": rec.action,
            "priority": p,
            "category": c["cat"],
            "start_month": start_month,
            "duration_months": duration_months,
            "depends_on": depends_on,
        })

    return items


class _GanttDrawing:
    """A ReportLab Flowable that draws the Gantt chart using canvas primitives."""

    from reportlab.platypus import Flowable

    def __init__(self, items: list, width: float):
        from reportlab.platypus import Flowable
        self.__class__ = type("GanttFlowable", (Flowable,), {
            "draw": _GanttDrawing._draw,
            "wrap": _GanttDrawing._wrap,
            "__init__": lambda s, i, w: None,
        })
        self.items = items
        self.chart_width = width
        self.row_h = 22
        self.label_w = 180
        self.total_months = 6
        self.pad_top = 24
        self.bar_h = 14
        self.chart_h = self.pad_top + len(items) * self.row_h + 20

        self.priority_colors_hex = {
            "Critical": "#DC2626",
            "High": "#F97316",
            "Medium": "#2563EB",
        }

    def _wrap(self, avail_w, avail_h):
        return self.chart_width, self.chart_h

    def _draw(self):
        from reportlab.lib import colors as rl_colors
        c = self.canv
        items = self.items
        row_h = self.row_h
        label_w = self.label_w
        total_months = self.total_months
        pad_top = self.pad_top
        bar_h = self.bar_h
        chart_w = self.chart_width
        month_w = (chart_w - label_w) / total_months

        def bar_x(start_month):
            return label_w + (start_month - 1) * month_w

        def bar_w(dur):
            return max(dur * month_w - 2, 4)

        def row_center_y(idx):
            return self.chart_h - pad_top - idx * row_h - row_h / 2

        # Background and month headers
        for i in range(total_months):
            x = label_w + i * month_w
            bg = rl_colors.HexColor("#F8FAFC") if i % 2 == 0 else rl_colors.HexColor("#F1F5F9")
            c.setFillColor(bg)
            c.rect(x, 0, month_w, self.chart_h, fill=1, stroke=0)
            # Month label
            c.setFillColor(rl_colors.HexColor("#374151"))
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(x + month_w / 2, self.chart_h - 14, f"Month {i + 1}")
            # Grid line
            c.setStrokeColor(rl_colors.HexColor("#E2E8F0"))
            c.setLineWidth(0.5)
            c.line(x, 0, x, self.chart_h - pad_top)

        # Label area background
        c.setFillColor(rl_colors.white)
        c.rect(0, 0, label_w, self.chart_h, fill=1, stroke=0)

        # Build id→item map for dependency arrows
        item_map = {item["id"]: (idx, item) for idx, item in enumerate(items)}

        # Draw rows bottom-to-top (ReportLab y=0 is bottom)
        for idx, item in enumerate(items):
            y_center = row_center_y(idx)
            y_row_bottom = y_center - row_h / 2

            # Alternating row bg in label area
            row_bg = rl_colors.white if idx % 2 == 0 else rl_colors.HexColor("#F9FAFB")
            c.setFillColor(row_bg)
            c.rect(0, y_row_bottom, label_w, row_h, fill=1, stroke=0)

            # Label text
            c.setFillColor(rl_colors.HexColor("#374151"))
            c.setFont("Helvetica", 7)
            c.drawString(4, y_center - 3, item["label"])

            # Bar
            bx = bar_x(item["start_month"])
            bw = bar_w(item["duration_months"])
            by = y_center - bar_h / 2
            bar_color = rl_colors.HexColor(self.priority_colors_hex.get(item["priority"], "#6B7280"))
            c.setFillColor(bar_color)
            c.setFillAlpha(0.85)
            c.roundRect(bx, by, bw, bar_h, 2, fill=1, stroke=0)
            c.setFillAlpha(1.0)

            # Duration label inside bar
            if bw > 24:
                c.setFillColor(rl_colors.white)
                c.setFont("Helvetica-Bold", 7)
                c.drawCentredString(bx + bw / 2, by + bar_h / 2 - 3, f"{item['duration_months']}mo")

            # Dependency arrow
            if item["depends_on"] is not None and item["depends_on"] in item_map:
                dep_idx, dep_item = item_map[item["depends_on"]]
                from_x = bar_x(dep_item["start_month"]) + bar_w(dep_item["duration_months"])
                from_y = row_center_y(dep_idx)
                to_x = bx
                to_y = y_center
                mid_x = from_x + 6

                c.setStrokeColor(rl_colors.HexColor("#94A3B8"))
                c.setLineWidth(0.8)
                c.setDash(3, 2)
                p_path = c.beginPath()
                p_path.moveTo(from_x, from_y)
                p_path.lineTo(mid_x, from_y)
                p_path.lineTo(mid_x, to_y)
                p_path.lineTo(to_x - 4, to_y)
                c.drawPath(p_path, stroke=1, fill=0)
                c.setDash()
                # Arrowhead
                c.setFillColor(rl_colors.HexColor("#94A3B8"))
                c.setStrokeColor(rl_colors.HexColor("#94A3B8"))
                arrow = c.beginPath()
                arrow.moveTo(to_x - 4, to_y - 3)
                arrow.lineTo(to_x, to_y)
                arrow.lineTo(to_x - 4, to_y + 3)
                c.drawPath(arrow, stroke=1, fill=0)

        # Bottom axis label
        c.setFillColor(rl_colors.HexColor("#9CA3AF"))
        c.setFont("Helvetica-Oblique", 7)
        c.drawCentredString(label_w + (total_months * month_w) / 2, 4, "Bulan / Month")


def _build_gantt_chart(analysis: AnalysisResponse, styles: dict, deferred_actions: set = None) -> list:
    """Build the Gantt implementation timeline as a ReportLab table — active items only."""
    elements = []
    elements.append(Paragraph(
        "Jadual Pelaksanaan / Implementation Timeline",
        styles["section"],
    ))
    elements.append(Spacer(1, 3 * mm))

    all_items = _build_gantt_items(analysis)
    # Filter out deferred items
    if deferred_actions:
        items = [i for i in all_items if i["full_action"] not in deferred_actions]
    else:
        items = all_items
    if not items:
        elements.append(Paragraph("Tiada item untuk dipaparkan / No items to display.", styles["body"]))
        elements.append(Spacer(1, 4 * mm))
        return elements

    col_w = PAGE_W - 2 * MARGIN

    priority_badge_colors = {
        "Critical": colors.HexColor("#DC2626"),
        "High":     colors.HexColor("#F97316"),
        "Medium":   colors.HexColor("#2563EB"),
    }

    # Header row
    header = [
        Paragraph("<b>#</b>", styles["table_header"]),
        Paragraph("<b>Tindakan / Action</b>", styles["table_header"]),
        Paragraph("<b>Mula / Start</b>", styles["table_header"]),
        Paragraph("<b>Tempoh / Duration</b>", styles["table_header"]),
        Paragraph("<b>Tamat / End</b>", styles["table_header"]),
        Paragraph("<b>Keutamaan / Priority</b>", styles["table_header"]),
    ]

    rows = [header]
    row_styles = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, MID_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
    ]

    for i, item in enumerate(items, start=1):
        end_month = item["start_month"] + item["duration_months"] - 1
        p = item["priority"]
        badge_color = priority_badge_colors.get(p, colors.HexColor("#6B7280"))

        badge_style = ParagraphStyle(
            f"GanttBadge_{p}_{i}",
            fontSize=7,
            fontName="Helvetica-Bold",
            textColor=colors.white,
            backColor=badge_color,
            borderPad=2,
            alignment=1,  # CENTER
        )

        rows.append([
            Paragraph(str(i), styles["table_cell"]),
            Paragraph(item["full_action"][:80], styles["table_cell"]),
            Paragraph(f"Month {item['start_month']}", styles["table_cell"]),
            Paragraph(f"{item['duration_months']} month{'s' if item['duration_months'] != 1 else ''}", styles["table_cell"]),
            Paragraph(f"Month {end_month}", styles["table_cell"]),
            Paragraph(f'<font color="white"><b>{p}</b></font>', badge_style),
        ])

        # Colour the priority cell
        row_styles.append(("BACKGROUND", (5, i), (5, i), badge_color))
        row_styles.append(("TEXTCOLOR", (5, i), (5, i), colors.white))

        # Indent dependent items slightly
        if item.get("depends_on") is not None:
            row_styles.append(("LEFTPADDING", (1, i), (1, i), 14))

    col_widths = [
        col_w * 0.05,   # #
        col_w * 0.38,   # Action
        col_w * 0.12,   # Start
        col_w * 0.14,   # Duration
        col_w * 0.12,   # End
        col_w * 0.19,   # Priority
    ]

    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle(row_styles))
    elements.append(tbl)
    elements.append(Spacer(1, 3 * mm))

    # Legend note
    elements.append(Paragraph(
        "↳ Indented rows depend on the item above them / "
        "Baris berinden bergantung pada item di atasnya",
        ParagraphStyle(
            "GanttNote",
            parent=styles["body"],
            fontSize=7,
            textColor=colors.HexColor("#64748B"),
            fontName="Helvetica-Oblique",
        ),
    ))
    elements.append(Spacer(1, 4 * mm))
    return elements


def _build_risk_assessment(analysis: AnalysisResponse, styles: dict) -> list:
    elements = []
    elements.append(Paragraph("Risk Assessment", styles["section"]))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(analysis.risk_assessment or "—", styles["body"]))
    elements.append(Spacer(1, 4 * mm))
    return elements


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def generate_pdf_report(analysis: AnalysisResponse) -> io.BytesIO:
    """
    Generate a government-style PDF report for the given AnalysisResponse.

    Returns a BytesIO object whose .getvalue() contains the raw PDF bytes.
    No file is written to disk.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=25 * mm,  # leave room for footer
        title="Laporan Analisis Trafik dan Kemudahan Pejalan Kaki",
        author="CityMind MY — JPJ AI Advisor",
    )

    styles = _build_styles()
    page_decorator = _make_page_decorator(FOOTER_TEXT)

    story = []

    # Collect deferred info once
    deferred_recs = list(getattr(analysis, 'deferred_recommendations', None) or [])
    deferred_actions = {getattr(r, 'action', '') for r in deferred_recs}
    has_edited = getattr(analysis, 'has_edited_costs', False)

    # 1. Header
    story.extend(_build_header_section(analysis, styles))

    # 2. Executive Summary
    story.extend(_build_executive_summary(analysis, styles))

    # Officer-adjusted costs notice
    if has_edited:
        notice_style = ParagraphStyle(
            "EditedNotice",
            parent=styles["body"],
            fontSize=8,
            textColor=colors.HexColor("#D97706"),
            backColor=colors.HexColor("#FFFBEB"),
            borderPad=6,
            spaceAfter=8,
        )
        story.append(Paragraph(
            "* Kos telah disemak semula oleh pegawai JPJ / "
            "Cost reviewed and adjusted by JPJ officer",
            notice_style,
        ))
        story.append(Spacer(1, 2 * mm))

    # 3. Location & Conditions
    story.extend(_build_location_conditions(analysis, styles))

    # 4. Constraints Applied
    story.extend(_build_constraints(analysis, styles))

    # 5. Current Situation (severity metrics)
    if hasattr(analysis, 'situation_metrics') and analysis.situation_metrics:
        story.extend(_build_situation_metrics(analysis, styles))

    # 6. Visual Analysis (category counts, budget allocation tables)
    story.extend(_build_visual_analysis(analysis, styles, deferred_actions))

    # Filter active recommendations (exclude deferred) for sections 7-10
    def _active(recs):
        return [r for r in recs if r.action not in deferred_actions]

    # 7. Traffic Flow Recommendations (active only)
    story.extend(_build_recommendations_table(
        "Traffic Flow Recommendations",
        _active(analysis.recommendations.traffic_flow),
        styles,
        has_edited_costs=has_edited,
    ))

    # 8. Public Transport Recommendations (active only)
    story.extend(_build_recommendations_table(
        "Public Transport Recommendations",
        _active(analysis.recommendations.public_transport),
        styles,
        has_edited_costs=has_edited,
    ))

    # 9. Walkability Recommendations (active only)
    story.extend(_build_recommendations_table(
        "Walkability Recommendations",
        _active(analysis.recommendations.walkability),
        styles,
        has_edited_costs=has_edited,
    ))

    # 10. Policy/Enforcement Actions (active only)
    story.extend(_build_recommendations_table(
        "Policy/Enforcement Actions",
        _active(analysis.recommendations.policy_enforcement),
        styles,
        has_edited_costs=has_edited,
    ))

    # 11. Affected Groups Recommendations (active only)
    ag_recs = _active(getattr(analysis.recommendations, 'affected_groups', []) or [])
    if ag_recs:
        story.extend(_build_recommendations_table(
            "Affected Groups Recommendations / Cadangan Kumpulan Terjejas",
            ag_recs,
            styles,
            has_edited_costs=has_edited,
        ))

    # 12. Risk Assessment
    story.extend(_build_risk_assessment(analysis, styles))

    # 12. Deferred Recommendations (if any)
    story.extend(_build_deferred_section(analysis, styles))

    # 13. Implementation Timeline (Gantt — active items only)
    story.extend(_build_gantt_chart(analysis, styles, deferred_actions=deferred_actions))

    # 14. Budget Summary (active only + deferred breakdown + combined total)
    story.extend(_build_budget_summary(analysis, styles))

    doc.build(story, onFirstPage=page_decorator, onLaterPages=page_decorator)

    buffer.seek(0)
    return buffer
