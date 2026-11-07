# RecruitX

**Recruit Smarter. Hire Better.**

RecruitX is an AI recruitment SaaS platform for resume parsing, candidate intelligence, RAG search, ranking, interview generation, and recruitment workflows.

## Architecture

```text
React/Vite frontend  ->  Node.js/Express API  ->  Python/Flask AI service
                               |                         |
                               v                         v
                        Hosted SQL database       ChromaDB vector store
                               |
                               v
                       Persistent object storage
```

The current implementation uses:

- React 18, Vite, Tailwind CSS, Recharts
- Node.js, Express, SQLite-compatible application models, JWT, Multer
- Python, Flask, SentenceTransformers, ChromaDB, PyPDF, python-docx, ReportLab

## Project Structure

```text
client/                 React frontend
  src/api/              Axios API client
  src/components/       Shared UI components
  src/context/          Authentication and toast state
  src/pages/            Route-level pages
  public/favicon.svg
server/                 Express backend
  src/config/           Database configuration
  src/controllers/      HTTP business logic
  src/middleware/       JWT authentication
  src/routes/           API routes
  src/utils/            Service integration helpers
ai_service/             Flask AI and vector service
sample_data/            Demo resume PDFs
vercel.json             Frontend Vercel configuration
```

## Local Setup on Windows

### Prerequisites

- Node.js 18+
- Python 3.10+
- Windows PowerShell

### Install

```powershell
cd G:\resume_analyzer
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r ai_service\requirements.txt

Copy-Item .env.example server\.env
npm --prefix client install
npm --prefix server install
```

Edit `server\.env` and set a strong `JWT_SECRET` and matching `SERVICE_AUTH_SECRET` for both Node and Python environments.

### Start

Use three PowerShell terminals:

```powershell
# AI service
cd G:\resume_analyzer
.\.venv\Scripts\Activate.ps1
$env:SERVICE_AUTH_SECRET="replace_with_a_long_random_service_secret"
python ai_service\server.py
```

```powershell
# Backend
cd G:\resume_analyzer\server
npm start
```

```powershell
# Frontend
cd G:\resume_analyzer\client
npm run dev
```

Frontend: `http://127.0.0.1:3000`

Backend: `http://127.0.0.1:5000`

AI service: `http://127.0.0.1:5001`

## Environment Variables

| Location | Variable | Default / Purpose |
|---|---|---|
| Frontend | `VITE_API_BASE_URL` | Backend origin, for example `https://api.example.com` |
| Backend | `PORT` | `5000` |
| Backend | `JWT_SECRET` | Required signing secret |
| Backend | `AI_SERVICE_URL` | `http://127.0.0.1:5001` |
| Backend | `SERVICE_AUTH_SECRET` | Shared secret for Python service calls |
| Backend | `SQLITE_DB_PATH` | Local SQLite path |
| Backend | `UPLOAD_DIR` | Local resume upload path |
| Backend | `CORS_ALLOWED_ORIGINS` | Comma-separated production origins |
| Python | `PORT` | `5001` |
| Python | `CHROMA_DB_PATH` | Persistent ChromaDB directory |
| Python | `SERVICE_AUTH_SECRET` | Must match the backend secret |

Never place private secrets in frontend environment variables.

## Vercel Deployment

The React frontend can be deployed directly to Vercel. The repository's `vercel.json` configures the Vite build and SPA fallback.

1. Push the repository to GitHub.
2. Import it in Vercel.
3. Keep the repository root as the project root, or set the root directory to `client`.
4. If using the repository-root configuration, retain:
   - Build command: `npm --prefix client run build`
   - Output directory: `client/dist`
5. Set `VITE_API_BASE_URL=https://your-backend.example.com`.
6. Redeploy.

The Express backend should not be deployed on Vercel as-is with the current SQLite implementation. The Flask AI service should not be deployed as-is on Vercel because it loads an embedding model and uses persistent ChromaDB storage.

Recommended production architecture:

- Vercel: React frontend
- Render/Railway/Fly.io or another persistent host: Express backend and Flask AI service
- Managed PostgreSQL (Neon, Supabase, or another provider): application SQL data
- Hosted object storage (Supabase Storage, S3, or R2): resumes and generated PDFs
- Persistent vector host/storage: ChromaDB-compatible managed storage or hosted vector database

The SQLite/ChromaDB architecture cannot safely rely on temporary serverless filesystem storage.

## Database and Migration Requirements

Before production deployment:

1. Back up `server/data/talentiq.sqlite3` and `server/uploads/`.
2. Back up `ai_service/data/resume_db/`.
3. Export candidate and resume records into managed PostgreSQL.
4. Update SQL query adapters and connection pooling.
5. Re-index all existing resume documents into hosted vector storage.
6. Copy resume files into object storage while preserving database/file references.
7. Validate user-level access for every candidate and resume.

The existing SQLite database, ChromaDB collection, and uploaded files remain preserved in their current local locations until an explicit migration is performed.

## Security Notes

- JWT secrets must be unique in production.
- Configure `CORS_ALLOWED_ORIGINS` to the exact frontend origin.
- Set `SERVICE_AUTH_SECRET` to protect backend-to-AI service requests.
- Never commit `.env` files, uploaded resumes, SQLite files, ChromaDB files, or API keys.
- Use authenticated object-storage URLs rather than public permanent links.

## Testing

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

Integration tests require all three services to be running.
