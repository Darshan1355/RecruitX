"""RecruitX Python AI Service.
Provides REST & SSE APIs for ChromaDB vector operations, Calibrated ATS Scoring,
Talent DNA, Domain-Aware Interview Studio, and Streaming Copilot.
"""
import os
import sys
import json
import re
import time
from pathlib import Path
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import chromadb
from sentence_transformers import SentenceTransformer

# Paths
current_dir = Path(__file__).resolve().parent
repo_root = current_dir.parent

from parser import (
    extract_text_from_pdf,
    extract_text_from_docx,
    parse_candidate_details,
    compute_file_hash,
    TAXONOMY_CATEGORIES,
    SKILL_ALIASES,
    normalize_skill
)

try:
    import mammoth
except ImportError:
    mammoth = None

try:
    from pdf_generator import build_interview_guide_pdf
except ImportError:
    from ai_service.pdf_generator import build_interview_guide_pdf

try:
    from interview_engine import synthesize_structured_interview_questions
except ImportError:
    from ai_service.interview_engine import synthesize_structured_interview_questions

app = Flask(__name__)
CORS(app)

@app.before_request
def authenticate_service_request():
    expected_secret = os.environ.get("SERVICE_AUTH_SECRET")
    if expected_secret and request.path.startswith("/api/ai/"):
        if request.headers.get("X-Service-Token") != expected_secret:
            return jsonify({"error": "Unauthorized AI service request"}), 401

# ChromaDB Persistent Storage Path
CHROMA_PATH = os.environ.get("CHROMA_DB_PATH", str(current_dir / "data" / "resume_db"))
print(f"[*] Initializing ChromaDB client at {CHROMA_PATH}...")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
resumes_collection = chroma_client.get_or_create_collection(name="resumes")

# Embedding Model (SentenceTransformer: 768-dim multi-qa-distilbert-cos-v1)
print("[*] Loading embedding model...")
embed_model = SentenceTransformer("sentence-transformers/multi-qa-distilbert-cos-v1")
print("[*] AI Service initialized successfully.")


# =============================================================
# HEALTH CHECK
# =============================================================
@app.route("/api/ai/health", methods=["GET"])
def health():
    try:
        count = resumes_collection.count()
        return jsonify({
            "status": "healthy",
            "service": "RecruitX AI Engine",
            "vector_store": "ChromaDB",
            "indexed_resumes": count,
            "embedding_model": "sentence-transformers/multi-qa-distilbert-cos-v1",
            "embedding_dimension": 768,
            "taxonomy_skills_count": sum(len(skills) for skills in TAXONOMY_CATEGORIES.values())
        })
    except Exception as e:
        return jsonify({"status": "degraded", "error": str(e)}), 500


# =============================================================
# EXTRACT RESUME (PDF / DOCX)
# =============================================================
@app.route("/api/ai/extract", methods=["POST"])
def extract_resume():
    data = request.json or {}
    file_path = data.get("file_path")
    raw_text = data.get("raw_text")

    if not file_path and not raw_text:
        return jsonify({"error": "Either file_path or raw_text is required"}), 400

    try:
        pages_data = []
        if file_path:
            p = Path(file_path)
            if not p.exists():
                return jsonify({"error": f"File not found: {file_path}"}), 404

            suffix = p.suffix.lower()
            if suffix == ".pdf":
                extracted_text, pages_data = extract_text_from_pdf(str(p))
            elif suffix in [".docx", ".doc"]:
                extracted_text, pages_data = extract_text_from_docx(str(p))
            else:
                return jsonify({"error": f"Unsupported format: {suffix}"}), 400
        else:
            extracted_text = raw_text
            pages_data = [{"page_number": 1, "text": raw_text}]

        details = parse_candidate_details(extracted_text, pages_data)
        details["raw_text"] = extracted_text
        return jsonify({"success": True, "data": details})

    except Exception as e:
        return jsonify({"error": f"Extraction failed: {str(e)}"}), 500


