# Project progress

Last updated: 2026-10-31 22:10 IST

## 1. What is done

### Fix F1: Lexicographic 3-stage reschedule objective & forced moves tracking
- Refactored `backend/app/solver/reschedule.py` to replace weighted sum `9*time_changed + moved` with a 3-stage lexicographic CP-SAT optimization pipeline:
  - Stage A: Minimises moved sessions only (no soft terms), proving optimality (`is_proven_minimum = True`).
  - Stage B: Fixes moved $\le$ min from Stage A, and minimises sessions with changed day or period.
  - Stage C: Fixes moved and time changes, and minimises soft penalties (S1–S6).
- Implemented `compute_forced_moves()`, isolating baseline sessions directly invalidated by disruptions, and computed `knock_on_moves = moved - forced_moves`.
- Extended `Proposal` schema in `backend/app/api/schemas.py` and pipeline to surface `forced_moves` and `knock_on_moves`.
- Tested on `data/sample_disruption.json`: confirmed 0 hard violations, `forced_moves = 7`, `knock_on_moves = 0`, and official validator reports:
  `Stability: 7 sessions moved (0 changed time, 7 room only)` with `proven_minimum: True`.
- All 4 tests in `backend/tests/test_reschedule.py` passing.

### Milestone 0: Housekeeping
- Updated AI_USAGE.md with true tool usage: Gemini 3.8 Flash coding agent in Antigravity, Claude via claude.ai used by the team lead for strategy and prompt drafting. Added verification table for team review.
- Updated DECISIONS.md: corrected 48-hour build references to 24-hour build, updated validator decision to reference exact semantics.
- Created docs/validator-semantics.md detailing exact validator behaviour: floor division for exam seats, role category caps, cancellation status rules, and S4 basket counting passes.
- Updated .gitignore with all required patterns: venv, node_modules, __pycache__, .env, *.db, .next, exports/*_report.json, dist, and cache folders.
- Removed duplicate root copies of Problem statement.pdf and Strategy.md after verifying identical SHA256 hashes with inputs/Problem_statement.pdf and inputs/STRATEGY.md.
- Diagnosed scripts/fuzz_kernel.py failure.
- Audited codebase and created docs/constraints-map.md mapping H1-H14, B1-B3, E1-E2, and S1-S6 across validator.py, kernel validate.py, and test_kernel.py.

### Milestone 1: API contract only
- Created backend/app/api/schemas.py defining Pydantic models for all entities: Auth, Meta, Timetable, Jobs, Validation, Manual scheduling, Rooms, Exams, Bookings, Disruptions, Proposals, Explain, Assistant, Dashboard, Admin, and Health.
- Implemented route endpoints in backend/app/api/routes.py for all specified paths with proper method, role dependencies, request models, and response models.
- Endpoints without business logic raise NotImplementedError, which is transformed into HTTP 501 with the standardized error envelope: `{"error": {"code": "...", "message": "...", "details": [...]}}`.
- Standardized error handlers in backend/app/main.py for NotImplementedError (501), StarletteHTTPException (401, 403, 404, 501), and RequestValidationError (422).
- Configured CORS from environment variable CORS_ORIGINS with comma-separated list parsing.
- Exposed /openapi.json at the application root and updated docs/api.md with complete API documentation.
- Created backend/tests/test_api_contract.py with 9 comprehensive tests covering OpenAPI schema availability, health checks, authentication, role authorization, 501 error envelope structure, 404 errors, and 422 input validation errors.

### Milestone 2: Kernel parity with the official validator
- Implemented all remaining constraint rules in backend/app/kernel/validate.py:
  - H13: booking placement checks (duration, allowed uses, room type, capacity, needs, window, room unavailability, room busy, mandatory groups).
  - B1: booking status and duplicate decision checks.
  - B2: session overrides in fest week and week-7 timetable validation.
  - B3: cancelled booking checks.
  - Priority inversion detection across non-cancelled rejected vs approved bookings.
  - E1: exam scheduling (unknown exam, duplicate exam, invalid slot, unscheduled exam).
  - E2: exam room allowed uses.
  - Exam H3: group double-booking in exam slots.
  - Exam H4: room double-booking in exam slots.
  - Exam H5: room capacity floor division seats (capacity // 2) >= exam size.
  - Exam soft penalty: 5 points per extra same-day exam for a student group.
  - Full validate_schedule function matching official validator.run output structure and violation deduplication.
- Added dedicated unit tests in backend/tests/test_kernel.py for every rule (45 total tests passing across test suite).
- Implemented scripts/fuzz_kernel.py differential fuzzer: executed 2000 randomized mutation cases comparing kernel validate_schedule against official validator.run.
- Achieved 100% agreement: 0 mismatches across all 2000 cases. Generated docs/fuzz-report.md.
- Updated docs/constraints-map.md with 24/24 rules marked DONE.
- Logged exam slot guard bug in BUGS.md.

### Milestone 3: Base timetable solver
- Performed full dataset domain analysis:
  - 189 sessions, 27 rooms, 40 faculty, 14 student groups, 62 courses.
  - 9 basket sessions across 3 slots (OEB-1, OEB-2, OEB-3) with uniform duration 1.
  - 0 sessions with fixed_slot in base dataset.
  - 20 sessions requiring accessible rooms.
  - Student group daily hours range from 3.0 to 4.2 hours per day across Monday through Friday.
  - 0 empty session domains (minimum legal triples 9, average 477.7).
- Implemented domain pruning in `backend/app/solver/domain.py` respecting period range P1-P9, lunch break gap, lab start periods P2 and P6, room type matching, room capacity >= session size, accessibility requirements, room unavailability, faculty unavailability, and fixed slots.
- Implemented CP-SAT formulation in `backend/app/solver/model.py`:
  - Boolean decision variables `x[s, d, t, r]` over pruned domains.
  - Basket synchronization booleans `b_var[b_id, d, t]` constraining all sessions in a basket slot to identical day and start period.
  - Non-overlapping room usage across time intervals.
  - Faculty single-session at any time and daily hours limit (`max_hours_per_day`).
  - Student group single-event at any time with basket deduplication.
  - S1-S6 soft objective terms mirroring validator soft scoring.
  - Disabled automorphism symmetry presolve (`symmetry_level = 0`) to resolve presolve stall across identical classrooms.
- Sub-step 3A: Executed feasibility solve. Written temporary schedule to `backend/scratch/schedule_feasibility_3a.json`. Official validator confirmed 0 hard violations on timetable sessions.
- Sub-step 3B: Executed two-phase solve with hint warm-starting. Written temporary schedule to `backend/scratch/schedule_soft_3b.json`. Official validator confirmed 0 hard violations and total soft penalty 69 (S1: 6, S2: 34, S3: 3, S4: 15, S5: 0, S6: 11).
- Added comprehensive unit tests in `backend/tests/test_solver.py` for domain pruning, feasibility solve, and two-phase soft optimization.

### Milestone 4: Exams
- Implemented CP-SAT exam solver in `backend/app/solver/exams.py` with `ExamSolver`:
  - Schedules all 41 exams across the 12 exam slots in `calendar.exam_week` (MON-SAT, AM/PM).
  - Constrained to rooms with `"exam"` in `allowed_uses`, using integer floor division `capacity // 2` for exam seating.
  - Formulated hard constraints for single exam placement, room capacity coverage, room non-overlap (H4), and student group non-overlap (H3).
  - Formulated soft objective to minimize student groups taking multiple exams on the same day (5 penalty points per extra same-day exam).
  - Included secondary objective for room seat compactness to avoid assigning redundant rooms.
- Achieved optimal solution in 1.8 seconds:
  - 0 hard violations on official `validator.check_exams` (E1: 0, E2: 0, H3: 0, H4: 0, H5: 0).
  - 0 exam soft penalty points (every student group has at most 1 exam per day).
  - Outperformed naive round-robin baseline (which incurred 125 soft penalty points).
- Added comprehensive test suite in `backend/tests/test_exams.py` validating all constraints against the official validator.

### Milestone 5: Spectra week bookings
- Analyzed 25 booking requests and multi-day `series_id` sets (`SER-DANCE` 5 days in OAT, `SER-ROBOWARS` 2 days in OAT).
- Implemented `BookingEngine` in `backend/app/bookings/engine.py`:
  - `effective_category`: applies role category caps (e.g., club capped to `club_event`, faculty capped to `guest_lecture`).
  - `outranks`: strict priority comparator matching official validator (category priority index followed by `submitted_at` timestamp).
  - Pass 1: Greedy placement in requested windows for highest priority requests.
  - Pass 2: Displacement pass for `institute_event` requests moving regular sessions into `session_overrides` only if a conflict-free legal alternative slot exists.
  - Fallback: Legal alternative slot search across P1-P13 Monday through Friday.
  - Rejection handling: Rejects cancelled bookings (`BR-04` from `data["cancellations"]`) and oversized requests (`BR-09` 1,200 attendance) with concrete reason strings.
  - Preserved series room consistency across all days of multi-day bookings.
- Verified against official `validator.check_bookings`:
  - Hard violations: 0 (B1: 0, B2: 0, B3: 0, H13: 0).
  - Priority inversions: 0.
  - Cancelled bookings approved: 0.
  - Booking score: 63.0 / 70 max.
  - Decisions by role:
    - `admin`: 4 approved, 1 alternative offered, 0 rejected (5 total).
    - `club`: 12 approved, 1 alternative offered, 2 rejected (15 total).
    - `department_coordinator`: 2 approved, 1 alternative offered, 0 rejected (3 total).
    - `faculty`: 2 approved, 0 alternative offered, 0 rejected (2 total).
- Added comprehensive unit tests in `backend/tests/test_bookings.py`.

### Milestone 6: Export & verify (Baseline schedule assembled and verified)
- Implemented `scripts/export_schedule.py` integrating TimetableSolver, ExamSolver, and BookingEngine into an end-to-end export pipeline.
- Exported complete schedule to `exports/schedule.json`:
  - `dataset_id`: `cit-public-v1`
  - `team`: `CIT Scheduler` (configurable via `TEAM_NAME` environment variable)
  - `sessions`: 189 regular academic sessions
  - `exams`: 41 exams scheduled across 12 exam slots with valid rooms
  - `fest_week`: 25 booking decisions (20 approved, 3 alternatives, 2 rejected)
- Verified with the official validator CLI:
  `python validator/validator.py --data data/cit_public.json --schedule exports/schedule.json`
- Real validator results:
  - Hard violations: **0** across all rules (`H1..H14: 0, B1..B3: 0, E1..E2: 0, H3-H5: 0`)
  - Priority inversions: **0**
  - Cancelled bookings approved: **0**
  - Timetable soft penalty: **69** (`S1: 6, S2: 34, S3: 3, S4: 15, S5: 0, S6: 11`)
  - Exam soft penalty: **0**
  - Bookings score: **63.0 / 70 max**
- Baseline schedule is completely verified and ready for frontend integration.

### Milestone 7: Disruptions & rescheduling engine (Minimal-move solver & proposals pipeline)
- Implemented minimal-move CP-SAT reschedule solver in `backend/app/solver/reschedule.py`:
  - Decision variables over pruned domains with warm starting from baseline schedule.
  - Multi-tiered stability objective minimizing `9 * time_changed + moved`, ensuring strict preference for room-only moves over schedule time changes.
  - Returns `RescheduleResult` with `is_proven_minimum` flag, move counts (`time_changed_count`, `room_only_changed_count`), and conflict explanations on infeasibility.
- Evaluated on official `CrunchWeek_StarterPack/examples/sample_disruption.json` (F07 conference travel Monday, CR-102 room water leak closure, and added CS202-T2 session):
  - Solved to optimality (`OPTIMAL`) in 14.5 seconds.
  - Moved exactly 7 sessions (`CS101-C-L2`, `EE201-L2`, `EE201-T1`, `EE301-L1`, `HS101-A-L1`, `HS101-A-L2`, `OE303-L1`).
  - Zero time changes: all 7 moves are room-only changes, keeping student and faculty class times completely undisturbed.
  - Evaluated with official `validator.run(..., baseline=base_sched)`: 0 hard violations, and exact stability match with validator output (`stability.sessions_moved == 7`).
- Implemented proposal pipeline and storage in `backend/app/kernel/pipeline.py`:
  - `propose_reschedule`: Creates and stores a proposal with typed moves (`session_id`, `from`, `to`, `kind: time|room_only`), `moved_count`, `proven_minimum: bool`, `infeasible: bool`, and conflict diagnostics.
  - `approve_proposal_pipeline`: Enforces admin role requirement and strict self-approval prevention (HTTP 403 / `SELF_APPROVAL` error if proposer attempts to approve their own proposal).
  - `reject_proposal_pipeline`: Updates proposal status to `rejected` with plain text audit reason.
- Connected API routes in `backend/app/api/routes.py`:
  - `POST /api/disruptions/preview`
  - `GET /api/proposals`
  - `POST /api/proposals/{id}/approve`
  - `POST /api/proposals/{id}/reject`
- Added comprehensive unit and integration tests in `backend/tests/test_reschedule.py` (4 tests covering solver, infeasibility explanation, proposal lifecycle and self-approval prevention, and authenticated REST API endpoints).

## 2. Unfinished functions raising NotImplementedError

The following functions are intentionally incomplete stubs and raise `NotImplementedError`:

1. `backend/app/api/routes.py`:
   - Endpoints without business logic returning 501 (get_meta, get_timetable, get_timetable_all, generate_timetable, optimise_timetable, get_job_status, get_validation_report, get_official_validation, get_legal_slots, move_session, get_free_rooms, get_exams, generate_exams, get_bookings, parse_booking, create_booking, cancel_booking, decide_bookings, get_booking_decision, explain_session, explain_booking, ask_assistant, get_dashboard, reset_database, upload_dataset, export_schedule).
2. `backend/app/kernel/pipeline.py`:
   - `commit()`: Database persistence layer.
3. `backend/app/explain/engine.py`:
   - `ExplanationEngine.explain_session()`: Session counterfactual reason generator.
   - `ExplanationEngine.explain_booking()`: Booking counterfactual reason generator.
4. `backend/app/ai/provider.py`:
   - `LLMClient._call_openai()`: External OpenAI client call.
   - `LLMClient._call_gemini()`: External Gemini client call.

## 3. What is next

Milestone 8: EXPLAINABILITY ENGINE & FACULTY ASSISTANT
- Implement `ExplanationEngine` in `backend/app/explain/engine.py`:
  - `explain_session(session_id)`: Diagnostic search over all (day, period, room) triples; reports why illegal slots are rejected (faculty unavailable, group clash, room unavailable, capacity, accessibility, lab start) with templated plain text counterfactual explanations.
  - `explain_booking(booking_id)`: Audit trail explaining why a fest week booking was approved, placed in an alternative slot, or rejected (attendance capacity, priority rank, cancellation, displacement).
- Implement Faculty Assistant in `backend/app/ai/assistant.py`:
  - Query parser for schedule questions and schedule change requests into typed Proposal objects without hallucination.
- Wire `/api/explain/session/{id}`, `/api/explain/booking/{id}`, and `POST /api/assistant`.
- Verify with unit tests in `backend/tests/test_explain.py`.

## 4. Exact commands to resume

```powershell
# Run all tests
backend\venv\Scripts\pytest backend\tests

# Run ruff check
backend\venv\Scripts\ruff check backend\app backend\tests

# Run differential fuzzing
backend\venv\Scripts\python.exe scripts/fuzz_kernel.py
```
