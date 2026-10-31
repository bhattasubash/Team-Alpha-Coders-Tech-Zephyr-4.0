# CIT Scheduler Handoff Note

- **Status**: Milestone 8 (Persistence and Jobs) fully implemented, tested, and verified.
- **Implemented Work (Milestone 8)**:
  1. **SQLite Database Architecture**: Implemented standard library `sqlite3` persistence with WAL mode, foreign keys, 5000ms busy timeout, and row factory in `backend/app/db/` (`connection.py`, `schema.py`, `repository.py`).
  2. **Relational Schema**: Created 8 persistent tables: `users`, `dataset_state`, `schedule_state`, `exams_state`, `bookings`, `proposals`, `audit_log`, `jobs`.
  3. **Kernel-Mediated State Changes**: Everything that modifies data routes through the kernel repository (`commit_new_schedule`, `save_proposal`, `update_proposal_status`, `log_audit`).
  4. **Background Jobs Engine**: Implemented `backend/app/jobs/` (`runner.py`) running CP-SAT timetable generation and optimization in daemon worker threads with real-time progress and phase tracking (Phase 1: Booking Reservations, Phase 2: Timetable Solve, Phase 3: Kernel Commit).
  5. **Endpoints Wired**:
     - `POST /api/timetable/generate`: Enforces mutual exclusion (HTTP 409 Conflict if active solve), spawns worker thread, returns HTTP 202 Accepted.
     - `POST /api/timetable/optimise`: Optimizes with hints, returns HTTP 202 Accepted.
     - `GET /api/jobs/{id}`: Returns real-time metrics (`phase`, `seconds`, `progress`, `best_soft_penalty`, `solver_status`).
     - `POST /api/admin/reset`: Clears and re-seeds all tables from `data/cit_public.json` and `exports/schedule.json`.
     - `GET /api/timetable`, `GET /api/timetable/all`, `GET /api/export/schedule.json`: Return hydrated assignments from SQLite.
- **Verification Results**:
  - `pytest -m "not slow"`: 53 tests passed in 6.63s.
  - `test_job_lifecycle_concurrency_and_commit`: Verified 202 response, 409 concurrency lock, progress polling, schedule version bump, and official validator check (0 hard violations).
  - Official validator on `exports/schedule.json`: 0 hard violations, 161 soft penalty, 67.0 booking score, 0 exam soft penalty.
  - Official validator on `exports/schedule_after.json`: 0 hard violations, 160 soft penalty, 67.0 booking score, 0 exam soft penalty, stability 14 moves.
  - Frontend: `npm run build` succeeds cleanly across all 15 routes with 0 lint and 0 type errors.
- **Next Step**: Milestone 9 (LLM Assistant and Natural Language Parser).