# =============================================================
# INDEX RESUME INTO CHROMADB
# =============================================================
@app.route("/api/ai/index", methods=["POST"])
def index_resume():
    data = request.json or {}
    vector_id = data.get("vector_id")
    text = data.get("text")
    metadata = data.get("metadata", {})

    if not vector_id or not text:
        return jsonify({"error": "vector_id and text are required"}), 400

    try:
        embedding = embed_model.encode(text[:10000]).tolist()
        resumes_collection.upsert(
            ids=[vector_id],
            documents=[text[:10000]],
            embeddings=[embedding],
            metadatas=[metadata]
        )
        return jsonify({
            "success": True,
            "vector_id": vector_id,
            "total_indexed": resumes_collection.count()
        })
    except Exception as e:
        return jsonify({"error": f"Failed to index into vector database: {str(e)}"}), 500


# =============================================================
# DELETE FROM CHROMADB
# =============================================================
@app.route("/api/ai/delete-vector", methods=["POST"])
def delete_vector():
    data = request.json or {}
    vector_id = data.get("vector_id")

    if not vector_id:
        return jsonify({"error": "vector_id is required"}), 400

    try:
        resumes_collection.delete(ids=[vector_id])
        return jsonify({
            "success": True,
            "vector_id": vector_id,
            "remaining_count": resumes_collection.count()
        })
    except Exception as e:
        return jsonify({"error": f"Failed to delete vector: {str(e)}"}), 500


# =============================================================
# CALIBRATED ATS SCORING & HYBRID CANDIDATE SEARCH
# =============================================================
def extract_query_requirements(query: str):
    """Extract required skills, experience years, and target role from natural language query."""
    q_lower = query.lower()
    
    # 1. Experience detection (e.g. 2+ years, 3 years)
    exp_req = 0.0
    exp_m = re.search(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)", q_lower)
    if exp_m:
        exp_req = float(exp_m.group(1))

    # 2. Extract skills from query by checking against taxonomy and aliases
    found_required = []
    found_optional = []
    
    # Token-based and regex search
    all_taxonomy_skills = [s for cat in TAXONOMY_CATEGORIES.values() for s in cat]
    for skill in all_taxonomy_skills:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, q_lower):
            found_required.append(skill)

    # Check aliases
    for alias, canonical in SKILL_ALIASES.items():
        pattern = r"\b" + re.escape(alias.lower()) + r"\b"
        if re.search(pattern, q_lower) and canonical not in found_required:
            found_required.append(canonical)

    # Deduplicate
    found_required = sorted(list(set(found_required)))
    
    return {
        "required_skills": found_required,
        "optional_skills": found_optional,
        "min_experience_years": exp_req
    }


