"""Professional Interview Guide PDF Generator for TalentIQ.
Generates an A4 evaluation document containing strictly:
1. Candidate Information (Name, email, phone, role, technical skills, key projects, work experience, academic credentials)
2. Interview Questions divided into three subsections:
   - Beginner Level
   - Intermediate Level
   - Advanced Level
Each question includes question number, question text, related skill/project, difficulty level, and reason for asking.
Follows strict pagination and KeepTogether rules to avoid page break splits.
"""
import io
import os
from typing import Dict, Any, List
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, KeepTogether, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print 'Page X of Y' on all pages."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        page_w, page_h = A4
        # Running header rule
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, page_h - 30, page_w - 36, page_h - 30)

        # Running header text
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#475569"))
        self.drawString(36, page_h - 24, "CANDIDATE INTERVIEW GUIDE & EVALUATION MATRIX")
        self.setFont("Helvetica", 7.5)
        self.drawRightString(page_w - 36, page_h - 24, "CONFIDENTIAL")

        # Running footer rule
        self.line(36, 32, page_w - 36, 32)
        # Running footer text
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(36, 20, "Technical Evaluation Rubric — TalentIQ Intelligence Platform")
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(page_w - 36, 20, page_str)
        self.restoreState()


def build_interview_guide_pdf(candidate_info: Dict[str, Any], questions: List[Dict[str, Any]], job_role: str) -> bytes:
    """Builds and returns professional interview guide PDF bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#2563eb")
    )
    meta_style = ParagraphStyle(
        "DocMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#475569")
    )
    sec_heading_style = ParagraphStyle(
        "SecHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        keepWithNext=True
    )
    subsec_heading_style = ParagraphStyle(
        "SubSecHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1e40af"),
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b")
    )
    bold_body_style = ParagraphStyle(
        "BoldBody",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0f172a")
    )
    q_title_style = ParagraphStyle(
        "QuestionTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#0f172a")
    )
    q_reason_style = ParagraphStyle(
        "QuestionReason",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#475569")
    )
    q_answer_style = ParagraphStyle(
        "QuestionAnswer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#334155")
    )
    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#1e3a8a")
    )

    story = []

    # -------------------------------------------------------------
    # Document Header: Candidate & Job Target
    # -------------------------------------------------------------
    name = candidate_info.get("full_name") or candidate_info.get("name", "Candidate")
    email = candidate_info.get("email", "Not provided")
    phone = candidate_info.get("phone", "Not provided")
    exp_years = candidate_info.get("years_of_experience", 3.0)

    header_table_data = [
        [
            Paragraph(f"<b>Candidate Interview Guide: {name}</b>", title_style),
            Paragraph(f"<b>Target Role:</b> {job_role}", subtitle_style)
        ],
        [
            Paragraph(f"<b>Email:</b> {email} &nbsp;|&nbsp; <b>Phone:</b> {phone} &nbsp;|&nbsp; <b>Experience:</b> {exp_years}+ Years", meta_style),
            Paragraph("<b>Assessment Type:</b> Structured Multi-Tier Technical Interview", meta_style)
        ]
    ]
    header_table = Table(header_table_data, colWidths=[330, 193])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284c7"), spaceAfter=10))

    # -------------------------------------------------------------
    # SECTION 1: CANDIDATE INFORMATION
    # -------------------------------------------------------------
    story.append(Paragraph("1. Candidate Background & Qualifications", sec_heading_style))
    story.append(Spacer(1, 4))

    # Technical Skills List
    skills_list = candidate_info.get("skills") or candidate_info.get("technical_skills", [])
    skills_str = ", ".join(skills_list) if skills_list else "Documented in resume profile"
    skills_table = Table([
        [Paragraph("<b>Technical Competencies:</b>", bold_body_style)],
        [Paragraph(skills_str, body_style)]
    ], colWidths=[523])
    skills_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(skills_table)
    story.append(Spacer(1, 8))

    # Academic Credentials (Separate Cards)
    education = candidate_info.get("education", [])
    if education:
        edu_blocks = [Paragraph("<b>Academic Credentials:</b>", bold_body_style)]
        for edu in education[:3]:
            deg = edu.get("degree") or edu.get("qualification", "Degree")
            spec = edu.get("specialization", "")
            spec_str = f" in {spec}" if spec and spec != "Computer Science & Engineering" else ""
            inst = edu.get("institution", "Accredited University")
            yr = edu.get("year") or edu.get("duration", "Documented")
            grd = edu.get("grade", "")
            grd_str = f" &nbsp;|&nbsp; <b>Grade:</b> {grd}" if grd and grd != "Not provided" else ""
            
            line_html = f"• <b>{deg}{spec_str}</b> — {inst} &nbsp;({yr}){grd_str}"
            edu_blocks.append(Paragraph(line_html, body_style))

        edu_table = Table([[b] for b in edu_blocks], colWidths=[523])
        edu_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ffffff")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(KeepTogether(edu_table))
        story.append(Spacer(1, 8))

    # Key Projects (Each project independent, never combined)
    projects = candidate_info.get("projects", [])
    if projects:
        story.append(Paragraph("<b>Key Technical Projects:</b>", bold_body_style))
        story.append(Spacer(1, 3))

        for p in projects[:3]:
            p_title = p.get("title") or p.get("name", "Project")
            p_desc = p.get("description", "Engineered software components and data flows.")
            p_tech = ", ".join(p.get("technologies") or p.get("tech_stack", [])) or "Technologies used"
            p_contrib = p.get("contributions") or p.get("key_contributions", "Delivered core implementation.")
            p_link = p.get("link") or p.get("project_link", "Not provided")
            link_str = f" &nbsp;|&nbsp; <b>Link:</b> {p_link}" if p_link != "Not provided" else ""

            proj_card_data = [
                [Paragraph(f"<b>Project: {p_title}</b>", bold_body_style)],
                [Paragraph(f"<b>Technologies Used:</b> {p_tech}{link_str}", meta_style)],
                [Paragraph(f"<b>Project Description:</b> {p_desc}", body_style)],
                [Paragraph(f"<b>Key Contributions:</b> {p_contrib}", body_style)]
            ]
            proj_card = Table(proj_card_data, colWidths=[523])
            proj_card.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor("#e2e8f0")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(KeepTogether(proj_card))
            story.append(Spacer(1, 6))

    # Work Experience
    experience = candidate_info.get("experience", [])
    if experience:
        exp_blocks = [Paragraph("<b>Professional Work Experience:</b>", bold_body_style)]
        for exp in experience[:2]:
            t = exp.get("title", "Software Engineer")
            c = exp.get("company", "Technology Company")
            d = exp.get("duration", "Documented")
            h_list = exp.get("highlights", [])
            h_str = f" — {h_list[0]}" if h_list else ""
            exp_blocks.append(Paragraph(f"• <b>{t}</b> at {c} &nbsp;({d}){h_str}", body_style))

        exp_table = Table([[b] for b in exp_blocks], colWidths=[523])
        exp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ffffff")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(KeepTogether(exp_table))
        story.append(Spacer(1, 10))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284c7"), spaceAfter=10))

    # -------------------------------------------------------------
    # SECTION 2: INTERVIEW QUESTIONS (3 DIFFICULTY TIERS)
    # -------------------------------------------------------------
    story.append(Paragraph("2. Tailored Technical Interview Questions & Evaluation Rubric", sec_heading_style))
    story.append(Spacer(1, 4))

    # Separate questions into 3 difficulty tiers
    beginner_qs = [q for q in questions if str(q.get("difficulty", "")).lower() == "beginner"]
    intermediate_qs = [q for q in questions if str(q.get("difficulty", "")).lower() == "intermediate"]
    advanced_qs = [q for q in questions if str(q.get("difficulty", "")).lower() == "advanced"]

    # If difficulty tiers not pre-labeled, distribute evenly
    if not beginner_qs and not intermediate_qs and not advanced_qs:
        total_q = len(questions)
        third = max(1, total_q // 3)
        beginner_qs = questions[:third]
        intermediate_qs = questions[third:third*2]
        advanced_qs = questions[third*2:]

    question_counter = 1

    def render_question_tier(tier_title: str, tier_questions: List[Dict[str, Any]], bg_color: str):
        nonlocal question_counter
        if not tier_questions:
            return

        tier_elements = []
        tier_elements.append(Paragraph(f"<b>{tier_title} ({len(tier_questions)} Questions)</b>", subsec_heading_style))
        tier_elements.append(Spacer(1, 4))

        for q in tier_questions:
            q_text = q.get("question", "")
            q_skill = q.get("skill_tested") or q.get("skill") or "Technical Competency"
            q_cat = q.get("question_category") or q.get("category") or "Practical Implementation"
            q_reason = q.get("reason_for_asking") or q.get("evaluation_rubric") or "Evaluates foundational understanding of core concepts and design trade-offs."
            q_points = q.get("expected_answer_points") or q.get("points") or []

            points_html = ""
            if q_points:
                formatted_points = " &nbsp;•&nbsp; ".join(q_points[:3])
                points_html = f"<br/><b>Expected Answer Key Points:</b> {formatted_points}"

            q_card_data = [
                [
                    Paragraph(f"<b>Question {question_counter}:</b> {q_text}", q_title_style)
                ],
                [
                    Paragraph(f"<b>Related Skill/Project:</b> {q_skill} &nbsp;|&nbsp; <b>Evaluation Category:</b> {q_cat}", badge_style)
                ],
                [
                    Paragraph(f"<b>Why this question is being asked:</b> {q_reason}{points_html}", q_reason_style)
                ]
            ]
            q_card = Table(q_card_data, colWidths=[523])
            q_card.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg_color)),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            tier_elements.append(KeepTogether(q_card))
            tier_elements.append(Spacer(1, 5))
            question_counter += 1

        story.append(KeepTogether(tier_elements[0:2]))
        for el in tier_elements[2:]:
            story.append(el)
        story.append(Spacer(1, 6))

    # Render Beginner, Intermediate, and Advanced Tiers
    render_question_tier("Subsection 2.1 — Beginner Level (Fundamentals & Concepts)", beginner_qs, "#f8fafc")
    render_question_tier("Subsection 2.2 — Intermediate Level (Practical Implementation & Debugging)", intermediate_qs, "#f0fdf4")
    render_question_tier("Subsection 2.3 — Advanced Level (System Design, Performance & Architecture)", advanced_qs, "#faf5ff")

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()
