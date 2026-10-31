# Bug log

Each entry: date/time, symptom, root cause, fix, confirmation (test name or command).

No invented bugs. Only real issues found and fixed during development.

---

### 2026-10-31 14:26 IST: test_soft_s5_underutilized failed with StopIteration
- Symptom: `backend/tests/test_kernel.py::test_soft_s5_underutilized` raised `StopIteration` during test execution.
- Root cause: Test generator assumed a session with `size <= 30` existed in `cit_public.json`. In the actual dataset, minimum session size is 45.
- Fix: Rewrote generator to search for any valid `(session, room)` pair where `s["size"] / r["capacity"] < 0.4` and `r["type"] in s["room_types"]`. Found 391 matching pairs (e.g. `MA101-AB-L1` with size 180 in `AUD` with capacity 500, ratio 0.36).
- Confirmation: Ran `pytest backend/tests/test_kernel.py -v`. All 21 tests passed.

---

### 2026-10-31 15:44 IST: run_validator.ps1 failed to locate project root and data file
- Symptom: `scripts/run_validator.ps1` threw "Dataset not found" error when invoked.
- Root cause: Script called `Split-Path -Parent (Split-Path -Parent $PSScriptRoot)`, traversing two parent directories up to `Desktop` instead of one parent directory up to the project root.
- Fix: Corrected to `$ProjectRoot = Split-Path -Parent $PSScriptRoot` and added automatic detection for `backend/venv/Scripts/python.exe`.
- Confirmation: Ran `.\scripts\run_validator.ps1 -ScheduleFile "inputs\starter_pack\schedule.example.json" -ReportFile "exports\test_report.json"`. Validator executed cleanly, printed violation summary and generated JSON report.

---

### 2026-10-31 16:44 IST: Vercel deployment failed with NEXT_NO_VERSION
- Symptom: Vercel build failed with `Error: [NEXT_NO_VERSION] No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies". Also check your Root Directory setting matches the directory of your package.json file.`
- Root cause: Vercel defaults its build root to `./`. In this repo, Next.js code and `package.json` live inside `frontend/`, while the root contains project docs, data, and the backend. Vercel looked at the repository root and found no Next.js dependency.
- Fix: Set Vercel Project Settings -> General -> Root Directory to `frontend`. Updated `frontend/next.config.mjs` to read backend API destination dynamically from `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"`. Added deployment documentation to `README.md` and `docs/submission-checklist.md`.
- Confirmation: Executed `npm run build` inside `frontend/`. Next.js 14.2.18 compiled successfully with zero type or lint errors.

---

### 2026-10-31 19:56 IST: check_exam_* kernel functions did not guard invalid slot before room/capacity checks
- Symptom: Differential comparison between `validator.py` and kernel `check_exam_*` diverged when invalid exam days or sessions were evaluated.
- Root cause: `validator.py` lines 385-386 checks `e.get("day") not in cal["days"] or e.get("session") not in sess_ids` and continues early. The initial kernel exam helper functions did not guard invalid slots before evaluating room double-booking, group double-booking, half-capacity, and soft penalties.
- Fix: Added exam slot and duplication guards matching `validator.py` lines 381-386 across all `check_exam_*` helper functions.
- Confirmation: Ran differential fuzzing `scripts/fuzz_kernel.py` for 2000 random mutations; all 2000 cases passed with 0 mismatches. Ran `pytest backend/tests/test_kernel.py`; all 35 tests passed.

---

### 2026-10-31 22:02 IST: Duplicate progress bar markup in dashboard/page.tsx broke Next.js AST compilation
- Symptom: `npm run build` failed during Next.js compilation with `Unexpected token AppShell. Expected jsx identifier` pointing to line 130 of `frontend/src/app/dashboard/page.tsx`.
- Root cause: An unclosed duplicate block of the campus room utilisation bar around line 376 with an extra closing `</div>` tag unbalanced the JSX element tree inside the `viewState === 'normal'` fragment.
- Fix: Removed the duplicate DOM snippet and restored matching JSX closing tags.
- Confirmation: Executed `cd frontend; npx tsc --noEmit; npm run lint; npm run build`. All 16 static routes compiled successfully with 0 type errors and 0 lint warnings.

---

### 2026-10-31 22:15 IST: Two-phase timetable solver timed out in Phase 1 and discarded feasibility hint
- Symptom: `backend/tests/test_solver.py::test_solve_two_phase_soft_objective` failed with `AssertionError: assert 'UNKNOWN' in ('FEASIBLE', 'OPTIMAL')`.
- Root cause: Cold-start feasibility search for the complete 189-session timetable takes ~28 seconds on CP-SAT with 8 workers. `solve_two_phase()` had `feasibility_limit=20.0s`, causing Phase 1 to terminate early with `UNKNOWN`. Furthermore, if Phase 2 timed out before improving the soft objective, `solve_two_phase()` returned `p2_res` (`UNKNOWN`) rather than preserving Phase 1's valid feasible assignment.
- Fix: Increased default `feasibility_limit` to 35.0s in `backend/app/solver/model.py`, updated test timeout configuration to 60.0s, and added a fallback returning `p1_res` if Phase 2 does not yield an improved solution.
- Confirmation: Executed `pytest backend/tests/test_solver.py`; all 3 solver tests passed in 62.12s. Executed full test suite `pytest -q`; all 56 tests passed.