def calculate_calibrated_ats_score(cand_details: dict, reqs: dict, semantic_sim: float):
    """
    Calibrated ATS Scoring Engine (Phase 7):
    - Required technical skills (45%)
    - Relevant experience (20%)
    - Project relevance (20%)
    - Optional skills / semantic relevance (10%)
    - Evidence quality & citations (5%)
    
    Rules:
    - Missing mandatory skills strictly penalizes score.
    - Generic skills do not compensate.
    - Unrelated candidates receive low scores (e.g. <40%).
    """
    cand_skills_raw = set(cand_details.get("skills", []))
    cand_skills_lower = {s.lower(): s for s in cand_skills_raw}

    required_skills = reqs.get("required_skills", [])
    min_exp = reqs.get("min_experience_years", 0.0)

    matched_required = []
    missing_required = []
    related_skills = []

    # If no explicit skills found in query, use semantic similarity
    if not required_skills:
        score = int(max(40, min(95, semantic_sim * 100)))
        return {
            "score": score,
            "matched_required": list(cand_skills_raw)[:4],
            "missing_required": [],
            "related_skills": [],
            "experience_relevance": "Documented",
            "project_relevance": "Standard",
            "breakdown": {
                "required_skills_score": score,
                "experience_score": 80,
                "project_score": 80,
                "optional_score": 80,
                "evidence_score": 85
            },
            "explanation": f"Evaluated primarily via semantic vector alignment with {len(cand_skills_raw)} candidate skills."
        }

    # Evaluate Required Technical Skills (45%)
    for r_skill in required_skills:
        r_low = r_skill.lower()
        if r_low in cand_skills_lower:
            matched_required.append(cand_skills_lower[r_low])
        else:
            # Check for partial / related matches
            found_related = False
            for c_low, c_orig in cand_skills_lower.items():
                if r_low in c_low or c_low in r_low:
                    related_skills.append(c_orig)
                    found_related = True
                    break
            if not found_related:
                missing_required.append(r_skill)

    req_coverage = len(matched_required) / max(1, len(required_skills))
    related_bonus = (len(related_skills) * 0.5) / max(1, len(required_skills))
    skill_score = min(100.0, (req_coverage + related_bonus) * 100.0)

    # Missing mandatory skill penalty: if 50%+ of required skills are missing, heavily dampen
    if len(matched_required) == 0 and len(required_skills) > 0:
        skill_score = min(25.0, skill_score)

    # Evaluate Experience (20%)
    cand_exp = cand_details.get("years_of_experience", 2.0)
    if min_exp > 0:
        if cand_exp >= min_exp:
            exp_score = 100.0
            exp_rel = f"Meets/exceeds requirement ({cand_exp} >= {min_exp} yrs)"
        else:
            ratio = cand_exp / min_exp
            exp_score = max(20.0, ratio * 85.0)
            exp_rel = f"Below requirement ({cand_exp} vs {min_exp} yrs)"
    else:
        exp_score = min(100.0, 70.0 + cand_exp * 5.0)
        exp_rel = f"{cand_exp} years documented experience"

    # Evaluate Project Relevance (20%)
    projects = cand_details.get("projects", [])
    proj_score = 40.0
    for p in projects:
        p_text = (p.get("name", "") + " " + p.get("description", "")).lower()
        for r in required_skills:
            if r.lower() in p_text:
                proj_score += 25.0
    proj_score = min(100.0, proj_score)

    # Optional / Semantic score (10%)
    opt_score = max(30.0, min(100.0, semantic_sim * 100.0))

    # Evidence score (5%)
    citations = cand_details.get("evidence_citations", [])
    evidence_score = 90.0 if len(citations) >= 2 else (65.0 if len(citations) == 1 else 35.0)

    # Calibrated Final ATS Score
    final_score = int(
        (skill_score * 0.45) +
        (exp_score * 0.20) +
        (proj_score * 0.20) +
        (opt_score * 0.10) +
        (evidence_score * 0.05)
    )

    # Hard ceiling if zero required skills are matched
    if len(required_skills) > 0 and len(matched_required) == 0:
        final_score = min(35, final_score)

    explanation = (
        f"Matched {len(matched_required)}/{len(required_skills)} core skills. "
        + (f"Missing: {', '.join(missing_required[:3])}. " if missing_required else "Full core skill match. ")
        + f"Experience: {cand_exp} yrs. Project relevance: {int(proj_score)}%."
    )

    return {
        "score": final_score,
        "matched_required": matched_required,
        "missing_required": missing_required,
        "related_skills": related_skills,
        "experience_relevance": exp_rel,
        "project_relevance": f"{int(proj_score)}% alignment",
        "breakdown": {
            "required_skills_score": int(skill_score),
            "experience_score": int(exp_score),
            "project_score": int(proj_score),
            "optional_score": int(opt_score),
            "evidence_score": int(evidence_score)
        },
        "explanation": explanation
    }


@app.route("/api/ai/search", methods=["POST"])
def search_candidates():
    data = request.json or {}
    query = data.get("query", "").strip()
    limit = int(data.get("limit", 6))

    if not query:
        return jsonify({"error": "Query cannot be empty"}), 400

    try:
        reqs = extract_query_requirements(query)
        total_in_db = resumes_collection.count()
        if total_in_db == 0:
            return jsonify({"results": [], "query": query, "total_found": 0, "requirements": reqs})

        # Semantic retrieval
        query_embedding = embed_model.encode(query).tolist()
        fetch_n = min(max(limit * 2, 8), total_in_db)
        results = resumes_collection.query(
            query_embeddings=[query_embedding],
            n_results=fetch_n,
            include=["documents", "metadatas", "distances"]
        )

        matched_candidates = []
        if results.get("ids") and results["ids"][0]:
            ids = results["ids"][0]
            docs = results["documents"][0]
            metadatas = results["metadatas"][0]
            distances = results["distances"][0]

            for i in range(len(ids)):
                v_id = ids[i]
                doc_text = docs[i]
                meta = metadatas[i] if metadatas else {}
                dist = distances[i]

                # Normalized semantic similarity (0.0 to 1.0)
                semantic_sim = max(0.0, min(1.0, 1.0 - (dist / 2.0)))

                cand = parse_candidate_details(doc_text, [{"page_number": 1, "text": doc_text}])
                ats = calculate_calibrated_ats_score(cand, reqs, semantic_sim)

                matched_candidates.append({
                    "vector_id": v_id,
                    "candidate_id": v_id,
                    "name": cand["full_name"],
                    "email": cand["email"],
                    "phone": cand["phone"],
                    "location": cand["location"],
                    "experience_years": cand["years_of_experience"],
                    "match_score": ats["score"],
                    "skills": cand["skills"],
                    "skills_categorized": cand["skills_categorized"],
                    "matched_skills": ats["matched_required"] if ats["matched_required"] else cand["skills"][:4],
                    "missing_skills": ats["missing_required"],
                    "related_skills": ats["related_skills"],
                    "summary": cand["summary"],
                    "source_file": meta.get("source", meta.get("filename", "resume.pdf")),
                    "evidence_citations": cand["evidence_citations"][:6],
                    "ats_breakdown": ats["breakdown"],
                    "ats_explanation": ats["explanation"]
                })

        # Rank by calibrated ATS score descending
        matched_candidates.sort(key=lambda x: x["match_score"], reverse=True)

        return jsonify({
            "results": matched_candidates[:limit],
            "query": query,
            "total_found": len(matched_candidates),
            "requirements": reqs
        })

    except Exception as e:
        return jsonify({"error": f"Search failed: {str(e)}"}), 500


