# Decisions log

Each entry: date/time, decision, options considered, why this one, cost/trade-off.

---

### 2026-10-31 13:10 IST: Stack choice

**Decision**: FastAPI + OR-Tools CP-SAT + Next.js + Tailwind CSS.

**Options**: Django + Celery, Express + Node, Flask + custom solver.

**Why**: FastAPI has async support and type hints, which makes the API layer clean and fast to build. OR-Tools CP-SAT is the best free constraint programming solver available. Next.js gives server-side rendering and fast iteration. STRATEGY.md specifies this stack.

**Cost**: Python backend means no shared types with the frontend without codegen. Two languages in one repo.

---

### 2026-10-31 13:15 IST: Auth approach

**Decision**: Simple dict-based auth with hardcoded demo accounts. JWT tokens for session management.

**Options**: Full auth service (Supabase, Auth0), database-backed user table, dict-based demo auth.

**Why**: This is a hackathon demo. We need four accounts that judges can log into immediately. A full auth service adds setup friction and failure modes we do not need for a 24-hour build.

**Cost**: Not production-safe. Passwords are hardcoded. No registration, no password reset, no rate limiting on login.

---

### 2026-10-31 13:20 IST: Database choice

**Decision**: SQLite for all data storage.

**Options**: PostgreSQL, MySQL, SQLite, in-memory only.

**Why**: SQLite needs zero setup: no server, no config, just a file. The dataset is small (27 rooms, 40 faculty, 189 sessions). Reads and writes are fast enough for a single-user demo. Migration to Postgres later is straightforward since we use standard SQL.

**Cost**: No concurrent write support. If two users submit at the same time, one will block. Fine for a demo, not for production.

---

### 2026-10-31 13:25 IST: Kernel mirrors validator rule by rule

**Decision**: The kernel implements every constraint (H1 through H14, S1 through S6, B1 through B3, E1 through E2) as a separate function that matches the organiser validator logic.

**Options**: Write our own constraint definitions from scratch, copy the validator, mirror it function by function.

**Why**: STRATEGY.md section 2 says the kernel must mirror the validator. This way we can cross-check our output against the organiser validator and catch mismatches early. Each kernel function maps to one validator rule, which makes debugging straightforward.

**Cost**: If the organiser updates validator.py, we need to update the kernel to match. Maintenance burden is real but acceptable for a hackathon.

---

### 2026-10-31 13:30 IST: Validator ground truth and exact semantics

**Decision**: The official validator defines ground truth runtime checks. Rather than assuming vague disagreements between the problem statement and validator code, exact validator semantics are documented in docs/validator-semantics.md (integer floor division for exam room capacity, role category caps, cancellation handling, and S4 basket counting). Only true textual contradictions are logged as disagreements.

**Options**: Assume loose interpretations, follow informal text, follow validator code strictly.

**Why**: The official validator evaluates the submission. Following exact validator logic guarantees compliance.

**Cost**: We must carefully check and test edge cases to mirror validator logic exactly.

---

### 2026-10-31 13:35 IST: Stubs raise NotImplementedError

**Decision**: All stub functions raise NotImplementedError with a message describing what they will do.

**Options**: Return None silently, raise NotImplementedError, log a warning.

**Why**: Silent stubs hide missing functionality. A crash is honest: it tells you exactly which feature is not built yet. During development, this surfaces gaps immediately instead of producing wrong results.

**Cost**: The app will crash if a user hits an unimplemented endpoint. We handle this with a global exception handler that returns a clear 501 response.

---

### 2026-10-31 13:40 IST: Organiser files copied unchanged

**Decision**: The organiser-provided validator.py and cit_public.json are copied unchanged into validator/ and data/ respectively.

**Options**: Modify them, wrap them, copy them as-is.

**Why**: We want to run the exact same validator the judges will use. Any modification risks introducing differences between our local check and the official check. The data file is the single source of truth for the CIT dataset.

**Cost**: If the organiser files have bugs, we cannot fix them. We work around issues in our kernel instead.

---

### 2026-10-31 14:12 IST: Python 3.13 runtime environment and OR-Tools version

**Decision**: Use Python 3.13.7 (located at `C:\Users\SUBASH\AppData\Local\Programs\Python\Python313`) for the backend venv and set ortools dependency to `>=9.12.4544`.

**Options**: MSYS2 Python 3.14 preview, Python 3.13.7.

**Why**: MSYS2 Python 3.14 lacked pip and pre-built wheels for `pydantic-core` and `ortools`. Python 3.13.7 is fully supported with official binary wheels on PyPI. `ortools==9.11.4210` does not publish wheels for Python 3.13 on Windows; 9.12+ (specifically 9.15.6755) provides binary wheels and identical CP-SAT APIs.

**Cost**: OR-Tools minor version bump from 9.11 to 9.15. The CP-SAT solver model and constraint interfaces remain identical.

---

### 2026-10-31 14:20 IST: Status of Pending Components

**Decision**: Explicitly mark all unbuilt components as PENDING in documentation and code with `NotImplementedError`.