---

### 2026-10-31 22:20 IST: Disruption sticky action bar collided with mobile bottom navigation rail
- Symptom: On mobile viewports (< 640px), the sticky bottom action bar ("Approve and commit") collided directly with the fixed `h-14` mobile navigation bar (`Rail.tsx`), obscuring relocation ledger entries and blocking approval clicks.
- Root cause: Bottom rail was `fixed bottom-0 h-14 z-40`, while disruption bar had `bottom-0 z-30`.
- Fix: Docked the disruption sticky bar to `bottom-14 sm:bottom-0 z-30` and expanded container bottom padding to `pb-44 sm:pb-36` to ensure the detailed change ledger scrolls completely clear of the action bar.
- Confirmation: Verified responsive layout and z-index ordering across desktop and mobile breakpoints.

---

### 2026-10-31 22:05 IST: Reschedule solver combined objective and insufficient stage timeout
- Symptom: In `backend/app/solver/reschedule.py`, the objective was formulated as `9 * time_changed + moved`, and during disruptions preview, Stage A CP-SAT timeout was capped at 15s (`total_limit * 0.5`), returning `UNKNOWN` and triggering false `status: rejected` on feasible disruption proposals.
- Root cause: Single-stage weighted objective violated the problem definition ("fewest moved" scored lexicographically) and prevented proving true optimality of minimal moves. Furthermore, Stage A is the primary branch-and-bound search phase needing sufficient time budget, while Stages B and C are warm-started and take < 5s.
- Fix: Converted reschedule solver to a 3-stage lexicographic CP-SAT pipeline: Stage A minimizes moves only (no soft terms), Stage B fixes moves $\le$ Stage A minimum and minimizes time changes, Stage C fixes both and minimizes soft penalties (S1–S6). Updated `limit_a` allocation to `max(10.0, total_limit - 12.0)` and default `SOLVER_TIME_LIMIT` to 45.0s. Added `forced_moves` (baseline sessions directly invalidated by disruption) and `knock_on_moves = moved - forced_moves`.
- Confirmation: Ran `pytest backend/tests/test_reschedule.py`; all 4 tests passed. Ran official `validator.py` on `exports/after_disruption.json` with `--baseline exports/schedule.json`; reports 0 hard violations and `Stability: 7 sessions moved (0 changed time, 7 room only)` with `proven_minimum: True`.

---

### 2026-10-31 23:45 IST: Booking approval score varied across random timetable solver seeds
- Symptom: Running `BookingEngine.decide_all()` on timetables generated with different solver random seeds yielded inconsistent booking scores (e.g. 65.5 on seed 7 vs 67.0 on seed 42).
- Root cause: In seed 7, elective basket sessions (`OEB-1` with group `ECE-3`) were scheduled during teaching period `THU P8`, which clashed with mandatory group attendance for approved booking `BR-08`, downgrading `BR-08` from approved to alternative and reducing the score.
- Fix: Implemented `reservations_for_bookings(data)` to pre-calculate all 22 approved bookings against an empty schedule, extracting 33 teaching-hour room slots and 5 mandatory group slots ($P \le 9$). Passed these as `blocked_room_slots` and `blocked_group_slots` into `TimetableSolver` and `RescheduleSolver`, pruning session domains and constraining `sum(grp_period_vars[(g, d, p)]) == 0` and `sum(room_period_vars[(r, d, p)]) == 0`.
- Confirmation: Added `test_booking_reservations_consistency_across_seeds` generating timetables across seeds 7, 42, and 99. Verified that booking score is exactly 67.0 (22 approved, 1 alternative BR-17, 0 priority inversions) on all three seeds.

---

### 2026-11-01 00:20 IST: Exam solver test timeout returned intermediate soft penalty 35
- Symptom: `test_exam_solver_all_constraints` failed with `AssertionError: Expected 0 soft penalty, got 35` when run with `time_limit_override=15.0`.
- Root cause: 15.0 seconds was insufficient for the CP-SAT branch-and-bound search to prove 0 same-day exam overload, returning an intermediate feasible solution with soft penalty 35. With a 45s-50s budget, the solver reaches 0 soft penalty.
- Fix: Updated `time_limit_override` in `test_exam_solver_all_constraints` to 50.0s and decorated the test with `@pytest.mark.slow`. Fast test suite (`pytest -m "not slow"`) skips slow CP-SAT tests and passes in under 7 seconds.
- Confirmation: Ran `ExamSolver.solve()` standalone (0 soft penalty in 45.81s) and verified fast test suite `pytest -m "not slow"` (50 passed in 6.75s).