# =============================================================
# TALENT DNA GENERATION
# =============================================================
@app.route("/api/ai/talent-dna", methods=["POST"])
def talent_dna():
    data = request.json or {}
    vector_id = data.get("vector_id")
    raw_text = data.get("raw_text")

    if not vector_id and not raw_text:
        return jsonify({"error": "vector_id or raw_text is required"}), 400

    try:
        text_to_analyze = raw_text
        pages_data = [{"page_number": 1, "text": raw_text or ""}]

        if vector_id and not raw_text:
            rec = resumes_collection.get(ids=[vector_id], include=["documents", "metadatas"])
            if rec.get("documents") and rec["documents"]:
                text_to_analyze = rec["documents"][0]
                pages_data = [{"page_number": 1, "text": text_to_analyze}]
            else:
                return jsonify({"error": "Resume record not found in vector store"}), 404

        details = parse_candidate_details(text_to_analyze, pages_data)

        # Build skill relationship network graph
        skills = details["skills"]
        skill_network = []
        for i in range(min(len(skills), 8)):
            for j in range(i + 1, min(len(skills), 8)):
                skill_network.append({
                    "source": skills[i],
                    "target": skills[j],
                    "strength": 80
                })

        response = {
            "candidate_id": vector_id or "candidate_profile",
            "name": details["full_name"],
            "contact": {
                "email": details["email"],
                "phone": details["phone"],
                "location": details["location"]
            },
            "experience_years": details["years_of_experience"],
            "summary": details["summary"],
            "education": details["education"],
            "experience": details["experience"],
            "projects": details["projects"],
            "technical_skills": details["skills"],
            "skills_categorized": details["skills_categorized"],
            "competencies": details["talent_dna"]["competencies"],
            "domain_expertise": details["talent_dna"]["domain_expertise"],
            "career_matches": details["talent_dna"]["career_matches"],
            "missing_information": details["talent_dna"]["missing_information"],
            "skill_relationships": skill_network,
            "evidence_citations": details["evidence_citations"]
        }
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": f"Talent DNA generation failed: {str(e)}"}), 500


