# AI Usage and Provenance

## Tools and Models Used

| Tool | Model | What it does in the product | What it helped build | Where prompts live |
|------|-------|-----------------------------|---------------------|--------------------|
| **Antigravity (Build Agent)** | **Gemini 3.8 Flash (High)** | Nothing in runtime product. Development pair-programmer. | Core implementation: CP-SAT models, kernel validation pipeline, API routes, Next.js UI, test suites, documentation. | Interactive IDE sessions |
| **claude.ai** | **Claude 3.5 Sonnet / Claude 3.7 Sonnet** | Nothing in runtime product. Used by team lead. | Strategy, prompt drafting, and verified single-file prototypes in `inputs/reference_engine/`. | Team lead transcripts |
| **Gemini API (Runtime AI Layer)** | **gemini-2.5-flash / gemini-1.5-flash** | Natural language booking parser (`/api/bookings/chat` & `/api/assistant/chat`). Parses human input to structured JSON; falls back to deterministic regex parser if unavailable. | Live runtime assistant and NLP drafting. | `backend/app/nlp/` & `prompts/` |

## Prototype Provenance (`inputs/reference_engine/`)

The following design insights and algorithmic ideas originated in `inputs/reference_engine/` (authored by Claude for the team lead) and were adapted and verified into CIT Scheduler:

1. **Three-Stage Lexicographic Reschedule Objective**:
   - Reschedule objective formulated in 3 stages:
     - Stage A: Minimise moved sessions only (no soft terms). `is_proven_minimum` is true if and only if this stage reaches `OPTIMAL`.
     - Stage B: Constrain `moved <= A_min`, minimise sessions changing day or start period.
     - Stage C: Constrain both, minimise soft penalties (S1..S6).
   - Direct calculation of `forced_moves` (sessions whose baseline slot is invalidated by disruption) and `knock_on_moves = moved - forced_moves`.

2. **Booking Reservations Before Timetable Generation (`reservations_for_bookings`)**:
   - Booking requests are evaluated against an empty timetable to extract the optimal 22 approved bookings (maximum reachable score 67.0).
   - Teaching-period room slots ($P \le 9$) and mandatory group slots are passed as `blocked_room_slots` and `blocked_group_slots` to `TimetableSolver` and `RescheduleSolver`.
   - Guarantees deterministic booking score of 67.0 regardless of solver random seeds.

3. **Series Consistency as Tie-Break**:
   - Series consistency (same room across a recurring event series) is applied purely as a sorting preference among candidate rooms, never causing a rejection or alternative offer.

4. **Two-Phase Timetable Solve**:
   - Phase 1 solves hard constraint feasibility rapidly, then uses the feasible assignment as a CP-SAT solution hint for Phase 2 soft penalty minimization.

## Team Correction Table

| Date | Person | Tool | Model Recorded | Correction Needed | Verified |
|------|--------|------|----------------|-------------------|----------|
| 2026-10-31 | Team Lead | claude.ai | Claude 3.5 Sonnet | Prototypes in inputs/reference_engine/ | Yes |
| 2026-10-31 | Backend / Agent | Antigravity | Gemini 3.8 Flash (High) | Verified exact Antigravity model | Yes |

## What the LLM May Never Decide

The LLM is strictly an untrusted drafting and convenience layer. It must NEVER:
1. Decide whether a schedule, move, or booking is legally valid.
2. Override or assign priority levels to booking requests.
3. Approve, reject, or commit schedule changes or bookings.
4. Modify, write, or delete rows in the persistent store directly.

All changes must pass through the deterministic kernel pipeline: propose -> validate -> diff -> approve -> commit.
