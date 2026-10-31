# CIT Scheduler Handoff Note

- **Status**: Fixes F2–F7 and New Items N1–N4 fully implemented, tested, and verified.
- **Implemented Work (F2–F7 & N1–N4)**:
  1. **F2 (Booking Reservations)**: Implemented `reservations_for_bookings(data)` reserving 33 teaching-hour room slots and 5 mandatory group slots against an empty timetable. Enforced in `TimetableSolver` and `RescheduleSolver` via domain pruning and CP-SAT constraints. Test `test_booking_reservations_consistency_across_seeds` verified booking score is deterministically `67.0` (22 approved, 1 alternative BR-17, 0 hard violations, 0 inversions) across seeds 7, 42, 99. Series consistency maintained purely as a tie-break.
  2. **N1 (Exports Pipeline)**: Updated `scripts/export_schedule.py` to write both `exports/schedule.json` and `exports/schedule_after.json` using the real solver pipeline. Deleted obsolete `exports/after_disruption.json`.
  3. **N2 (Proof Summary Endpoint)**: Implemented `GET /api/proof/summary` (Admin only) parsing real metrics from `docs/fuzz-report.md`, `docs/redteam-report.md`, `ortools.__version__`, and `exports/validator_report.json`. Returns `null` for unrun items; never returns default numbers.
  4. **N3 (Scratch Cleanup)**: Deleted `backend/scratch` from git tracking (`git rm --cached -r backend/scratch`) and added `backend/scratch/` to `.gitignore`. Fallback logic updated across tests and routes to read `exports/schedule.json`.
  5. **F4 & N4 (Auth & Profiles)**: `SECRET_KEY` env var enforced with production checks. Mapped profiles for all 5 demo accounts (`admin@cit.edu`, `dean@cit.edu`, `coordinator@cit.edu`, `faculty@cit.edu`, `club@cit.edu`) returned from `/api/auth/me`. Self-approval blocked on user requests (`SELF_APPROVAL`), system-generated proposals approvable by any Admin. Proposer/approver logged in audit log. Documented in `DECISIONS.md`.
  6. **F5 (Backend Dockerfile & Health)**: Added `backend/Dockerfile` with Python 3.13 slim, dependencies, uvicorn on `$PORT`, and healthcheck. `/api/health` returns status, git_commit, solver_available, llm_configured, dataset_id, and uptime.
  7. **F6 (Slow Tests & Makefile)**: Marked CP-SAT tests taking > 5s with `@pytest.mark.slow`. Added `make test` (fast, runs 50 tests in 4.87s) and `make test-all` (57 tests).
  8. **F7 & F3 (Docs Honesty & AI Provenance)**: Fixed validator commands and tech stack in `README.md` (Python 3.13, OR-Tools 9.15). Cleared outdated limitations. Documented exact model Gemini 3.8 Flash (High) and Claude 3.5/3.7 Sonnet provenance in `AI_USAGE.md` and `DECISIONS.md`.
- **Validation Results**:
  - `exports/schedule.json`: 0 hard violations, soft penalty 161, booking score 67.0, exam soft penalty 0.
  - `exports/schedule_after.json`: 0 hard violations, soft penalty 160, booking score 67.0, exam soft penalty 0.
  - Stability: 14 sessions moved (1 changed time, 13 room only), stability penalty 0.
  - Frontend: `npm run build` passing cleanly across all 15 static routes with 0 lint and 0 type errors.
- **Next Step**: Await user review before starting Milestone 8 (Persistence and Jobs).