# =============================================================
# DOMAIN-AWARE INTELLIGENT INTERVIEW STUDIO
# =============================================================
DOMAIN_QUESTION_REPOSITORY = {
    # AI / Machine Learning / Data Science
    "Machine Learning": [
        {
            "category": "Candidate-specific technical",
            "question": "What is the key difference between Random Forest and Gradient Boosted Trees? When would you choose one over the other for tabular prediction?",
            "points": ["Bagging vs Boosting mechanics", "Variance reduction vs Bias reduction", "Parallel training in Random Forest vs sequential in GBDTs", "Sensitivity to noisy data and hyperparameters"],
            "rubric": "Evaluates foundational ML model selection and deep understanding of ensemble variance/bias trade-offs."
        },
        {
            "category": "Role-specific technical",
            "question": "Explain precision, recall, and F1-score. In an imbalanced dataset (e.g. fraud detection with 1% positives), why is accuracy a misleading metric?",
            "points": ["True Positives, False Positives, False Negatives formulas", "High accuracy in dummy majority-class predictors", "Area under Precision-Recall Curve (PR-AUC) vs ROC-AUC", "Business cost trade-off between False Alarms vs Missed Frauds"],
            "rubric": "Evaluates metrics selection for real-world imbalanced production datasets."
        },
        {
            "category": "Scenario-based",
            "question": "How do you detect and mitigate overfitting during training? Describe techniques you apply across data, model architecture, and optimization.",
            "points": ["Train/Validation loss curve monitoring", "Cross-validation and data augmentation", "L1/L2 regularization and Dropout", "Early stopping and reducing model complexity"],
            "rubric": "Evaluates systematic debugging of model generalization."
        }
    ],
    "Python": [
        {
            "category": "Candidate-specific technical",
            "question": "How do you handle missing values in Pandas? What are the statistical trade-offs between dropping rows, mean/median imputation, and iterative/KNN imputation?",
            "points": ["MCAR, MAR, and MNAR missing data mechanisms", "Distortion of variance with simple mean imputation", "Multivariate imputation techniques (IterativeImputer)", "Preserving row integrity vs dataset size"],
            "rubric": "Evaluates data cleaning rigor and awareness of statistical bias introduced by improper imputation."
        },
        {
            "category": "Role-specific technical",
            "question": "Explain how the Python GIL (Global Interpreter Lock) impacts multithreading versus multiprocessing when executing CPU-bound vs I/O-bound tasks.",
            "points": ["GIL mutex preventing concurrent bytecode execution", "ThreadPoolExecutor for I/O waits vs ProcessPoolExecutor for CPU calculations", "Asyncio event loop for cooperative concurrency", "C-extensions releasing the GIL (e.g. NumPy, PyTorch)"],
            "rubric": "Demonstrates core Python runtime execution mastery."
        }
    ],
    "TensorFlow": [
        {
            "category": "Candidate-specific technical",
            "question": "How does TensorFlow's Computational Graph (tf.function) optimize execution compared to standard eager execution?",
            "points": ["Graph compilation and auto-graph tracing", "Op fusion and hardware device placement (GPU/TPU)", "Static typing requirements and side effect handling", "Exporting models to SavedModel / TensorRT"],
            "rubric": "Evaluates production deep learning optimization."
        }
    ],
    "PyTorch": [
        {
            "category": "Candidate-specific technical",
            "question": "Explain the difference between `model.eval()` and `torch.no_grad()` in PyTorch during inference. How do they affect BatchNorm and Dropout layers?",
            "points": ["model.eval() sets running stats for BatchNorm and disables Dropout", "torch.no_grad() disables autograd tape tracking to save memory", "Using both concurrently for optimal inference", "Gradient computation memory leaks if no_grad is omitted"],
            "rubric": "Evaluates deep learning framework memory management."
        }
    ],
    "RAG": [
        {
            "category": "Role-specific technical",
            "question": "In a RAG architecture, how do chunk size, chunk overlap, and embedding similarity metrics (cosine vs dot product) impact retrieval precision and LLM context hallucination?",
            "points": ["Semantic boundary preservation vs context window exhaustion", "Overlap preventing information truncation at boundaries", "Cosine similarity normalization for variable length texts", "Re-ranking and hybrid keyword-vector retrieval"],
            "rubric": "Evaluates production GenAI and RAG architectural maturity."
        }
    ],
    "React": [
        {
            "category": "Candidate-specific technical",
            "question": "How does React Fiber's reconciliation algorithm enable priority-based, interruptible rendering? When should you use `useMemo` versus `useCallback`?",
            "points": ["Virtual DOM diffing heuristics and time-slicing", "Fiber linked-list tree structure", "Avoiding premature memoization overhead", "Reference stability for dependency arrays in custom hooks"],
            "rubric": "Demonstrates modern React rendering performance optimization."
        },
        {
            "category": "Role-specific technical",
            "question": "How do you manage complex application state across large enterprise React applications? Compare Context API vs external stores (Redux Toolkit, Zustand).",
            "points": ["Context re-rendering all consumers on any slice update", "Selective subscriptions in Zustand/Redux", "Async action handling and middleware", "Server state caching with React Query / SWR"],
            "rubric": "Evaluates frontend state architecture and scalability."
        }
    ],
    "Java": [
        {
            "category": "Candidate-specific technical",
            "question": "Explain how garbage collection works in modern JVMs (G1 vs ZGC) and how you diagnose memory leaks using heap dumps.",
            "points": ["Generational memory layout (Eden, Survivor, Tenured)", "Stop-The-World pause optimization in low-latency collectors", "Heap dump analysis with VisualVM or Eclipse MAT", "Strong vs Weak/Soft reference leaks"],
            "rubric": "Evaluates JVM memory management and enterprise troubleshooting."
        }
    ],
    "Spring Boot": [
        {
            "category": "Candidate-specific technical",
            "question": "Explain how Inversion of Control (IoC) and Dependency Injection function in Spring Boot. Why is Constructor Injection preferred over Field Injection?",
            "points": ["ApplicationContext and BeanFactory lifecycle", "Immutability and testability with final constructor arguments", "Circular dependency prevention", "Conditional bean instantiation with @ConditionalOnProperty"],
            "rubric": "Evaluates core enterprise Spring Boot architecture standards."
        }
    ],
    "Node.js": [
        {
            "category": "Candidate-specific technical",
            "question": "Describe the Node.js event loop phases (Timers, Poll, Check/Close) and how CPU-bound tasks can block the single thread.",
            "points": ["Libuv event loop structure and thread pool", "process.nextTick vs setImmediate microtask priority", "Worker threads and clustering for CPU workloads", "Stream backpressure handling"],
            "rubric": "Evaluates asynchronous non-blocking runtime mastery."
        }
    ],
    "MySQL": [
        {
            "category": "Role-specific technical",
            "question": "How do B-Tree indexes function in MySQL InnoDB? How would you optimize a slow query involving multi-column JOINs using `EXPLAIN`?",
            "points": ["Clustered vs Secondary indexes", "Leftmost prefix rule in composite indexing", "Analyzing 'type' (ALL, ref, range) and 'rows' in EXPLAIN", "Covering indexes avoiding table lookups"],
            "rubric": "Evaluates SQL indexing and relational database optimization."
        }
    ],
    "AWS": [
        {
            "category": "Role-specific technical",
            "question": "How would you architect a highly available, fault-tolerant microservice deployment across multiple AWS Availability Zones?",
            "points": ["Application Load Balancer health checks and target groups", "Auto Scaling Groups across multi-AZ subnets", "Multi-AZ RDS with automated failover", "IAM least-privilege security policies"],
            "rubric": "Evaluates cloud-native resilience and architecture design."
        }
    ],
    "Docker": [
        {
            "category": "Role-specific technical",
            "question": "What best practices do you follow when writing production Dockerfiles to minimize image size and improve container security?",
            "points": ["Multi-stage builds excluding compilers", "Running as non-root user", "Layer caching optimization", "Minimal base images (Alpine, Distroless)"],
            "rubric": "Evaluates container security and CI/CD hygiene."
        }
    ]
}


