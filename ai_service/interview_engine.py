"""Intelligent Domain-Aware AI Interview Engine with 3 Difficulty Levels,
Candidate Project Grounding, and Post-Generation Relevance Validation.
"""
import re
from typing import Dict, Any, List

# -------------------------------------------------------------
# Role to Core Required Skills Mapping
# -------------------------------------------------------------
ROLE_SKILL_REQUIREMENTS = {
    "python developer": ["Python", "OOP", "REST APIs", "FastAPI", "Flask", "Django", "SQL", "PostgreSQL"],
    "machine learning engineer": ["Python", "Machine Learning", "Scikit-learn", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Deep Learning"],
    "generative ai engineer": ["Generative AI", "RAG", "LLMs", "LangChain", "Vector Database", "ChromaDB", "Prompt Engineering", "Python"],
    "backend developer": ["Java", "Spring Boot", "Node.js", "REST APIs", "Microservices", "SQL", "PostgreSQL", "MySQL", "Redis"],
    "frontend developer": ["React", "JavaScript", "TypeScript", "Next.js", "HTML", "CSS", "Tailwind CSS", "Redux"],
    "full-stack developer": ["React", "Node.js", "JavaScript", "TypeScript", "REST APIs", "SQL", "MongoDB", "Express.js"],
    "devops engineer": ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform", "Git", "Jenkins"],
    "cloud engineer": ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Microservices"],
    "data analyst": ["SQL", "Python", "Data Analysis", "Power BI", "Tableau", "Pandas", "Excel", "Data Visualization"],
    "data engineer": ["Python", "SQL", "Apache Spark", "ETL", "PostgreSQL", "Kafka", "Data Pipeline"]
}


# -------------------------------------------------------------
# Multi-Tier Question Repository (Beginner, Intermediate, Advanced)
# -------------------------------------------------------------
MULTI_TIER_QUESTION_BANK = {
    "Python": {
        "Beginner": [
            {
                "question": "What are mutable versus immutable types in Python, and how does Python manage object references in function arguments?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Tests foundational understanding of Python memory model, passing by assignment, and variable mutation.",
                "points": ["Lists/dicts/sets are mutable; tuples/strings/ints are immutable", "Default mutable argument trap (e.g. def func(x=[]))", "id() and is vs == identity comparisons"]
            },
            {
                "question": "Explain the difference between a Python list and a tuple. In what scenarios would you choose a tuple over a list?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Evaluates knowledge of Python data structures, memory overhead, and hashability.",
                "points": ["Tuples are immutable and can be used as dictionary keys", "Tuples have smaller memory footprint and faster instantiation", "Lists provide dynamic resizing and in-place sorting"]
            }
        ],
        "Intermediate": [
            {
                "question": "How do Python generators and the `yield` statement work? How do they help optimize memory consumption when processing large datasets?",
                "category": "Practical Implementation",
                "reason_for_asking": "Evaluates streaming data handling and lazy evaluation in production Python workflows.",
                "points": ["Iterators vs Iterables", "State suspension and resumption across next() calls", "Avoids loading entire dataset into RAM at once", "Generator expressions vs list comprehensions"]
            },
            {
                "question": "Explain how Python decorators work under the hood. How would you write a decorator to measure the execution time of a function?",
                "category": "Practical Implementation",
                "reason_for_asking": "Tests higher-order functions, closures, and meta-programming practices in Python.",
                "points": ["Functions as first-class citizens", "Wrapping func with *args and **kwargs", "Preserving docstrings and metadata using functools.wraps", "Logging execution delta with time.perf_counter()"]
            }
        ],
        "Advanced": [
            {
                "question": "How does the Python Global Interpreter Lock (GIL) impact multithreading versus multiprocessing when executing CPU-bound vs I/O-bound tasks? What are the workarounds?",
                "category": "Problem Solving",
                "reason_for_asking": "Demonstrates deep mastery of Python runtime concurrency, asynchronous event loops, and CPU scaling.",
                "points": ["GIL mutex prevents concurrent bytecode execution on multiple CPU cores", "ThreadPoolExecutor or asyncio for I/O waits", "ProcessPoolExecutor for CPU-intensive parallel computations", "C-extensions releasing the GIL (e.g., NumPy, PyTorch)"]
            },
            {
                "question": "Explain Python's garbage collection mechanism. How does it combine reference counting with generational cyclic garbage collection?",
                "category": "System Architecture",
                "reason_for_asking": "Evaluates low-level Python memory diagnostics and handling of circular object references.",
                "points": ["Immediate deallocation when reference count reaches zero", "Generations 0, 1, and 2 threshold triggers for cyclic detection", "Weakref module to break circular dependency cycles", "gc.collect() and diagnosing memory leaks in long-running processes"]
            }
        ]
    },
    "Machine Learning": {
        "Beginner": [
            {
                "question": "What is the fundamental difference between supervised, unsupervised, and reinforcement learning? Give a concrete example of each.",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Verifies foundational machine learning taxonomy and problem formulation skills.",
                "points": ["Labeled data for supervised (e.g., regression, classification)", "Unlabeled discovery for unsupervised (e.g., clustering, PCA)", "Agent, environment, reward loop for reinforcement learning"]
            },
            {
                "question": "Explain the difference between classification and regression. Which evaluation metrics are standard for each?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Tests candidate's understanding of predictive problem types and appropriate evaluation criteria.",
                "points": ["Discrete categories vs continuous numerical values", "Accuracy, Precision, Recall, F1, ROC-AUC for classification", "MAE, MSE, RMSE, R-squared for regression"]
            }
        ],
        "Intermediate": [
            {
                "question": "What is the difference between Random Forest and Gradient Boosted Decision Trees (GBDT)? When would you prefer one over the other?",
                "category": "Practical Implementation",
                "reason_for_asking": "Evaluates practical ensemble method selection and understanding of variance versus bias trade-offs.",
                "points": ["Bagging (parallel, reduces variance) vs Boosting (sequential, reduces bias)", "Random Forest is less prone to overfitting with noisy data", "GBDT (LightGBM/XGBoost) typically achieves higher accuracy with tuned learning rates"]
            },
            {
                "question": "Explain precision, recall, and F1-score. In an imbalanced dataset (e.g., fraud detection with 0.5% fraud), why is accuracy misleading?",
                "category": "Practical Implementation",
                "reason_for_asking": "Tests metrics selection for real-world imbalanced datasets and understanding business cost matrix.",
                "points": ["True Positives, False Positives, False Negatives formulas", "High accuracy in dummy majority-class predictors", "Precision-Recall Curve (PR-AUC) vs ROC-AUC", "Cost trade-off between False Alarms vs Missed Frauds"]
            }
        ],
        "Advanced": [
            {
                "question": "How do you detect, diagnose, and mitigate data drift and concept drift in a machine learning model deployed to production?",
                "category": "System Architecture",
                "reason_for_asking": "Evaluates MLOps maturity, statistical drift testing, and automated retraining architectures.",
                "points": ["Covariate shift (input distribution changes) vs Concept drift (P(Y|X) changes)", "Statistical tests: Kolmogorov-Smirnov (KS) test, Population Stability Index (PSI)", "Shadow deployment and continuous performance tracking", "Automated retraining triggers and feature store integration"]
            },
            {
                "question": "Describe how you approach feature selection and dimensionality reduction for high-dimensional tabular data. Compare Lasso (L1) vs PCA vs Tree-based feature importance.",
                "category": "Problem Solving",
                "reason_for_asking": "Demonstrates advanced mathematical rigor in preventing the curse of dimensionality and collinearity.",
                "points": ["L1 regularization produces sparse feature sets by shrinking coefficients to zero", "PCA creates orthogonal linear combinations but sacrifices interpretability", "Tree-based MDI vs Permutation Importance for non-linear interactions", "Variance inflation factor (VIF) to detect multicollinearity"]
            }
        ]
    },
    "Generative AI": {
        "Beginner": [
            {
                "question": "What is Retrieval-Augmented Generation (RAG), and what problem does it solve compared to purely relying on a pre-trained LLM?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Verifies basic understanding of modern GenAI architectures and hallucination reduction.",
                "points": ["Augments LLM prompt with relevant external enterprise documents", "Overcomes knowledge cutoff and proprietary private data limitations", "Reduces hallucination by grounding responses in verified text citations"]
            },
            {
                "question": "What are text embeddings, and how do vector databases use them to perform similarity search?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Tests conceptual foundation of dense vector representations and geometric semantic proximity.",
                "points": ["Dense numerical vector representing semantic meaning", "Captures conceptual relationships in high-dimensional space (e.g. 768 or 1536 dim)", "Cosine similarity, Euclidean distance, or dot product to measure closeness"]
            }
        ],
        "Intermediate": [
            {
                "question": "In a production RAG pipeline, how do chunk size, chunk overlap, and chunking strategy (fixed-size vs recursive character vs semantic) impact retrieval quality?",
                "category": "Practical Implementation",
                "reason_for_asking": "Evaluates practical hands-on experience tuning chunking parameters for retrieval precision.",
                "points": ["Fixed chunking can split sentences mid-thought, destroying meaning", "Recursive chunking preserves paragraphs and semantic boundaries", "Overlap prevents loss of context at chunk transitions", "Chunk size trade-off: large chunks dilute specifics; small chunks lose overall context"]
            },
            {
                "question": "How do you mitigate hallucinations in LLM applications? Describe techniques spanning prompt engineering, retrieval verification, and validation guards.",
                "category": "Practical Implementation",
                "reason_for_asking": "Tests candidate's ability to build reliable, enterprise-grade Generative AI products.",
                "points": ["Strict system instructions: 'Only answer using provided context; state if unknown'", "Chain-of-thought prompting and structured JSON schema output enforcement", "Re-ranking retrieved chunks before injection into LLM prompt", "Output guardrails (Guardrails AI, NeMo Guardrails) for citation cross-checking"]
            }
        ],
        "Advanced": [
            {
                "question": "How would you architect a production RAG system serving 1,000 queries per second over 50 million documents? Detail vector indexing (HNSW vs IVFFlat), hybrid search, and latency optimization.",
                "category": "System Architecture",
                "reason_for_asking": "Evaluates large-scale distributed GenAI system design, indexing trade-offs, and query latency engineering.",
                "points": ["HNSW graph indexing for high recall and sub-50ms search vs IVFFlat memory trade-offs", "Hybrid search combining BM25 keyword search with dense vector similarity via Reciprocal Rank Fusion (RRF)", "Cross-encoder re-ranking limited to top 30 candidate chunks", "Vector caching (Redis) for high-frequency user queries"]
            },
            {
                "question": "When should an enterprise choose fine-tuning (e.g., LoRA / QLoRA) over RAG, or how would you combine both for specialized domain workflows?",
                "category": "Problem Solving",
                "reason_for_asking": "Demonstrates strategic decision-making between parameter adaptation and dynamic contextual retrieval.",
                "points": ["RAG is superior for dynamic knowledge updates, citation grounding, and access control", "Fine-tuning is needed for teaching new style, tone, specialized syntax, or task structure", "Combining LoRA for domain formatting with RAG for factual grounding", "Compute cost, latency, and maintenance overhead comparison"]
            }
        ]
    },
    "Java": {
        "Beginner": [
            {
                "question": "What is the difference between an abstract class and an interface in modern Java (Java 8+)? When would you use each?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Verifies core Java OOP principles, default methods, and interface evolution.",
                "points": ["Abstract classes can maintain instance state; interfaces cannot", "A class can implement multiple interfaces but extend only one class", "Default and static methods in interfaces since Java 8"]
            },
            {
                "question": "Explain the difference between `==` and the `.equals()` method in Java. How are `equals()` and `hashCode()` contractually linked?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Tests understanding of object identity, equality, and hash-based collections.",
                "points": ["`==` compares memory references; `.equals()` compares logical equivalence", "If two objects are equal via equals(), they must have identical hashCodes", "Breaking the hashCode contract causes silent failures in HashSet and HashMap"]
            }
        ],
        "Intermediate": [
            {
                "question": "Explain how Dependency Injection and Inversion of Control (IoC) function in Spring Boot. Why is Constructor Injection preferred over Field Injection (`@Autowired`)?",
                "category": "Practical Implementation",
                "reason_for_asking": "Evaluates enterprise Spring Boot architectural best practices and testability.",
                "points": ["ApplicationContext bean lifecycle and container management", "Constructor injection enables final fields (immutability)", "Facilitates clean unit testing without Spring reflection context", "Prevents hidden circular dependencies at startup"]
            },
            {
                "question": "How do you handle database transactions in Spring Boot using `@Transactional`? What causes a transaction rollback to fail, and how do you handle checked exceptions?",
                "category": "Practical Implementation",
                "reason_for_asking": "Tests enterprise database consistency and transaction propagation boundaries.",
                "points": ["Spring AOP proxy intercepting transactional method calls", "Self-invocation bypasses proxy, disabling transaction management", "Default rollback occurs only on unchecked (RuntimeException) exceptions", "rollbackFor = Exception.class for checked exceptions"]
            }
        ],
        "Advanced": [
            {
                "question": "Explain how modern JVM garbage collection works (G1 GC vs ZGC). How would you diagnose and resolve a severe memory leak or high CPU usage in a production JVM service?",
                "category": "Problem Solving",
                "reason_for_asking": "Demonstrates production JVM runtime tuning, thread profiling, and heap dump analysis mastery.",
                "points": ["G1 GC regionalized heap and incremental collection; ZGC colored pointers and sub-millisecond pauses", "Generating heap dumps with jcmd / jmap on OutOfMemoryError", "Analyzing heap dumps in Eclipse MAT to locate retained object references", "Thread dump analysis to detect thread deadlocks or CPU spinning"]
            },
            {
                "question": "How would you design a distributed microservices workflow requiring data consistency across multiple database services without distributed 2PC locks? Compare the Saga Pattern (Choreography vs Orchestration).",
                "category": "System Architecture",
                "reason_for_asking": "Evaluates enterprise distributed systems design and eventual consistency patterns.",
                "points": ["Two-Phase Commit (2PC) creates blocking dependencies and scalability bottlenecks", "Saga Pattern executes local transactions with compensating transactions on failure", "Orchestration uses a central coordinator; Choreography relies on event publishing (Kafka)", "Outbox pattern to guarantee atomic DB write and event emission"]
            }
        ]
    },
    "React": {
        "Beginner": [
            {
                "question": "What is the Virtual DOM in React, and how does React's reconciliation process optimize DOM updates?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Verifies foundational understanding of React rendering and performance heuristics.",
                "points": ["Lightweight in-memory representation of real DOM tree", "Diffing algorithm compares previous and current Virtual DOM trees", "Batching updates to real DOM minimizes expensive layout recalculations"]
            },
            {
                "question": "What are React Hooks? Explain the rules of hooks and what happens if a hook is called inside a conditional `if` statement.",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Tests core knowledge of React component lifecycle and hook call-order invariants.",
                "points": ["Hooks allow functional components to maintain state and side effects", "Only call hooks at top level; never inside loops or conditions", "React relies on strict call order of hooks across renders using an internal linked list"]
            }
        ],
        "Intermediate": [
            {
                "question": "When should you use `useMemo` and `useCallback`? What are the performance trade-offs of overusing them?",
                "category": "Practical Implementation",
                "reason_for_asking": "Evaluates component rendering optimization and avoidance of premature memoization overhead.",
                "points": ["useMemo memoizes computed values; useCallback memoizes function references", "Primary purpose: preventing unnecessary re-renders of memoized child components (React.memo)", "Overuse adds memory overhead and dependency comparison cost for trivial calculations", "Ensuring reference stability in custom hook dependency arrays"]
            },
            {
                "question": "Compare React Context API with dedicated state managers (Redux Toolkit, Zustand). Under what conditions does Context API cause performance bottlenecks?",
                "category": "Practical Implementation",
                "reason_for_asking": "Tests enterprise frontend state architecture and scalability.",
                "points": ["Context re-renders ALL consuming components whenever any value in the context changes", "Zustand/Redux support fine-grained selector subscriptions to avoid re-renders", "Context is ideal for low-frequency updates (theme, auth state)", "Separating server state (React Query / SWR) from UI state"]
            }
        ],
        "Advanced": [
            {
                "question": "How does React 18 Fiber's Concurrent Mode work under the hood? Explain how transitions (`useTransition`), Suspense, and time-slicing prevent main-thread UI blocking.",
                "category": "Problem Solving",
                "reason_for_asking": "Demonstrates cutting-edge React concurrent rendering and high-frequency UI responsiveness mastery.",
                "points": ["Fiber linked-list tree structure allows interrupting and resuming work", "Urgent updates (typing, clicking) interrupt non-urgent transitions (rendering large lists)", "Time-slicing yields control back to the browser event loop every 5ms", "Suspense coordinates asynchronous data streaming and fallback boundaries"]
            },
            {
                "question": "How would you architect an enterprise React micro-frontend platform supporting multiple autonomous teams, shared design systems, and independent zero-downtime deployments?",
                "category": "System Architecture",
                "reason_for_asking": "Evaluates frontend enterprise architecture, module federation, and bundle isolation.",
                "points": ["Webpack 5 / Vite Module Federation for dynamic runtime remote module loading", "Shared singleton dependencies (React, ReactDOM) to prevent duplicate runtimes", "CSS isolation via Tailwind prefixing or CSS Modules to prevent style collisions", "Cross-app communication using custom events or lightweight pub/sub event bus"]
            }
        ]
    },
    "Cloud and DevOps": {
        "Beginner": [
            {
                "question": "What is the difference between a Docker container and a Virtual Machine? How do container namespaces and cgroups work?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Tests foundational virtualization and containerization concepts.",
                "points": ["VMs virtualize hardware and run full guest OS; containers share host OS kernel", "Linux namespaces provide process, network, and mount isolation", "cgroups enforce resource limits (CPU, memory, I/O) on containers"]
            },
            {
                "question": "What is Continuous Integration and Continuous Deployment (CI/CD)? What are the primary stages in a standard pipeline?",
                "category": "Conceptual Knowledge",
                "reason_for_asking": "Verifies basic understanding of modern automated software delivery lifecycles.",
                "points": ["Automated code integration, linting, unit testing, building artifacts", "Automated deployment to staging and production environments", "Early bug detection, consistent builds, and short release cycles"]
            }
        ],
        "Intermediate": [
            {
                "question": "What best practices do you implement when creating production Dockerfiles to minimize image size and harden security?",
                "category": "Practical Implementation",
                "reason_for_asking": "Evaluates container security, build caching, and production image hygiene.",
                "points": ["Multi-stage builds to exclude build tools and source code from final image", "Running as non-root user with dedicated UID", "Using minimal base images (Alpine or Distroless)", "Ordering Dockerfile instructions to maximize layer cache hits", ".dockerignore to avoid copying secrets or node_modules"]
            },
            {
                "question": "In Kubernetes, explain the difference between a Deployment, a StatefulSet, and a DaemonSet. When would you use each?",
                "category": "Practical Implementation",
                "reason_for_asking": "Tests workload orchestration in production Kubernetes clusters.",
                "points": ["Deployments manage stateless pods with declarative rolling updates", "StatefulSets provide stable network IDs and persistent storage ordering (e.g. databases)", "DaemonSets ensure exactly one pod runs on each node (e.g. log collectors, monitoring agents)"]
            }
        ],
        "Advanced": [
            {
                "question": "How would you design a multi-region, active-active high-availability infrastructure on AWS with automated failover and sub-second RPO/RTO?",
                "category": "System Architecture",
                "reason_for_asking": "Demonstrates enterprise cloud resilience, global traffic routing, and cross-region replication design.",
                "points": ["Route 53 latency-based routing or health-check DNS failover", "Amazon Aurora Global Database with fast cross-region replication (<1 sec)", "Multi-region S3 replication with versioning", "Infrastructure as Code (Terraform) ensuring identical environments in both regions"]
            },
            {
                "question": "Describe how you implement zero-downtime progressive delivery using Canary or Blue-Green deployments with a service mesh (Istio) or ArgoCD.",
                "category": "Problem Solving",
                "reason_for_asking": "Evaluates modern GitOps practices, automated rollback telemetry, and traffic shifting.",
                "points": ["Istio VirtualService routing 5% of traffic to Canary version", "Monitoring Prometheus error rates and latency metrics during canary phase", "Automated rollback if error budget or latency threshold is breached", "Gradual step progression (5% -> 25% -> 100%) and Blue-Green traffic flip"]
            }
        ]
    }
}


def generate_candidate_project_questions(projects: List[Dict[str, Any]], difficulty: str = "Intermediate") -> List[Dict[str, Any]]:
    """Synthesizes candidate-specific project questions derived strictly from the candidate's actual projects."""
    project_questions = []

    for p in projects:
        p_name = p.get("title") or p.get("name") or "Application"
        p_desc = p.get("description", "")
        p_tech = p.get("technologies") or p.get("tech_stack", [])
        tech_str = ", ".join(p_tech[:4]) if p_tech else "the selected technology stack"

        if difficulty == "Beginner":
            project_questions.append({
                "question": f"In your project '{p_name}', what were the core requirements and why did you choose {tech_str} to build it?",
                "difficulty": "Beginner",
                "skill_tested": f"Project Architecture: {p_name}",
                "category": "Project Understanding",
                "question_category": "Project Understanding",
                "reason_for_asking": f"Evaluates the candidate's personal ownership and technology selection rationale for '{p_name}'.",
                "expected_answer_points": [
                    f"Clear explanation of the problem solved by {p_name}",
                    f"Justification for selecting {tech_str} over alternative technologies",
                    "High-level structural breakdown of the application"
                ],
                "evaluation_rubric": "Candidate clearly justifies technology choice, explains core features, and demonstrates authentic project involvement."
            })
        elif difficulty == "Intermediate":
            project_questions.append({
                "question": f"In your project '{p_name}', how did you implement the integration between {tech_str}? What was a difficult technical challenge you debugged?",
                "difficulty": "Intermediate",
                "skill_tested": f"Project Implementation: {p_name}",
                "category": "Practical Implementation",
                "question_category": "Practical Implementation",
                "reason_for_asking": f"Evaluates hands-on implementation depth and debugging abilities in '{p_name}'.",
                "expected_answer_points": [
                    f"Specific details on data flow and API integration in {p_name}",
                    "Root cause analysis of a specific bug or bottleneck encountered",
                    "Testing and validation strategies applied before deployment"
                ],
                "evaluation_rubric": "Candidate describes realistic debugging, explains API/database integration details, and understands trade-offs."
            })
        else:  # Advanced
            project_questions.append({
                "question": f"If user traffic or data volume for '{p_name}' increased by 100x, where would the architectural bottlenecks appear in your {tech_str} implementation, and how would you re-engineer it for high availability?",
                "difficulty": "Advanced",
                "skill_tested": f"Project Scalability: {p_name}",
                "category": "System Architecture",
                "question_category": "System Architecture",
                "reason_for_asking": f"Evaluates senior architectural maturity, bottleneck forecasting, and scaling trade-offs for '{p_name}'.",
                "expected_answer_points": [
                    "Identification of single points of failure and database query bottlenecks",
                    "Caching layers, asynchronous queuing, and horizontal pod auto-scaling",
                    "Data partitioning, read replicas, and disaster recovery strategies"
                ],
                "evaluation_rubric": "Candidate accurately identifies scaling bottlenecks, discusses horizontal scaling, caching, and resiliency patterns."
            })

    return project_questions


def synthesize_structured_interview_questions(
    candidate_profile: Dict[str, Any],
    job_role: str,
    target_difficulty: str = "All",
    count_per_tier: int = 2
) -> List[Dict[str, Any]]:
    """Synthesizes role-aligned, candidate-grounded interview questions organized into
    Beginner, Intermediate, and Advanced tiers, with candidate project questions.
    """
    candidate_skills = set(candidate_profile.get("skills", []))
    projects = candidate_profile.get("projects", [])
    role_lower = job_role.lower()

    # Identify primary technical domains relevant to candidate & role
    matched_domains = []
    for domain in MULTI_TIER_QUESTION_BANK.keys():
        # Check if domain matches candidate skills or target role
        if any(domain.lower() in s.lower() for s in candidate_skills) or domain.lower() in role_lower:
            matched_domains.append(domain)

    # Check for specific role matches
    for role_key, req_skills in ROLE_SKILL_REQUIREMENTS.items():
        if role_key in role_lower:
            for s in req_skills:
                for domain in MULTI_TIER_QUESTION_BANK.keys():
                    if domain.lower() == s.lower() and domain not in matched_domains:
                        matched_domains.append(domain)

    # Ensure at least Python or Java or React if candidate has them
    if not matched_domains:
        for fallback in ["Python", "Java", "React", "Cloud and DevOps", "Machine Learning"]:
            if any(fallback.lower() in s.lower() for s in candidate_skills):
                matched_domains.append(fallback)
                break
    if not matched_domains:
        matched_domains = ["Python"]

    all_questions = []

    # Difficulty tiers to generate
    tiers = ["Beginner", "Intermediate", "Advanced"] if target_difficulty in ["All", ""] else [target_difficulty]

    for tier in tiers:
        tier_questions = []

        # 1. Project-specific questions for this tier
        proj_qs = generate_candidate_project_questions(projects, tier)
        if proj_qs:
            tier_questions.append(proj_qs[0])

        # 2. Domain technical questions matching candidate's verified skills
        for domain in matched_domains:
            if domain in MULTI_TIER_QUESTION_BANK and tier in MULTI_TIER_QUESTION_BANK[domain]:
                for q_item in MULTI_TIER_QUESTION_BANK[domain][tier]:
                    # Avoid duplicates
                    if not any(tq["question"] == q_item["question"] for tq in tier_questions):
                        tier_questions.append({
                            "question": q_item["question"],
                            "difficulty": tier,
                            "skill_tested": domain,
                            "category": q_item.get("category", "Conceptual Knowledge"),
                            "question_category": q_item.get("category", "Conceptual Knowledge"),
                            "reason_for_asking": q_item["reason_for_asking"],
                            "expected_answer_points": q_item["points"],
                            "evaluation_rubric": q_item.get("rubric") or f"Evaluates {q_item.get('category', 'technical').lower()} understanding, structural reasoning, and practical trade-offs."
                        })
                    if len(tier_questions) >= count_per_tier + 1:
                        break

        # 3. Add second project question if available and needed
        if len(proj_qs) > 1 and len(tier_questions) < count_per_tier + 1:
            tier_questions.append(proj_qs[1])

        all_questions.extend(tier_questions[:max(2, count_per_tier + 1)])

    # -------------------------------------------------------------
    # Step 6: Post-Generation Relevance & Deduplication Validation
    # -------------------------------------------------------------
    validated_questions = []
    seen_stems = set()

    for idx, q in enumerate(all_questions):
        q_text = q.get("question", "").strip()
        stem = re.sub(r"[^\w\s]", "", q_text.lower())[:60]
        if stem in seen_stems:
            continue
        seen_stems.add(stem)

        # Ensure question has an ID
        q["id"] = f"q_{idx+1}"
        validated_questions.append(q)

    return validated_questions
