# CIT Schedule

Scheduling and venue management for Chilika Institute of Technology (CIT). Built for a hackathon, this system handles weekly timetables, exam schedules, room bookings, and disruption recovery for 27 rooms, 40 faculty, 14 student groups, 62 courses, and 189 sessions (243 teaching hours per week).

## Architecture

```mermaid
flowchart TD
    User([User]) --> Frontend[Next.js Frontend]
    Frontend --> Backend[FastAPI Backend]
    Backend --> Kernel[Kernel: validate, diff, approve, commit]
    Backend --> Solver[Solver: CP-SAT]
    Backend --> Bookings[Bookings: priority engine]
    Backend --> AI[AI layer: LLM draft, fallback parser]
    Kernel --> DB[(SQLite DB)]
    Solver --> DB
    Bookings --> DB
    AI --> DB
    Validator[Validator: official, cross-check] --> DB
```

## Tech stack

| Component | Technology | Version |
|-----------|------------|---------|
| Backend | FastAPI | 0.115.0 |
| Solver | OR-Tools CP-SAT | 9.15.6755 |
| Frontend | Next.js | 14.2.18 |
| Styling | Tailwind CSS | 3.4.1 |
| Database | SQLite | 3.x |
| Language (backend) | Python | 3.13.7 |
| Language (frontend) | Node.js | 20+ |

## Setup

### Prerequisites

Python 3.13 or newer, Node.js 20 or newer, Git.

### Clone and configure

```bash
git clone <repo-url>
cd cit-schedule
cp .env.example .env
# Edit .env if you want to set an LLM API key (optional).
```

### Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Seed demo data

```bash
cd backend
python -m scripts.seed_demo
```

This loads the CIT dataset (`cit_public.json`) and initializes the demo accounts listed below.

## Demo accounts

| Email | Password | Role | Profile Mapping |
|-------|----------|------|-----------------|
| `admin@cit.edu` | `admin123` | Admin | System Administrator |
| `dean@cit.edu` | `dean123` | Admin | Dean of Academic Affairs |
| `coordinator@cit.edu` | `coord123` | Department coordinator | Department: CSE |
| `faculty@cit.edu` | `faculty123` | Faculty | Faculty ID: F01 |
| `club@cit.edu` | `club123` | Club representative | Club: Coding Club |

## Running the validator

The organiser-provided validator lives in `validator/validator.py`. Run it against the generated schedule:

```bash
python validator/validator.py --data data/cit_public.json --schedule exports/schedule.json
```

For the post-disruption schedule:

```bash
python validator/validator.py --data data/cit_public.json --schedule exports/schedule_after.json --disruption data/sample_disruption.json --baseline exports/schedule.json
```

Both commands report zero hard-constraint violations.

## Testing and Verification

Run fast tests (excludes CP-SAT tests taking > 5 seconds):
```bash
make test
```

Run all tests including CP-SAT solver tests with duration timings:
```bash
make test-all
```

## Deployment

### Backend via Docker

```bash
docker build -t cit-backend -f backend/Dockerfile .
docker run -p 8000:8000 -e PORT=8000 cit-backend
```

Container healthcheck verifies `GET /api/health` every 30 seconds.

### Frontend on Vercel

When importing this repository into Vercel:
1. In **Project Settings** -> **General** -> **Root Directory**, click **Edit**.
2. Set Root Directory to `frontend`.
3. Set the environment variable `NEXT_PUBLIC_API_URL` to your backend URL (e.g. your deployed FastAPI server).
4. Click **Deploy**.

## Judge quick start

1. **Find a free room.** Log in as `admin@cit.edu`. Go to Rooms, pick a date and period. The list shows which rooms are open and their capacity.
2. **Read a timetable.** Go to Timetable. Filter by student group (e.g. `Y1-A`) or faculty name. Each cell shows course, room, and faculty.
3. **Approve a change.** Go to Pending Changes. Click on a proposed schedule change, review the diff (what moves, what stays), and click Approve or Reject. Proposals uploaded from a disruption file have `proposed_by = "system"` and can be approved by any Admin; self-approval on direct user requests is blocked (`SELF_APPROVAL`).

## Known limitations

- AI parsing of natural language booking prompts requires a valid `GEMINI_API_KEY` or `OPENAI_API_KEY`. If unconfigured, the system automatically falls back to deterministic regex pattern extraction without failing.
- Real-time updates use polling; WebSockets are not enabled.
- PDF and ICS calendar file exports are not implemented.