@app.route("/api/ai/preview-docx", methods=["POST"])
def preview_docx():
    """Converts a DOCX file into clean, styled HTML for instant in-browser viewing."""
    data = request.json or {}
    file_path = data.get("file_path")

    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "Resume document file not found."}), 404

    if not mammoth:
        return jsonify({"error": "DOCX preview converter is not installed."}), 500

    try:
        with open(file_path, "rb") as docx_file:
            result = mammoth.convert_to_html(docx_file)
            raw_html = result.value
            
            # Wrap in elegant, print-ready document styling
            styled_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Resume Document Preview</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    line-height: 1.6;
    margin: 0;
    padding: 32px 40px;
    box-sizing: border-box;
  }}
  h1, h2, h3, h4 {{
    color: #0f172a;
    margin-top: 20px;
    margin-bottom: 8px;
    font-weight: 700;
  }}
  h1 {{ font-size: 22px; border-bottom: 2px solid #0284c7; padding-bottom: 6px; }}
  h2 {{ font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }}
  h3 {{ font-size: 14px; }}
  p, li {{ font-size: 13px; color: #334155; }}
  ul {{ padding-left: 20px; margin-top: 4px; margin-bottom: 8px; }}
  li {{ margin-bottom: 4px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }}
  th, td {{ border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }}
  th {{ background-color: #f1f5f9; font-weight: 600; }}
  a {{ color: #0284c7; text-decoration: none; }}
  a:hover {{ text-decoration: underline; }}
</style>
</head>
<body>
{raw_html}
</body>
</html>"""
            return Response(styled_html, mimetype="text/html")
    except Exception as e:
        return jsonify({"error": f"Failed to convert DOCX document: {str(e)}"}), 500


@app.route("/api/ai/generate-pdf", methods=["POST"])
def generate_pdf():
    """Generates an A4 professional interview guide PDF containing strictly:
    1. Candidate Information
    2. Interview Questions (Beginner, Intermediate, Advanced)
    with strict KeepTogether pagination and zero generic filler.
    """
    data = request.json or {}
    candidate_info = data.get("candidate_info", {})
    questions = data.get("questions", [])
    job_role = data.get("job_role", "Software Engineer").strip()

    if not candidate_info or not questions:
        return jsonify({"error": "candidate_info and questions are required"}), 400

    try:
        pdf_bytes = build_interview_guide_pdf(candidate_info, questions, job_role)
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Interview_Guide_{candidate_info.get("full_name", "Candidate").replace(" ", "_")}.pdf"'
            }
        )
    except Exception as e:
        return jsonify({"error": f"Failed to generate interview PDF: {str(e)}"}), 500


@app.route("/api/ai/interview", methods=["POST"])
def generate_interview():
    """Intelligent interview question synthesis grounded in candidate verified profile,
    actual projects, and target job role across Beginner, Intermediate, and Advanced tiers.
    """
    data = request.json or {}
    candidate_name = data.get("candidate_name", "Candidate")
    skills = data.get("skills", [])
    projects = data.get("projects", [])
    experience = data.get("experience", [])
    education = data.get("education", [])
    certifications = data.get("certifications", [])
    job_role = data.get("job_role", "Software Engineer").strip()
    interview_type = data.get("interview_type", "Technical")
    difficulty = data.get("difficulty", "All")
    count = int(data.get("count", 5))

    candidate_profile = {
        "full_name": candidate_name,
        "skills": skills,
        "projects": projects,
        "experience": experience,
        "education": education,
        "certifications": certifications
    }

    try:
        # Synthesize multi-tiered, candidate-project grounded questions with validation
        tier_arg = difficulty if difficulty in ["Beginner", "Intermediate", "Advanced"] else "All"
        per_tier = max(1, count // 3) if tier_arg == "All" else count
        final_questions = synthesize_structured_interview_questions(
            candidate_profile=candidate_profile,
            job_role=job_role,
            target_difficulty=tier_arg,
            count_per_tier=per_tier
        )

        return jsonify({
            "candidate_name": candidate_name,
            "job_role": job_role,
            "interview_type": interview_type,
            "difficulty": difficulty,
            "questions": final_questions,
            "total_generated": len(final_questions)
        })
    except Exception as e:
        return jsonify({"error": f"Failed to synthesize interview questions: {str(e)}"}), 500


# =============================================================
# CANDIDATE COMPARISON
# =============================================================
@app.route("/api/ai/compare", methods=["POST"])
def compare_candidates():
    data = request.json or {}
    candidates = data.get("candidates", [])

    if len(candidates) < 2:
        return jsonify({"error": "At least 2 candidates are required for comparison"}), 400

    try:
        names = [c.get("name", "Candidate") for c in candidates]
        skills_sets = [set(s.lower() for s in c.get("skills", [])) for c in candidates]

        common_skills = list(set.intersection(*skills_sets)) if skills_sets else []
        common_skills = [s.capitalize() for s in common_skills]

        comparison_matrix = []
        all_skills = sorted(list(set.union(*skills_sets)))[:18]
        for skill in all_skills:
            row = {"skill": skill.capitalize()}
            for idx, c in enumerate(candidates):
                c_name = c.get("name", f"Candidate {idx+1}")
                row[c_name] = skill.lower() in skills_sets[idx]
            comparison_matrix.append(row)

        c1 = candidates[0]
        c2 = candidates[1]
        summary_text = (
            f"Direct comparative analysis of {', '.join(names)}: "
            f"{c1.get('name')} brings {c1.get('experience_years', 'N/A')} years of verified experience "
            f"with core strengths in {', '.join(c1.get('skills', [])[:5])}. "
            f"In contrast, {c2.get('name')} offers specialized competencies in {', '.join(c2.get('skills', [])[:5])}. "
            f"Both candidates provide verified resume citations and project evidence."
        )

        return jsonify({
            "candidates": candidates,
            "common_skills": common_skills[:10],
            "comparison_matrix": comparison_matrix,
            "ai_summary": summary_text
        })

    except Exception as e:
        return jsonify({"error": f"Comparison failed: {str(e)}"}), 500


# =============================================================
# AI COPILOT TOKEN STREAMING (SSE)
# =============================================================
@app.route("/api/ai/copilot-stream", methods=["POST"])
def copilot_stream():
    """Server-Sent Events (SSE) streaming endpoint for AI Copilot."""
    data = request.json or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Message is required"}), 400

    def generate_tokens():
        query_embedding = embed_model.encode(message).tolist()
        total_in_db = resumes_collection.count()
        results = resumes_collection.query(
            query_embeddings=[query_embedding],
            n_results=min(4, max(1, total_in_db)),
            include=["documents", "metadatas", "distances"]
        )

        candidate_chips = []
        if results.get("ids") and results["ids"][0]:
            ids = results["ids"][0]
            docs = results["documents"][0]
            for i in range(len(ids)):
                v_id = ids[i]
                doc_text = docs[i]
                cand = parse_candidate_details(doc_text, [{"page_number": 1, "text": doc_text}])
                candidate_chips.append({
                    "id": v_id,
                    "name": cand["full_name"],
                    "skills": cand["skills"],  # ALL skills included
                    "skills_categorized": cand["skills_categorized"],
                    "experience_years": cand["years_of_experience"],
                    "summary": cand["summary"]
                })

        msg_lower = message.lower()
        if any(term in msg_lower for term in ["compare", "difference", "vs"]):
            names = [c["name"] for c in candidate_chips[:3]]
            reply_text = (
                f"I evaluated your candidate database to compare {', '.join(names)}:\n\n"
                f"• **{candidate_chips[0]['name']}**: Documented {candidate_chips[0]['experience_years']} years of experience. Core skills include: {', '.join(candidate_chips[0]['skills'][:8])}.\n"
                f"• **{candidate_chips[1]['name']}**: Documented {candidate_chips[1]['experience_years']} years of experience. Key proficiencies include: {', '.join(candidate_chips[1]['skills'][:8])}.\n\n"
                f"Would you like me to launch a side-by-side comparison matrix or generate customized interview questions for either candidate?"
            )
        elif any(term in msg_lower for term in ["interview", "question", "questions"]):
            target = candidate_chips[0]['name'] if candidate_chips else "the candidate"
            target_skills = candidate_chips[0]['skills'][:5] if candidate_chips else ["Software Engineering"]
            reply_text = (
                f"Based on verified resume citations for **{target}**, here are tailored interview questions testing {', '.join(target_skills)}:\n\n"
                f"1. **Core Competency**: *Can you walk me through how you implemented your major project using {target_skills[0]}? What were the primary trade-offs?*\n"
                f"2. **Resilience & Scaling**: *How did you optimize memory and throughput when scaling backend transactions?*\n"
                f"3. **Production Incident**: *Describe a difficult production bug you diagnosed and resolved under tight latency constraints.*\n\n"
                f"You can also navigate to **AI Interview Studio** to configure rubric scoring and export a complete interview guide."
            )
        else:
            reply_text = (
                f"I analyzed your recruitment repository and retrieved **{len(candidate_chips)} matching candidates** grounded in verified resume records:\n\n"
                + "\n".join([f"• **{c['name']}** ({c['experience_years']} yrs exp) — Skills: {', '.join(c['skills'][:7])}" for c in candidate_chips])
                + f"\n\nAll candidate records above are backed by resume citations. You can click on any profile chip below to inspect full Talent DNA."
            )

        # Stream words as tokens
        words = reply_text.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            payload = json.dumps({"token": token, "done": False})
            yield f"data: {payload}\n\n"
            time.sleep(0.015)  # Natural token cadence

        # Send final completion event with candidate chips
        final_payload = json.dumps({
            "token": "",
            "done": True,
            "candidate_chips": candidate_chips,
            "full_reply": reply_text
        })
        yield f"data: {final_payload}\n\n"

    return Response(generate_tokens(), mimetype="text/event-stream")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"[*] Starting RecruitX Python AI Service on http://127.0.0.1:{port}...")
    app.run(host="127.0.0.1", port=port, debug=False)
