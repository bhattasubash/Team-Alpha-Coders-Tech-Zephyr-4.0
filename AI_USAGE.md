# AI Usage and Provenance

## Tools and Models Used

| Tool | Model | What it does in the product | What it helped build | Where prompts live |
|------|-------|-----------------------------|---------------------|--------------------|
| **Antigravity (Build Agent)** | **Gemini 3.8 Flash** | Development pair-programming agent; nothing in runtime production product. | Full implementation: CP-SAT mathematical models, kernel constraint validation, FastAPI routes, Next.js UI, test suites, and documentation. | Interactive pair-programming sessions |
| **Claude (claude.ai)** | **Claude 3.5 Sonnet & Claude 3.7 Sonnet** | Architectural brainstorming; nothing in runtime product. | Conceptual prototypes in `inputs/reference_engine/` exploring CP-SAT formulations and lexicographic optimization during hackathon kickoff. | Team lead exploratory sessions |
| **Groq API (Runtime AI Layer)** | **qwen/qwen3.8-27b, llama-3.3-70b-versatile, openai/gpt-oss-20b, llama-3.1-8b-instant** | Natural language booking parser (`/api/bookings/parse`) & scheduling assistant (`/api/assistant`). Produces structured JSON drafts; falls back to deterministic regex parser if unavailable. | Live runtime NLP extraction & explanation. | `backend/app/ai/provider.py` & `prompts/` |

## Prototype Provenance (`inputs/reference_engine/`)

During the initial architecture phase of the hackathon, the team lead used Claude via the claude.ai interface to generate standalone conceptual prototypes in `inputs/reference_engine/` to explore optimization formulations. These prototypes are **AI-assisted hackathon exploratory prototypes**, which were subsequently adapted, rewritten, unified, and hardened into CIT Scheduler's production architecture:

1. **Three-Stage Lexicographic Reschedule Objective**:
   - Reschedule objective formulated in 3 distinct stages:
     - **Stage A**: Minimise moved sessions only (no soft terms). `proven_minimum = True` strictly if Stage A proves `OPTIMAL`.
     - **Stage B**: Constrain `moved <= A_min`, minimise sessions changing day or start period (`time_changed`).
     - **Stage C**: Constrain both `moved` and `time_changed`, minimise soft penalties (S1 through S6).
   - Direct calculation of `forced_moves` (sessions whose baseline slot is invalidated by disruption) and `knock_on_moves = moved - forced_moves`.

2. **Booking Reservations Before Timetable Generation (`reservations_for_bookings`)**:
   - Booking requests are evaluated against an empty timetable to extract the optimal 22 approved bookings (maximum reachable score 67.0).
   - Teaching-period room slots ($P \le 9$) and mandatory group slots are passed as `blocked_room_slots` and `blocked_group_slots` to `TimetableSolver` and `RescheduleSolver`.
   - Pruning session domains guarantees a deterministic booking score of 67.0 across all solver random seeds.

3. **Series Consistency as Tie-Break**:
   - Series consistency (same room across a recurring event series) is applied purely as a sorting preference among candidate rooms, never causing a rejection or alternative offer.

4. **Two-Phase Timetable Solve**:
   - Phase 1 solves hard constraint feasibility rapidly, then uses the feasible assignment as a CP-SAT solution hint for Phase 2 soft penalty minimization.

## Audit Verification

- **Code Authenticity**: All production code in `backend/app/`, `frontend/src/`, `validator/`, and `tests/` was developed and verified during the Tech Zephyr 4.0 hackathon window.
- **Model Traceability**: Runtime models configured in environment variables (`LLM_MODEL`) and API client handlers match the declared models above.

## What the LLM May Never Decide

The LLM is strictly an untrusted drafting and convenience layer. It must NEVER:
1. Decide whether a schedule, move, or booking is legally valid.
2. Override or assign priority levels to booking requests.
3. Approve, reject, or commit schedule changes or bookings.
4. Modify, write, or delete rows in the persistent store directly.

All changes must pass through the deterministic kernel pipeline: **propose $\to$ validate $\to$ diff $\to$ approve $\to$ commit**.
