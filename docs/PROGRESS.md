# Project progress

Last updated: 2026-10-31 16:35 IST

## 1. What is done

### Milestone 0: Housekeeping
- Updated AI_USAGE.md with true tool usage: Gemini 3.8 Flash coding agent in Antigravity, Claude via claude.ai used by the team lead for strategy and prompt drafting. Added verification table for team review.
- Updated DECISIONS.md: corrected 48-hour build references to 24-hour build, updated validator decision to reference exact semantics.
- Created docs/validator-semantics.md detailing exact validator behaviour: floor division for exam seats, role category caps, cancellation status rules, and S4 basket counting passes.
- Updated .gitignore with all required patterns: venv, node_modules, __pycache__, .env, *.db, .next, exports/*_report.json, dist, and cache folders.
- Removed duplicate root copies of Problem statement.pdf and Strategy.md after verifying identical SHA256 hashes with inputs/Problem_statement.pdf and inputs/STRATEGY.md.
- Diagnosed scripts/fuzz_kernel.py failure (see diagnosis section below).
- Audited codebase and created docs/constraints-map.md mapping H1-H14, B1-B3, E1-E2, and S1-S6 across validator.py, kernel validate.py, and test_kernel.py with concrete DONE, PARTIAL, and MISSING status.

## 2. Diagnosis of scripts/fuzz_kernel.py

Running `python scripts/fuzz_kernel.py` previously exited with code 1:
- Root cause: line 49 checks `if not SCHEDULE_PATH.exists(): sys.exit(1)`. The file `exports/schedule.json` has not been generated yet because the solver has not been run.
- Stub status: `mutate_schedule`, `run_kernel_check`, and `run_validator_check` are stubs that return mock dicts. Real differential fuzzing will be implemented in Milestone 2b.

## 3. Unfinished functions raising NotImplementedError

The following functions are intentionally incomplete stubs and raise `NotImplementedError`:

1. `backend/app/solver/model.py`:
   - `ScheduleSolver.solve()`: CP-SAT initial timetable solver.
   - `ScheduleSolver.solve_reschedule()`: Minimal-move reschedule solver.
   - `ScheduleSolver.explain_unsat()`: Unsat core conflict explainer.
2. `backend/app/kernel/pipeline.py`:
   - `commit()`: Database persistence layer.
3. `backend/app/bookings/engine.py`:
   - `BookingEngine.decide_all()`: Spectra week booking decision engine.
   - `BookingEngine.find_alternative()`: Legal alternative slot search.
4. `backend/app/explain/engine.py`:
   - `ExplanationEngine.explain_session()`: Session counterfactual reason generator.
   - `ExplanationEngine.explain_booking()`: Booking counterfactual reason generator.
5. `backend/app/ai/provider.py`:
   - `LLMClient._call_openai()`: External OpenAI client call.
   - `LLMClient._call_gemini()`: External Gemini client call.
6. `backend/app/api/timetable.py`:
   - `get_timetable()`: Timetable view endpoint.
   - `get_group_timetable()`: Group timetable view endpoint.
   - `trigger_solver()`: Solver invocation endpoint.
   - `propose_change()`: Change proposal endpoint.
   - `approve_proposal()`: Change approval endpoint.
7. Scripts exiting on missing components:
   - `scripts/fuzz_kernel.py`: Exits with code 1 until exports/schedule.json exists and real differential fuzzing is built.
   - `scripts/export_schedule.py`: Exits with code 1 until the CP-SAT solver is implemented.

## 4. What is next

Milestone 1: API CONTRACT ONLY (so the frontend can start)
- Write backend/app/api/schemas.py (pydantic models).
- Update docs/api.md.
- Endpoints without logic return HTTP 501 with standard error format:
  `{"error": {"code": "...", "message": "...", "details": [...]}}`
- Expose /openapi.json and configure CORS from environment variable.
- Implement required roles: admin, department_coordinator, faculty, club.
- Test endpoints with pytest, verify openapi.json loads and returns 501 for unbuilt endpoints.

## 5. Exact commands to resume

```powershell
# Activate venv / run checks
backend\venv\Scripts\pytest backend\tests
backend\venv\Scripts\ruff check backend\app backend\tests
```