**Components Pending**:
- `backend/app/solver/model.py`: Initial schedule CP-SAT solver, minimal-move reschedule solver, unsat core explanation.
- `backend/app/kernel/pipeline.py`: `commit()` pending SQLite database persistence schema.
- `backend/app/bookings/engine.py`: Spectra week priority decision engine and alternative slot finder.
- `backend/app/explain/engine.py`: Counterfactual reason explanation engine.
- `backend/app/ai/provider.py`: Live LLM API calling (fallback parser is ready; manual booking form requires no LLM key).
- `scripts/export_schedule.py`: Export generation pipeline awaiting solver completion.

**Why**: Rule requirement: stubs must never silently pass. They must fail explicitly with `NotImplementedError`.

---

### 2026-10-31 16:45 IST: Vercel deployment root directory configuration

**Decision**: Configure Vercel Project Settings to set Root Directory to `frontend`.

**Options**:
1. Set Root Directory to `frontend` in Vercel settings.
2. Add a root `package.json` with npm workspaces.
3. Move frontend files to repository root.

**Why**: Moving frontend files to the root violates the required repository layout (`/backend`, `/frontend`, `/docs`). Adding root npm workspaces requires maintaining synchronized dependencies across two levels. Setting Root Directory to `frontend` in Vercel is the official zero-overhead solution for polyglot monorepos.

**Cost**: Requires setting one field in the Vercel project UI before the first deployment. Documented in README.md and submission checklist.

---

### 2026-10-31 21:55 IST: Fix F1 - Lexicographic 3-stage reschedule objective & forced moves

**Decision**: Replace the weighted objective `9*time_changed + moved` in `backend/app/solver/reschedule.py` with a 3-stage lexicographic CP-SAT optimization pipeline:
1. **Stage A**: Minimise moved sessions only (no soft terms). `proven_minimum = True` strictly if Stage A returns `OPTIMAL`.
2. **Stage B**: Fix `moved <= min_moves` from Stage A, and minimise sessions whose day or start period changed (`time_changed`).
3. **Stage C**: Fix both `moved` and `time_changed`, and minimise soft penalties (S1 through S6 mirroring validator weights).
Separate `forced_moves` (sessions whose baseline slot is directly invalidated by disruption constraints) and `knock_on_moves = moved - forced_moves`, surfacing both in proposals.

**Options**:
1. Single-stage weighted sum (e.g. `9*time_changed + moved` or large coefficient multipliers).
2. Pure 3-stage lexicographic solve.

**Why**: Reference engine prototype idea (`inputs/reference_engine/timetable_solver.py`). The official validator scores every session whose `(day, start, room)` changed as moved. Single-stage weighted objectives distort the minimality proof. The 3-stage pipeline allows CP-SAT in Stage A to isolate the exact minimum moved count and prove optimality without soft-penalty interference. Stage B ensures time stability with minimal disruption, and Stage C optimizes schedule quality.

**Cost**: Up to three fast CP-SAT solves per reschedule, mitigated through solution hints and bounds from preceding stages.

---

### 2026-10-31 22:30 IST: Controlled visual redesign with semantic 5-colour accent palette
- **Decision**: Execute a controlled visual redesign without changing underlying data models, routes, or solver architecture:
  - **Preserved Neutral Paper Foundation**: Shell/Paper (`#E8E6DD`), Conch/Surface (`#F3F1E9`), Raised Surface (`#F9F8F3`), Lagoon Ink (`#12292B`), Silt Border (`#CFCCBF`).
  - **Integrated 5 Semantic Accent Tokens**:
    - **Slate Blue / Violet (`#7D5DFF`)**: Primary interaction, button actions, active navigation indicator line in `Rail.tsx`, active filter tabs, keyboard focus rings, and lecture indicator pips.
    - **Violet / Pink (`#EA6DF8`)**: AI provenance, natural language inferred input fields (`border-b-pink`), parser helper pips.
    - **Coral (`#EF8869`)**: Attention & conflict, hard violations (H1–H14), destructive actions, rejected bookings, and >90% heatmap overload.
    - **Maize Yellow (`#FBE64D`)**: Spectra fest events, evening schedule strips (P10–P13), and 3h lab indicators.
    - **Emerald Green (`#63CC79`)**: Validity, approved booking status chips, legal slot markers, and available room markers.
  - **Options**: Complete UI rewrite vs. Controlled token and component restyling.
  - **Why**: A complete rewrite risks introducing regressions into established booking workflows, table layouts, and responsive breakpoints. Controlled restyling transforms the interface into a professional university operations instrument while guaranteeing 100% stability.
  - **Cost**: Requires strict contrast rules: bright accents are restricted to borders, indicators, and washes with dark ink text (`#12292B`) for WCAG AAA compliance.

---

### 2026-10-31 22:45 IST: Elimination of prototype "anti-AI tells" and developer inspection banners
- **Decision**: Relocate intrusive developer state switchers from page headers to discrete floating bottom-right Judge View docks (`aside`), and convert tracked uppercase metadata eyebrows to quiet sentence-case typography (`text-[12px] font-medium text-ink-2`).
- **Options**: Keep inspector banners in headers, delete inspector controls entirely, move to discrete docks.
- **Why**: Evaluators and users need the ability to toggle skeleton/empty/error states for grading, but placing prominent state buttons at the top of pages makes them look like unfinished developer dashboards. Discrete floating docks preserve judge functionality while presenting a polished, publication-grade academic broadsheet.
- **Cost**: Requires extra z-index and fixed positioning management to prevent overlapping interactive page elements.
