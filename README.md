# TalentIQ — Premium AI Recruitment Intelligence Platform

> **Find. Understand. Hire.**  
> Futuristic Glassmorphism SaaS Recruitment Intelligence Platform powered by Generative AI, RAG, ChromaDB Vector Search, Relational SQLite, Node.js/Express, and React 18.

---

## 1. System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │               React 18 Frontend              │
                    │      (Vite + Tailwind CSS + Lucide Icons)     │
                    │            http://127.0.0.1:3000             │
                    └──────────────────────┬───────────────────────┘
                                           │
                           JWT Bearer REST │ Proxy: /api/*
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │          Node.js + Express.js Backend        │
                    │       Authentication, Tenant Isolation,       │
                    │        Multer File Store, SQLite Schema      │
                    │            http://127.0.0.1:5000             │
                    └──────────────────────┬───────────────────────┘
                                           │
                         Internal HTTP API │ Port 5001
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │             Python AI Service                │
                    │     ChromaDB (768-dim Vectors), RAG Search,  │
                    │     Talent DNA Synthesis, Copilot, Studio     │
                    │            http://127.0.0.1:5001             │
                    └──────────────────────────────────────────────┘
```

---

## 2. Default Lead Recruiter Credentials

Pre-seeded and pre-loaded with the 10 real sample candidate resumes from `sample_data/`:

- **Email:** `admin@talentiq.ai`
- **Password:** `Admin@1234`
- *(Or register any new recruiter account via the UI; all data is strictly isolated per tenant)*

---

## 3. The Six Major Intelligence Modules

1. **AI Recruitment Dashboard (`/`)**
   - Banner: *"Discover the Right Talent with the Power of Gen AI"* (Subtitle: *"From resumes to real insights — hire with confidence!"*)
   - Natural-Language RAG Search Bar (e.g. *"Find Java developers with Spring Boot, MySQL and 2+ years of relevant experience"*)
   - Dynamic KPI Stats Cards (Resumes, Candidates Indexed, Shortlisted, Active Searches)
   - Top Matching Candidate cards with Match %, Shortlist button, Talent DNA button, and Resume Evidence viewer
   - AI Match Accuracy Arc Gauge & Skill Distribution charts
2. **Resume Intelligence & Bulk Upload (`/resumes`)**
   - Multi-file drag-and-drop for PDF and DOCX documents
   - Real-time status pipeline: Uploaded → Extracting → Embeddings → Indexed
   - Resume repository table with search and filtering
   - Download original file
   - Permanent Cascade Deletion: Permanently removes file on disk, SQL records, candidate profile, citations, and ChromaDB vector embeddings
3. **Candidate Profile – Talent DNA (`/candidates` or `/candidates/:id`)**
   - Candidate Overview (Contact, education, experience, projects, skills)
   - Technical Competency Radar Chart (6 dimensions)
   - Experience Timeline & Project Intelligence
   - Domain Expertise and Potential Career Matches
   - Unverified / Missing Data callout
   - **Evidence-Based AI Verification Trail:** Exact quote, page number, and source file citation
4. **AI Recruitment Copilot (`/copilot`)**
   - Conversational AI recruiter assistant grounded in retrieved resume vectors
   - Multi-turn conversation history per authenticated user
   - Grounded candidate chips in answers
   - Quick prompt pills
5. **Candidate Comparison (`/compare`)**
   - Multi-select 2 to 4 candidates side-by-side
   - Comprehensive skill matrix comparison table
   - AI Comparative Intelligence summary
   - One-click shortlist toggling
6. **AI Interview Studio (`/interviews`)**
   - Configurable by candidate, job role, interview type (Technical, HR, Project, Coding, Scenario), difficulty (Beginner, Intermediate, Advanced), and question count
   - Generates questions grounded in real candidate projects
   - Expected answer points and evaluation rubrics
   - In-place question editing
   - Printable / PDF export format and saved interview history

---

## 4. How to Start the Services

### Prerequisites
- Node.js v18+ (verified on v22.14.0)
- Python 3.10+ (verified on 3.13.2)

### Terminal 1: Python AI Service
```bash
python ai_service/server.py
```
*Runs on `http://127.0.0.1:5001` with ChromaDB and SentenceTransformer loaded.*

### Terminal 2: Node.js Backend
```bash
cd server
npm start
```
*Runs on `http://127.0.0.1:5000` with SQLite persistence at `./data/talentiq.sqlite3`.*

### Terminal 3: React Frontend
```bash
cd client
npm run dev
```
*Runs on `http://127.0.0.1:3000`.*

---

## 5. Running the Automated Test Suite

### End-to-End Integration Test
```bash
cd server
node test_e2e.js
```
*Tests registration, tenant data isolation, RAG semantic search, Talent DNA, comparison, copilot, interview generation, and permission verification.*

### Cascade Deletion Test
```bash
cd server
node test_cascade_delete.js
```
*Tests upload, multi-tier persistence, and permanent cleanup of file + SQL + ChromaDB vectors.*

### Python AI Engine Tests
```bash
cd AI-based-Resume-Analyzer
pytest
```
*17 original unit tests pass.*
