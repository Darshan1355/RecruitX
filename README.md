# TalentIQ

TalentIQ is a full-stack GenAI candidate-selection platform for recruiters. It combines a React interface, an Express API, an SQLite application database, and a Python Flask AI service backed by ChromaDB and SentenceTransformers.

## Features

- Recruiter registration, login, tenant-isolated data, and JWT authentication
- PDF/DOCX resume upload, parsing, structured profiles, evidence citations, and preview/download
- Technical skills, projects, education, experience, certifications, and achievements extraction
- Embedding generation and ChromaDB vector storage
- RAG candidate search, ATS scoring, ranking, comparison, and shortlisting
- Candidate Talent DNA profiles
- AI Recruitment Copilot with streaming responses and conversation history
- Interview question generation, editing, PDF guides, saved sessions, and deletion
- Dashboard statistics and candidate notifications

## Final Structure

```text
resume_analyzer/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       └── pages/
├── server/                  # Node.js + Express backend
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── routes/
│   ├── data/                # Local SQLite runtime data
│   ├── uploads/             # Local uploaded resumes
│   └── tests/
├── ai_service/              # Flask AI API and ChromaDB
├── sample_data/             # Demo resume PDFs
├── test_core_pipeline.py    # Python parser/interview/PDF verification
├── .env.example             # Placeholder environment configuration
├── .gitignore
└── README.md
```

## Technology

- Frontend: React 18, Vite, Tailwind CSS, React Router, Recharts
- Backend: Node.js, Express, SQLite, JWT, Multer
- AI: Python, Flask, ChromaDB, SentenceTransformers, PyPDF, python-docx, ReportLab

## Windows PowerShell Setup

### Prerequisites

- Node.js 18 or newer
- Python 3.10 or newer
- Windows PowerShell

### 1. Configure environment variables

```powershell
Copy-Item .env.example server/.env
Copy-Item server/.env.example server/.env
```

Set a unique random `JWT_SECRET` in `server/.env`. Example placeholder values are safe defaults only.

`server/.env` is ignored by Git and must not be committed.

### 2. Install frontend dependencies

```powershell
Set-Location client
npm install
Set-Location ..
```

### 3. Install backend dependencies

```powershell
Set-Location server
npm install
Set-Location ..
```

### 4. Install Python dependencies

```powershell
python -m venv .venv
\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r ai_service/requirements.txt
```

## Run TalentIQ

Open three PowerShell terminals.

### Terminal 1: AI service

```powershell
cd G:\resume_analyzer
\.venv\Scripts\Activate.ps1
python ai_service/server.py
```

Runs at `http://127.0.0.1:5001`.

### Terminal 2: Node backend

```powershell
cd G:\resume_analyzer\server
npm start
```

Runs at `http://127.0.0.1:5000`. It initializes `server/data/talentiq.sqlite3` and requires `JWT_SECRET`.

### Terminal 3: React frontend

```powershell
cd G:\resume_analyzer\client
npm run dev
```

Runs at `http://127.0.0.1:3000`.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | Node backend port |
| `JWT_SECRET` | None | Required JWT signing secret |
| `AI_SERVICE_URL` | `http://127.0.0.1:5001` | Python service URL |
| `SQLITE_DB_PATH` | `server/data/talentiq.sqlite3` | SQLite database location |
| `UPLOAD_DIR` | `server/uploads` | Resume upload location |
| `CHROMA_DB_PATH` | `ai_service/data/resume_db` | ChromaDB persistence location |
| `PORT` (AI process) | `5001` | Flask AI service port |

Do not commit `.env`, API keys, SQLite candidate data, uploaded resumes, vector database files, logs, or generated PDFs.

## Database and Runtime Data

The Express backend creates and migrates the SQLite schema automatically. Runtime SQLite files and uploaded resumes are excluded from Git by `.gitignore`.

The first backend initialization can seed the demo recruiter and sample candidate records. Existing database data is preserved on later starts.

Default demo credentials:

- Email: `admin@talentiq.ai`
- Password: `Admin@1234`

Change or remove demo credentials before production use.

## API Overview

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/dashboard/*`
- `GET|POST /api/resumes/*`
- `GET|POST /api/candidates/*`
- `POST /api/copilot/chat`
- `GET|POST|PUT|DELETE /api/interviews/*`
- `GET /api/notifications/*`
- `GET /api/health`
- `GET|POST /api/ai/*` on the Python service

## Testing

Build the frontend and start all three services before integration tests.

```powershell
cd G:\resume_analyzer\client
npm run build
cd ..\server
npm run test:full
npm run test:e2e
npm run test:cascade
cd ..
python test_core_pipeline.py
```

Integration scripts require the backend and AI service to be running.
