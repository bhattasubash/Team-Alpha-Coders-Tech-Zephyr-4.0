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
