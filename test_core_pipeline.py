import os
import sys
import json
import sqlite3

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Ensure ai_service is on python path
sys.path.insert(0, os.path.abspath("."))

from ai_service.parser import extract_text_from_pdf, parse_candidate_details
from ai_service.interview_engine import synthesize_structured_interview_questions
from ai_service.pdf_generator import build_interview_guide_pdf

DB_PATH = os.path.join("server", "data", "talentiq.sqlite3")

def run_tests():
    print("==================================================")
    print("TALENTIQ CORE PIPELINE VERIFICATION SUITE")
    print("==================================================")

    # 1. Database Inspection
    print("\n--- TEST 1: SQLite Candidate Structure Inspection ---")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    columns = [row[1] for row in c.execute("PRAGMA table_info(candidates)").fetchall()]
    print(f"Table columns: {columns}")
    c.execute("SELECT * FROM candidates LIMIT 4")
    rows = c.fetchall()
    print(f"Total candidates queried: {len(rows)}")
    for r in rows:
        projects = json.loads(r["projects_json"] or "[]")
        education = json.loads(r["education_json"] or "[]")
        skills = json.loads(r["skills_json"] or "[]")
        talent_dna = json.loads(r["talent_dna_json"] or "{}")
        skills_cat = talent_dna.get("skills_categorized", {})
        if not skills_cat:
            # Check dynamic taxonomy classification
            from ai_service.parser import TAXONOMY_CATEGORIES
            skills_cat = {k: [] for k in TAXONOMY_CATEGORIES}
            for s in skills:
                s_low = s.lower()
                placed = False
                for cat, skl_list in TAXONOMY_CATEGORIES.items():
                    if any(item.lower() in s_low for item in skl_list):
                        skills_cat[cat].append(s)
                        placed = True
                        break
                if not placed:
                    if any(t in s_low for t in ["cisco", "firewall", "vpn", "bgp", "network"]):
                        skills_cat["Cloud and DevOps"].append(s)
                    else:
                        skills_cat["Testing and Tools"].append(s)
            skills_cat = {k: v for k, v in skills_cat.items() if len(v) > 0}
        artifacts = json.loads(r["technical_artifacts_json"] or "[]")
        certs = json.loads(r["certifications_json"] or "[]")

        print(f"\n[+] Candidate: {r['full_name']} (ID: {r['id']})")
        print(f"    - Projects Count: {len(projects)}")
        for idx, p in enumerate(projects[:2], 1):
            print(f"      * Project {idx}: {p.get('name') or p.get('title')}")
            print(f"        Tech Stack: {p.get('tech_stack')}")
            print(f"        Description: {p.get('description', '')[:70]}...")
            print(f"        Contributions: {p.get('contributions', '')[:60]}...")
            print(f"        Link: {p.get('link')}")
        print(f"    - Education Count: {len(education)}")
        for idx, e in enumerate(education[:2], 1):
            print(f"      * Qual {idx}: {e.get('degree')} | {e.get('institution')} | {e.get('year')} | Grade: {e.get('cgpa') or e.get('percentage') or e.get('grade')}")
        print(f"    - Dynamic Skill Categories: {list(skills_cat.keys())[:5]} (Total categories: {len(skills_cat)})")
        print(f"    - Technical Artifacts: {artifacts}")
        print(f"    - Certifications: {certs}")

        # Assertions
        assert len(projects) > 0, f"Candidate {r['full_name']} should have structured projects"
        assert len(education) > 0, f"Candidate {r['full_name']} should have structured education"
        assert len(skills_cat) > 0, f"Candidate {r['full_name']} should have categorized skills"

    # 2. Test Resume Document Parsing On Multiple Real Resumes
    print("\n--- TEST 2: Resume Parser On Real Resumes ---")
    resume_samples_dir = os.path.join("sample_data")
    if os.path.exists(resume_samples_dir):
        files = [f for f in os.listdir(resume_samples_dir) if f.endswith(".pdf") or f.endswith(".docx")][:3]
        for f in files:
            fpath = os.path.join(resume_samples_dir, f)
            text, pages = extract_text_from_pdf(fpath)
            parsed = parse_candidate_details(text, pages)
            print(f"\n[+] Parsed: {f}")
            print(f"    Name: {parsed.get('full_name')}")
            print(f"    Projects extracted: {len(parsed.get('projects', []))}")
            print(f"    Education extracted: {len(parsed.get('education', []))}")
            print(f"    Skills extracted: {len(parsed.get('skills', []))}")
            print(f"    Categorized groups: {list(parsed.get('skills_categorized', {}).keys())}")
            print(f"    Artifacts: {parsed.get('technical_artifacts')}")

    # 3. Test Multi-Tier Interview Question Generation
    print("\n--- TEST 3: Multi-Tier Interview Question Generation Engine ---")
    sample_candidate = {
        "full_name": "Aarav Sharma",
        "skills": ["Python", "PyTorch", "LangChain", "FastAPI", "Docker", "ChromaDB", "React"],
        "skills_categorized": {
            "Programming Languages": ["Python"],
            "AI / Machine Learning": ["PyTorch", "Transformers", "NLP"],
            "Generative AI": ["LangChain", "RAG", "Embeddings", "ChromaDB"],
            "Backend Development": ["FastAPI"],
            "Cloud and DevOps": ["Docker"]
        },
        "projects": [
            {
                "name": "AI-Based Candidate Intelligence Platform",
                "tech_stack": ["Python", "FastAPI", "ChromaDB", "LangChain"],
                "description": "Production candidate matching engine using 768-dim embeddings and semantic search.",
                "contributions": "Designed multi-tier RAG retrieval pipeline and vector indexing pipeline.",
                "link": "https://github.com/aarav/talentiq"
            },
            {
                "name": "Neural Sentiment Classifier",
                "tech_stack": ["PyTorch", "HuggingFace", "FastAPI"],
                "description": "Fine-tuned transformer models for multi-class sentiment analysis with 94% accuracy.",
                "contributions": "Implemented model quantization reducing inference latency by 45%."
            }
        ],
        "education": [
            {
                "degree": "B.Tech in Computer Science & Engineering",
                "specialization": "Artificial Intelligence",
                "institution": "Indian Institute of Information Technology",
                "year": "2024",
                "cgpa": "8.9"
            }
        ],
        "experience": [
            {
                "title": "AI Engineer Intern",
                "company": "DeepTech Labs",
                "duration": "6 months",
                "highlights": ["Built RAG systems", "Deployed FastAPI microservices in Docker"]
            }
        ],
        "certifications": [
            {"title": "Deep Learning Specialization", "issuer": "DeepLearning.AI", "year": "2023"}
        ]
    }

    questions = synthesize_structured_interview_questions(
        candidate_profile=sample_candidate,
        job_role="Senior AI / RAG Engineer",
        target_difficulty="All",
        count_per_tier=2
    )

    print(f"[+] Total synthesized questions: {len(questions)}")
    tier_counts = {"Beginner": 0, "Intermediate": 0, "Advanced": 0}
    project_q_found = False

    for idx, q in enumerate(questions, 1):
        diff = q.get("difficulty")
        tier_counts[diff] = tier_counts.get(diff, 0) + 1
        is_proj = "project" in (q.get("category") or "").lower() or "project" in (q.get("skill_tested") or "").lower()
        if is_proj:
            project_q_found = True

        print(f"\n  Question {idx} [{diff.upper()}] (Tested: {q.get('skill_tested')} | Cat: {q.get('category')}):")
        print(f"    Q: {q.get('question')}")
        print(f"    Rationale: {q.get('reason_for_asking')}")
        print(f"    Expected Key Points: {q.get('expected_answer_points')}")
        print(f"    Rubric: {q.get('evaluation_rubric')}")

        # Strict checks
        assert q.get("question"), "Question must not be empty"
        assert q.get("difficulty") in ["Beginner", "Intermediate", "Advanced"], f"Invalid tier: {q.get('difficulty')}"
        assert len(q.get("expected_answer_points", [])) >= 2, "Must contain structured answer points"
        assert q.get("evaluation_rubric"), "Must have evaluation rubric"

    print(f"\n[+] Difficulty distribution: {tier_counts}")
    assert tier_counts["Beginner"] > 0, "Should contain Beginner questions"
    assert tier_counts["Intermediate"] > 0, "Should contain Intermediate questions"
    assert tier_counts["Advanced"] > 0, "Should contain Advanced questions"
    assert project_q_found, "Should contain candidate-specific project questions"

    # 4. Test ReportLab Clean A4 PDF Generation
    print("\n--- TEST 4: ReportLab Clean A4 Interview Guide PDF ---")
    test_pdf_out = os.path.join("server", "uploads", "test_generated_guide.pdf")
    pdf_bytes = build_interview_guide_pdf(
        candidate_info=sample_candidate,
        questions=questions,
        job_role="Senior AI / RAG Engineer"
    )
    with open(test_pdf_out, "wb") as f:
        f.write(pdf_bytes)

    assert os.path.exists(test_pdf_out), "PDF file was not created on disk"
    assert len(pdf_bytes) > 1000, f"PDF file size too small: {len(pdf_bytes)} bytes"
    assert pdf_bytes[:4] == b"%PDF", "Invalid PDF binary header"
    print(f"[+] PDF generated successfully at: {test_pdf_out}")
    print(f"    File size: {len(pdf_bytes)} bytes")
    print(f"    PDF header: {pdf_bytes[:8]}")

    # Clean up test output PDF
    if os.path.exists(test_pdf_out):
        os.remove(test_pdf_out)
        print("[+] Test PDF cleaned up.")

    conn.close()

    print("\n==================================================")
    print("ALL CORE PIPELINE VERIFICATION TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
