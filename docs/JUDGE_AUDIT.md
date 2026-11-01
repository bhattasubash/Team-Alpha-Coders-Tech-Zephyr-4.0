# Independent Judge & QA Audit Report

**Project**: CIT Scheduler (Team Alpha Coders)  
**Evaluator**: Independent Hackathon Judge & QA Lead  
**Audit Date**: 2026-11-01 05:45 IST  
**Hackathon Window**: 12:00 IST 31 Oct 2026 to 12:00 IST 01 Nov 2026  
**Audited Git SHA**: `fec85bf530ac8c741c97bc205f14e3d4bbccb05e` (Head of `main`)  
**Deployed Frontend URL**: `https://team-alpha-coders-tech-zephyr-40.vercel.app/`  
**Deployed Backend URL**: `https://cit-scheduler-backend.onrender.com/`  
**Deployed Commit via `/api/health`**: `null` (Environment variable `GIT_SHA` unset on Render)

---

## 1. Official Judging Scorecard

| # | Criterion | Max | Awarded | One-Line Reason |
|---|-----------|:---:|:-------:|-----------------|
| D1 | **Correctness** | 25 | **16** | Baseline and reschedule exports pass official validator with 0 hard violations, but in-app `/api/timetable/generate`, `/api/exams/generate`, and `/api/bookings/decide` fail with 500/timeout on live host. |
| D2 | **Rescheduling** | 15 | **14** | 30/30 random disruption scenarios achieved 0 hard violations with proven minimal moves (0 knock-on); self-approval properly guarded; docked 1 mark because Vercel UI diff is hardcoded mock data. |
| D3 | **Optimisation** | 10 | **4** | Validated schedule soft penalty is 161 (vs reference 67; >80 is weak range); live "Keep optimising" crashes because hint parser checks `s["id"]` instead of `s["session_id"]`. |
| D4 | **Use of AI** | 15 | **7** | Adversarial schema defense works, but redteam suite is an unexecuted stub, fallback parser fails on "6 to 8 pm" and "after lunch", and deployed backend routes all prompts to fallback. |
| D5 | **Booking Decisions** | 10 | **7** | Attained maximum possible booking score of 67.0 with 0 priority inversions and clean reason strings, but `/api/bookings/{id}/cancel` and `/api/bookings/decide` crash with 500 on live backend. |
| D6 | **Usability & Dashboard** | 10 | **5** | Room search and timetable viewing work smoothly, but deployed frontend auto-logs-in as admin, displays static hardcoded metrics, and priority reordering is browser-local only. |
| D7 | **UI & Design** | 10 | **6** | Distinctive academic aesthetic with good responsive layout at 1440/1024/768/390/360px, but 6 Lighthouse contrast failures (ratio 1.06), missing select labels, and 404 favicon. |
| D8 | **Code & Docs** | 5 | **3** | Full 70-test suite passes and 5000 fuzzer cases match, but 3D model/campus map are undeclared in AI_USAGE/THIRD_PARTY, `.env.example` has wrong var names, and repo lacks LICENSE. |
| | **TOTAL** | **100** | **62** | **Overall Grade: 62 / 100** |

- **Judge Confidence**: **HIGH** (All scores verified by executing real HTTP requests, differential fuzzer, solver scripts, and Chrome DevTools audits against both deployed hosts and local environment).
- **Score if all P0 and P1 defects are fixed**: **88 / 100** (+26 marks recoverable within ~4.5 hours of targeted fixes).
- **Disqualification Risk**: **MEDIUM-HIGH**
  - *Risk Factor 1*: Deployed Vercel frontend has empty `NEXT_PUBLIC_API_URL`, causing it to serve completely disconnected static mock data from Next.js internal routes instead of calling the live Render backend. If judged as deployed, the disconnected mock frontend risks disqualification under Rule A6.
  - *Risk Factor 2*: Render free-tier backend sleeps after 15 minutes of inactivity (cold start 50+ seconds). If a judge accesses the backend during sleep, health checks time out.
  - *Risk Factor 3*: Auto-deploy is currently enabled on Vercel and Render. Any post-freeze commit before 12:00 IST will trigger an automated deployment.

---

## 2. Part A: Disqualification Audit

| Check | Item | Status | Evidence File / Command | Details & Findings |
|---|---|:---:|---|---|
| **A1** | Repo public without login | **PASS** | `docs/judge_evidence/task-100.log` | `https://github.com/bhattasubash/Team-Alpha-Coders-Tech-Zephyr-4.0` returns HTTP 200 OK without authentication. |
| **A2** | First commit after start, authors, commit size | **FAIL** | `git log --format="%H %ai %an <%ae>"` | First commit at 2026-10-31 16:29:45 IST (4.5h after start). **FLAGGED**: Author is solely `Subash <bhattasubash970@gmail.com>` (33 commits), other team members (Bilal, Nikhil, Tahir) have 0 commits. Two mega-commits exceed 80 files: `ebe55a5` (136 files) and `40166dd` (151 files). |
| **A3** | No commits after deadline | **PASS** | `git log -1 --format="%ai"` | Latest commit: `2026-11-01 05:11:42 +0530` (6 hours 48 minutes before 12:00 IST deadline). |
| **A4** | Live frontend & backend up, host sleep check | **FAIL** | `scripts/judge/test_deployed_auth.py` | Both hosts respond (`/api/health` 200 OK), but Render free instance sleeps after 15m (cold start ~50s). Vercel frontend is NOT connected to Render backend (rewrites disabled due to missing `NEXT_PUBLIC_API_URL`). |
| **A5** | Demo accounts log in, Reset button works | **FAIL** | `docs/judge_evidence/deployed_auth_audit.json` | All 5 demo accounts log in via backend API (`admin@cit.edu`, `dean@cit.edu`, `coordinator@cit.edu`, `faculty@cit.edu`, `club@cit.edu`). However, Vercel frontend `/api/admin/reset` is a hardcoded stub returning a static string without resetting state. |
| **A6** | No fabricated results | **FAIL** | `frontend/src/app/api/proof/summary/route.ts`<br>`frontend/src/lib/server-data.ts`<br>`frontend/src/app/admin/proof/page.tsx` | **CRITICAL VIOLATION**: Multiple fabricated results discovered:<br>1. `/api/proof/summary` hardcodes `fuzz_cases: 10000` and `redteam_pass_rate: 100.0` (actual red-team was an unexecuted stub with 0 passed).<br>2. `server-data.ts` hardcodes `verification_time_ms: 124` and `campus_utilization: 42.8`.<br>3. `admin/proof/page.tsx` hardcodes soft penalty counts (S2=18, S5=12, total 48) while real validator output is 161 (S2=110, S5=7). |
| **A7** | `exports/schedule.json` & `schedule_after.json` valid | **PASS** | `docs/judge_evidence/schedule_rerun.json`<br>`docs/judge_evidence/schedule_after_rerun.json` | Both files exist, generated via `scripts/export_schedule.py`. Re-run generated new valid schedules with 0 hard violations and 67.0 booking score. |
| **A8** | No undeclared AI / assets | **FAIL** | `frontend/public/images/campus-venue-map.png`<br>`frontend/public/models/assistant.glb` | Gemini 3.8 Flash, Claude 3.5 Sonnet, and Groq are declared in `AI_USAGE.md`. However, `campus-venue-map.png` (isometric illustration) and `assistant.glb` (3D character model) are NOT declared in `AI_USAGE.md`, and their licensing is missing from `THIRD_PARTY.md`. |
| **A9** | No secrets in tree / git history, `.env.example` accurate | **FAIL** | `git log -p`<br>`backend/app/solver/config.py` | Full git history has 0 leaked API keys (all use `os.getenv`). `.gitignore` properly excludes `.env` and `*.db`. However, `.env.example` has broken variable names (`SOLVER_TIME_LIMIT_SECONDS` instead of `SOLVER_TIME_LIMIT`, `DATABASE_URL` instead of `DATABASE_PATH`, missing `CORS_ORIGINS`, `SOLVER_NUM_WORKERS`, `ENV`). |
| **A10** | Organiser files unmodified | **PASS** | `Get-FileHash validator/validator.py`<br>`Get-FileHash data/cit_public.json` | Hashes match starter pack exactly:<br>`validator.py`: `F02733B382FA111E89CD6BB261E185AE57DA6E41795F094B96CAB1575D6EE144`<br>`cit_public.json`: `8351362143097F1A0D80CE91F31BD1F2D77BD7E738F8701D48AD28FDF64BA8DD`. |
| **A11** | No bought template or pre-hackathon code | **PASS** | `frontend/package.json`<br>`docs/judge_evidence/pytest_full_run.txt` | Custom domain components built specifically for CIT dataset. No commercial UI kit (MUI, AntD). MIT / Apache dependencies only. No root LICENSE file exists. |
| **A12** | 5-minute video checklist | **NOT TESTED** | Human video recording required | Required shot checklist documented below in Section 5. |

---

## 3. Part B: Requirements Coverage (Section 2 & Roles)

| Requirement | Endpoint(s) | UI Screen | Test Evidence | Status | Details / Defect Found |
|---|---|---|---|:---:|---|
| **Timetable generation** | `POST /api/timetable/generate`<br>`GET /api/jobs/{id}` | `/timetable`<br>`/dashboard` | `docs/judge_evidence/task-448.log` | **PARTIAL** | Backend solver works locally (35s feasibility), but on deployed Render host, job times out after 38s with status `FAILED` due to 35s CPU limit on throttled instance. |
| **Timetable views** (Group, Faculty, Room) | `GET /api/timetable` | `/timetable` | `docs/judge_evidence/screens/timetable_1440.png` | **DONE** | Full filtering by 14 student groups, 40 faculty members, and 27 rooms with hydrated course and instructor metadata. |
| **Manual scheduling & constraint check** | `GET /api/sessions/{id}/legal-slots`<br>`POST /api/sessions/{id}/move` | `/timetable` | `docs/judge_evidence/parity_placement_1500.json` | **PARTIAL** | `what_blocks` checker falsely marks Period 5 as lunch violation (22 false negatives), misses H11/H12/H13 (11 false positives), and `POST /api/sessions/{id}/move` crashes with 500 (`log_audit` bug). |
| **Free room search** | `GET /api/rooms/free` | `/rooms` | Verified via HTTP call (`/api/rooms/free?day=THU&period=6`) | **DONE** | Real-time filtering by day, period, duration, room type, minimum capacity, and wheelchair accessibility. |
| **Midsem exam scheduling** | `GET /api/exams`<br>`POST /api/exams/generate` | `/exams` | `backend/tests/test_exams.py` | **PARTIAL** | Optimal CP-SAT exam schedule exists (0 hard violations, 0 same-day soft penalty), but `POST /api/exams/generate` crashes with 500 on live host due to `log_audit` signature mismatch. |
| **Spectra week bookings engine** | `GET /api/bookings`<br>`POST /api/bookings/decide`<br>`GET /api/bookings/{id}/decision` | `/bookings` | `exports/schedule.json` | **PARTIAL** | Pre-solved baseline achieves 67.0 / 67.0 max score with 0 priority inversions and concrete reasons, but live `POST /api/bookings/decide` crashes with 500 on live host (`log_audit` bug). |
| **Plain-language booking parser** | `POST /api/bookings/parse` | `/bookings/new` | `docs/judge_evidence/property_time_resolver.json` | **PARTIAL** | Fallback regex parser operates without network call, but live Groq key is inactive on Render host, and fallback parser fails on "6 to 8 pm" (returns P10-P12) and "after lunch" (returns P10-P12). |
| **Booking submission & cancellation** | `POST /api/bookings`<br>`POST /api/bookings/{id}/cancel` | `/bookings`<br>`/bookings/new` | `scripts/judge/test_deployed_auth.py` | **PARTIAL** | Submission queues request with role clamped to JWT role; however, `POST /api/bookings/{id}/cancel` crashes with 500 on live host due to `log_audit` signature mismatch. |
| **Disruptions & minimal rescheduling** | `POST /api/disruptions/preview`<br>`POST /api/proposals/{id}/approve`<br>`POST /api/proposals/{id}/reject` | `/disruption` | `docs/judge_evidence/random_disruptions_30.json` | **DONE** | 3-stage lexicographic CP-SAT solver achieves proven minimal moves (14 forced, 0 knock-on) across all change types and explains infeasibility cleanly. |
| **Counterfactual explanations** | `GET /api/explain/session/{id}`<br>`GET /api/explain/booking/{id}` | `/why-here` | `backend/app/explain/engine.py` | **DONE** | Answers "why is this class at this time" and "why was this booking rejected/alternative" with rule IDs and clear English rationale. |
| **Dashboard metrics & utilization** | `GET /api/dashboard` | `/dashboard` | `docs/judge_evidence/screens/dashboard_1440.png` | **PARTIAL** | Backend endpoint returns real metrics, but Vercel frontend calls internal mock route returning hardcoded values (`campus_utilization: 42.8`). |
| **Dataset & change file upload** | `POST /api/admin/dataset` | `/admin/proof` | `backend/app/api/routes.py:1606` | **PARTIAL** | Multipart upload endpoint exists, but lacks file size limit, and crashes with 500 due to `log_audit` signature mismatch. |
| **Schedule export** | `GET /api/export/schedule.json` | Admin / API | `exports/schedule.json` | **DONE** | Exports full JSON matching schema: sessions (189), exams (41), fest_week (25 bookings, overrides). Verified by official validator. |
| **Priority order reconfiguration** | None (Missing API) | `/admin/priority` | `frontend/src/app/admin/priority/page.tsx:45` | **PARTIAL** | UI allows drag/reordering with audit log, but stores changes strictly in browser `localStorage`. Backend endpoint is MISSING; solver and booking engine never receive the changed order. |
| **Coordinator lab approval** | None (Missing API) | `/bookings` | `backend/app/api/routes.py:761` | **MISSING** | Problem statement requires department coordinators to approve bookings in their department's labs. No endpoint or UI exists for coordinator approval (all approvals require admin role). |
| **Faculty unavailability marking** | None (Missing API) | None | `backend/app/api/routes.py` | **MISSING** | Problem statement requires faculty to mark unavailability and request extra/moved sessions. No API or UI exists for faculty to record leave or submit session requests. |
| **Self-approval prevention** | `POST /api/proposals/{id}/approve` | `/disruption` | `backend/app/kernel/pipeline.py:127` | **DONE** | Strict dual-control separation of duties: `approver_id == proposer_id` raises HTTP 400 with code `SELF_APPROVAL`. Admin proposals require secondary admin (`dean@cit.edu`). |

---

## 4. Defect List (Grouped by Severity)

### P0 Defects (Critical — Causes Disqualification or HTTP 500 Crash)

#### DEF-01: `log_audit()` Signature Mismatch Crashes 6 Core Endpoints with HTTP 500
- **Severity**: **P0** (Crash / Unhandled Exception)
- **Criterion Affected**: D1 (Correctness), D5 (Booking Decisions)
- **Marks at Risk**: 12 marks
- **Exact Reproduction Steps**:
  1. Authenticate as `admin@cit.edu` to obtain bearer token.
  2. Send `POST https://cit-scheduler-backend.onrender.com/api/bookings/decide`.
  3. Send `POST https://cit-scheduler-backend.onrender.com/api/bookings/BR-01/cancel`.
  4. Send `POST https://cit-scheduler-backend.onrender.com/api/exams/generate`.
  5. Observe all three endpoints crash with `HTTP 500 Internal Server Error`.
- **Evidence File**: Real execution logged in `scripts/judge/test_deployed_auth.py` and direct CLI output (`Status: 500, Body: Internal Server Error`).
- **Root Cause**: `backend/app/db/repository.py:323` defines `log_audit(action, proposal_id, proposer_id, approver_id, detail, conn)`. However, `backend/app/api/routes.py` calls `log_audit(action=..., user_id=..., details=...)` at lines 848, 1016, 1154, 1178, 1213, and 1630. Python raises `TypeError: log_audit() got an unexpected keyword argument 'user_id'`.
- **Best Fix**: In `backend/app/api/routes.py`, update all 6 call sites to match the repository signature:
  ```python
  log_audit(action="decide_bookings", proposal_id=None, proposer_id=user.get("email", "admin"), approver_id=None, detail={"booking_count": len(fest_week.get("bookings", []))})
  ```
- **Estimated Time**: 15 minutes
- **Test to Prove Fix**: `backend/tests/test_bookings.py` and `scripts/judge/test_api_integration.py` calling `/api/bookings/decide` and `/api/bookings/{id}/cancel` returning 200 OK.

#### DEF-02: Deployed Vercel Frontend Has Empty `NEXT_PUBLIC_API_URL` (Disconnected Mock Backend)
- **Severity**: **P0** (A6 Disqualification Risk — Fabricated Data on Live URL)
- **Criterion Affected**: A4, A5, A6, D6 (Usability)
- **Marks at Risk**: 15 marks (Disqualification risk)
- **Exact Reproduction Steps**:
  1. Open browser DevTools Network tab on `https://team-alpha-coders-tech-zephyr-40.vercel.app/dashboard`.
  2. Inspect requests: observe all API calls target `/api/health`, `/api/dashboard`, `/api/timetable/all` on same-origin Vercel.
  3. Inspect response of `/api/health`: returns `{"version":"1.0.0","solver":"CP-SAT"}` (Next.js route handler), NOT the Render backend's `{"version":"0.1.0","uptime":...}`.
- **Evidence File**: Captured network trace in `docs/judge_evidence/screens/` and Next.js route file `frontend/src/app/api/health/route.ts`.
- **Root Cause**: In Vercel Project Settings, `NEXT_PUBLIC_API_URL` was not configured before deployment. In `frontend/next.config.mjs`, `const backendUrl = process.env.NEXT_PUBLIC_API_URL;` evaluated to undefined, causing rewrites to return `[]`. In `frontend/src/lib/api.ts:40`, `baseUrl` defaulted to `""`, routing all traffic to Next.js internal mock handlers that return static JSON from `server-data.ts`.
- **Best Fix**:
  1. In Vercel dashboard: add environment variable `NEXT_PUBLIC_API_URL=https://cit-scheduler-backend.onrender.com`.
  2. Redeploy frontend.
- **Estimated Time**: 10 minutes
- **Test to Prove Fix**: Call `https://team-alpha-coders-tech-zephyr-40.vercel.app/api/health` and verify it returns Render backend's response payload containing `solver_available: true, dataset_id: "cit_public"`.

#### DEF-03: Hardcoded Auto-Login Admin Override in Frontend API Client
- **Severity**: **P0** (Security / Auth Bypass)
- **Criterion Affected**: A5, C6 (Security Lite)
- **Marks at Risk**: 8 marks
- **Exact Reproduction Steps**:
  1. Open `https://team-alpha-coders-tech-zephyr-40.vercel.app/timetable` in a clean incognito window without logging in.
  2. Check `localStorage.getItem("cit_scheduler_token")`.
  3. Observe token is automatically set to Admin JWT, and network log shows automated background `POST /api/auth/login` with `admin@cit.edu`.
  4. Log in as `faculty@cit.edu` or `club@cit.edu`; wait for token expiration or trigger a 401; observe user is silently converted to `admin@cit.edu`.
- **Evidence File**: `frontend/src/lib/api.ts` lines 66-83 and lines 103-121.
- **Root Cause**: In `ApiClient.request()`, lines 66-83 check `if (!token && ... !endpoint.startsWith('/api/auth/'))` and execute a background login with hardcoded credentials `admin@cit.edu` / `admin123`. Lines 103-121 re-authenticate as admin on any 401 error.
- **Best Fix**: Delete the auto-login blocks (lines 65-83 and lines 102-121) in `frontend/src/lib/api.ts`. Unauthenticated requests should redirect to `/login`.
- **Estimated Time**: 10 minutes
- **Test to Prove Fix**: Open clean browser profile; verify `/dashboard` redirects unauthenticated visitors to `/login` without setting admin token.

---

### P1 Defects (High Severity — Loses Substantial Judging Marks)

#### DEF-04: Fabricated Metrics on Admin Proof Page and Mock Validator Route
- **Severity**: **P1** (A6 Fabrication Penalty)
- **Criterion Affected**: A6 (No Fabricated Results), D4 (AI), D8 (Docs)
- **Marks at Risk**: 8 marks
- **Exact Reproduction Steps**:
  1. Open `https://team-alpha-coders-tech-zephyr-40.vercel.app/admin/proof`.
  2. Inspect displayed metrics: claims "10,000 Fuzz Cases (0 mismatches)", "100% Red-Team Pass Rate", and soft penalty breakdown total 48.
  3. Compare with real validator output: soft penalty is 161 (S2=110, S5=7).
  4. Compare with `docs/redteam-report.md`: red-team pass rate is `N/A` (0 passed, 10 skipped).
- **Evidence File**: `frontend/src/app/api/proof/summary/route.ts` lines 11-13; `frontend/src/app/admin/proof/page.tsx` lines 41-48; `docs/redteam-report.md`.
- **Root Cause**: `frontend/src/app/api/proof/summary/route.ts` hardcoded synthetic numbers instead of reading `exports/validator_report.json` or running live validator.
- **Best Fix**: In `frontend/src/app/admin/proof/page.tsx`, wire soft breakdown directly to `GET /api/validation` or `GET /api/validation/official`, and update `/api/proof/summary` to read actual fuzzer and red-team report files from disk.
- **Estimated Time**: 30 minutes
- **Test to Prove Fix**: Load `/admin/proof` and verify soft breakdown matches `exports/schedule.json` validator report (S1:4, S2:110, S3:3, S4:15, S5:7, S6:22, total 161).

#### DEF-05: In-App Timetable Solve Times Out on Render Free Tier
- **Severity**: **P1** (D1 Correctness — Fresh In-App Generation)
- **Criterion Affected**: D1 (Correctness), D6 (Usability)
- **Marks at Risk**: 6 marks
- **Exact Reproduction Steps**:
  1. Log in as admin on deployed backend.
  2. Send `POST /api/timetable/generate`.
  3. Poll `GET /api/jobs/{id}` every 4 seconds.
  4. At 38 seconds, observe job status changes to `FAILED` with message "Timetable solver could not find a feasible solution".
- **Evidence File**: `docs/judge_evidence/task-448.log` (`Final: {'status': 'failed', 'seconds': 38.48, 'solver_status': 'UNKNOWN'}`).
- **Root Cause**: `backend/app/jobs/runner.py:116` hardcodes `feasibility_limit = max(35.0, float(time_limit_seconds) * 0.75)`. On Render's shared single-core CPU, cold feasibility search takes 38-42 seconds. CP-SAT terminates at 35.0s with `UNKNOWN`, causing the runner to declare failure.
- **Best Fix**: In `backend/app/jobs/runner.py:116`, increase `feasibility_limit` to `max(60.0, float(time_limit_seconds) * 0.8)` and provide an initial hint from `cit_public.json` if available.
- **Estimated Time**: 15 minutes
- **Test to Prove Fix**: Run `POST /api/timetable/generate` on Render and verify job reaches `status: "COMPLETED"` within 50s.

#### DEF-06: Timetable Optimizer Drops Active Hints Due to Key Name Mismatch
- **Severity**: **P1** (D3 Optimisation)
- **Criterion Affected**: D3 (Optimisation)
- **Marks at Risk**: 5 marks
- **Exact Reproduction Steps**:
  1. Send `POST /api/timetable/optimise`.
  2. Poll `GET /api/jobs/{id}`.
  3. At ~38 seconds, job fails with "Optimization solver failed to find an improved solution".
- **Evidence File**: Captured in `job-ce0ccc79` run (`status: 'failed', seconds: 38.46`).
- **Root Cause**: In `backend/app/jobs/runner.py:245`, hint extraction reads:
  ```python
  hint_assignments = {
      s["id"]: (s["day"], s["start_period"], s["room_id"])
      for s in active_sched["sessions"]
      if "id" in s and "day" in s and "start_period" in s and "room_id" in s
  }
  ```
  In `exports/schedule.json` and active schedule state, the key is `session_id`, NOT `id`. `"id" in s` evaluates to False for all 189 sessions, resulting in `hint_assignments = {}`. The optimizer is forced to run cold without hints and times out.
- **Best Fix**: In `backend/app/jobs/runner.py:244-247`, change `s["id"]` to `(s.get("session_id") or s.get("id"))`.
- **Estimated Time**: 5 minutes
- **Test to Prove Fix**: Run `POST /api/timetable/optimise` and verify it warm-starts from penalty 161 and returns `status: "COMPLETED"` with soft penalty $\le 161$.

#### DEF-07: Placement Checker `what_blocks` Falsely Rejects Period 5 and Misses H11/H12/H13
- **Severity**: **P1** (C1 Parity / Drag-and-Drop Scheduling)
- **Criterion Affected**: D1 (Correctness), D6 (Usability)
- **Marks at Risk**: 5 marks
- **Exact Reproduction Steps**:
  1. Run `python scripts/judge/parity_placement.py`.
  2. Observe 11 false positives (marked legal, but official validator reports H11, H12, or H13 hard violations).
  3. Observe 22 false negatives (marked illegal with H9, but official validator accepts slot).
- **Evidence File**: `docs/judge_evidence/parity_placement_1500.json`.
- **Root Cause**:
  1. *False Negatives*: `backend/app/explain/engine.py:51` checks `if period <= self.ctx.lunch < period + dur: blocked.append("H9")`. For a 1-hour session at P5 (`period=5, dur=1`), `5 <= 5 < 6` evaluates to True! P5 is 12:00-13:00 (before lunch). Crossing lunch requires occupying both sides (`period <= self.ctx.lunch and period + dur - 1 > self.ctx.lunch`).
  2. *False Positives*: `what_blocks` omits checks for basket synchronization (H11), faculty daily limit (H12), and fest week booking room clashes (H13).
- **Best Fix**:
  1. Fix lunch boundary check: `if period <= self.ctx.lunch and period + dur - 1 > self.ctx.lunch: blocked.append("H9")`.
  2. Add H11 (check if basket session day/period matches basket partners).
  3. Add H12 (check if faculty hours on `day` would exceed `max_hours_per_day`).
  4. Add H13 (check if room/period clashes with approved fest booking).
- **Estimated Time**: 35 minutes
- **Test to Prove Fix**: Re-run `scripts/judge/parity_placement.py`; verify false positives = 0 and false negatives = 0 across 1500 trials.

#### DEF-08: Fallback Parser Misidentifies "6 to 8 pm" and "after lunch"
- **Severity**: **P1** (D4 Use of AI)
- **Criterion Affected**: D4 (Use of AI)
- **Marks at Risk**: 4 marks
- **Exact Reproduction Steps**:
  1. Run `python scripts/judge/property_time_resolver.py`.
  2. Test prompt: `"auditorium 6 to 8 pm for 100 people Thursday"` -> Got P10 to P12 (18:00 - 21:00) instead of P10 to P11 (18:00 - 20:00).
  3. Test prompt: `"seminar hall after lunch Friday for 50 people"` -> Got P10 to P12 instead of P6 (14:00 - 15:00).
  4. Test prompt: `"parso subah 10 baje se 12 baje tak lab 50 students"` -> Unparsed (`from=None, to=None`).
- **Evidence File**: `docs/judge_evidence/property_time_resolver.json`.
- **Root Cause**: `backend/app/ai/provider.py:588` regex only matches `6 to 9 pm`. "6 to 8 pm" falls through to default 3-hour evening block (P10-P12). "after lunch" is unhandled and defaults to evening block. "parso" (day after tomorrow) is missing from day extraction regex.
- **Best Fix**:
  1. In `backend/app/ai/provider.py`, add specific regex for `6 (?:pm)? (?:to|-) 8 pm` -> `from_period=10, to_period=11`.
  2. Add regex for `after lunch` -> `from_period=6, to_period=6`.
  3. Add `parso` -> map to `WED` (day after tomorrow from Monday base).
- **Estimated Time**: 20 minutes
- **Test to Prove Fix**: Re-run `scripts/judge/property_time_resolver.py`; verify all 9 property tests report `PASS`.

#### DEF-09: Missing Priority Order Reconfiguration Backend Endpoint & Persistence
- **Severity**: **P1** (Part B Requirements Coverage)
- **Criterion Affected**: D5 (Booking Decisions), D6 (Usability)
- **Marks at Risk**: 4 marks
- **Exact Reproduction Steps**:
  1. Open `/admin/priority` in browser.
  2. Reorder categories (move Club Events above Department Events); click Save.
  3. Inspect Network tab: 0 HTTP calls made.
  4. Open `/admin/priority` in another browser; observe default order remains unchanged.
- **Evidence File**: `frontend/src/app/admin/priority/page.tsx` line 45 (`localStorage.setItem('cit-priority-ladder', ...)`).
- **Root Cause**: No backend API endpoint exists for updating category priority order. The UI persists priority hierarchy solely in browser `localStorage`. `BookingEngine` always reads static priority order from `cit_public.json`.
- **Best Fix**: Add `POST /api/admin/priority-order` endpoint in `backend/app/api/routes.py` persisting custom category ranks into SQLite table `priority_state`, and have `BookingEngine` read from this table when deciding bookings.
- **Estimated Time**: 35 minutes
- **Test to Prove Fix**: Update priority order via API; call `POST /api/bookings/decide`; verify booking selection reflects new priority order.

---

### P2 Defects (Medium / Polish — Quality, Accessibility, Documentation)

#### DEF-10: Undeclared Assets & Incomplete `THIRD_PARTY.md` Manifest
- **Severity**: **P2** (Documentation / Compliance)
- **Criterion Affected**: A8 (No Undeclared AI), D8 (Code & Docs)
- **Marks at Risk**: 3 marks
- **Root Cause**: `public/images/campus-venue-map.png` and `public/models/assistant.glb` are not listed in `AI_USAGE.md` or `THIRD_PARTY.md`. NPM packages `three` and `framer-motion` are missing from `THIRD_PARTY.md`.
- **Best Fix**: Document asset provenance in `AI_USAGE.md` (e.g. 3D model created via Blender / CC0; venue map drawn with Illustrator/AI generator). Add `three` and `framer-motion` to `THIRD_PARTY.md`.
- **Estimated Time**: 15 minutes

#### DEF-11: Lighthouse Accessibility Contrast & Semantic Headings Failures
- **Severity**: **P2** (UI / Accessibility)
- **Criterion Affected**: D7 (UI and Design)
- **Marks at Risk**: 3 marks
- **Evidence File**: `docs/judge_evidence/lighthouse_report.json`.
- **Root Cause**: Yellow event badge text has insufficient contrast ratio of 1.06 (expected 4.5:1). Fest evening strip uses `<h3>` without an enclosing `<h2>`. Student group dropdown selector lacks an associated `<label>`.
- **Best Fix**: In Tailwind CSS, change yellow event badge text from light ink to dark `#12292B`. Add `aria-label="Filter timetable by student group"` to `<select>` in `frontend/src/app/timetable/page.tsx`.
- **Estimated Time**: 15 minutes

#### DEF-12: Mismatched Variable Names in `.env.example`
- **Severity**: **P2** (Developer Setup Friction)
- **Criterion Affected**: A9, D8 (Code and Docs)
- **Marks at Risk**: 2 marks
- **Root Cause**: `.env.example` lists `SOLVER_TIME_LIMIT_SECONDS` (code reads `SOLVER_TIME_LIMIT`), `DATABASE_URL` (code reads `DATABASE_PATH`), and omits `CORS_ORIGINS`, `SOLVER_NUM_WORKERS`, `ENV`.
- **Best Fix**: Align `.env.example` keys exactly with `os.getenv` calls in Python code.
- **Estimated Time**: 10 minutes

#### DEF-13: Missing Favicon (`/favicon.ico` 404 Error)
- **Severity**: **P2** (UI Polish)
- **Criterion Affected**: D7 (UI and Design)
- **Marks at Risk**: 1 mark
- **Root Cause**: No `favicon.ico` exists in `frontend/public/`, generating two 404 errors on every page load.
- **Best Fix**: Add a lightweight SVG or ICO icon in `frontend/public/favicon.ico`.
- **Estimated Time**: 5 minutes

---

## 5. NOT TESTED List & Video Shot Checklist

### Items Not Tested
1. **Host Sleep Wake-up Latency (20-minute sleep duration)**:
   - *Reason*: Render free instances sleep after 15 minutes. Cold-request test was performed while container was active. A full 20-minute idle wait could not be scheduled within the single-session test execution window.
   - *Mitigation*: Confirmed Render free tier specifications from host documentation (15-min idle sleep, ~50s wake-up delay).
2. **Multi-User Real-Time WebSocket Synchronization**:
   - *Reason*: README explicitly states WebSockets are not implemented; system uses HTTP polling.
3. **Official 5-Minute Pitch & Product Demo Video**:
   - *Reason*: Requires human video presentation and narration. Marked strictly **NOT TESTED** per instruction A12.

### Required 5-Minute Video Shot Checklist
To fulfill requirement A12, the submission video must follow this exact 5-minute storyboard:

| Time | Duration | Screen / View | Required Actions & Spoken Points |
|---|:---:|---|---|
| **0:00 - 0:45** | 45s | `/dashboard` | **Introduction**: Show CIT campus overview (27 rooms, 40 faculty, 189 sessions). Point out zero conflicts, 67.0 festival booking score, and room utilization bar. Explain the 5-colour semantic palette. |
| **0:45 - 1:30** | 45s | `/timetable` | **Timetable & Views**: Filter by student group `Y1-A`, then by faculty `Dr. Raman (F01)`, then by room `AUD`. Show 3-hour lab block starting at P2 without lunch crossing. Show basket synchronization for `OE301/OE302/OE303`. |
| **1:30 - 2:30** | 60s | `/bookings/new`<br>& `/bookings` | **Plain Language to Booking**: Type in Hinglish prompt: `"kal shaam seminar hall chahiye 80 log"`. Show parser extracting `SH-1`, evening window `P10-P12`, 80 attendance with provenance tags. Submit and show it queued as pending. Show Spectra decisions (22 approved, 1 alternative BR-17, 0 priority inversions). |
| **2:30 - 3:15** | 45s | `/timetable`<br>& `/why-here` | **Conflict Blocked & Explanation**: Try dragging a lecture into a clashing slot; show instant red highlight and rule code (`H2 Faculty Conflict`). Open `/why-here` for session `MA101-AB-L1` to show counterfactual proof of why alternative slots were rejected. |
| **3:15 - 4:15** | 60s | `/disruption` | **Disruption & Reschedule**: Load `sample_disruption.json` (Dr. Raman leave + CR-102 leak). Show CP-SAT 3-stage minimal moves proposal: exactly 14 forced moves, 0 knock-on moves, 0 hard violations. Log in as `dean@cit.edu` to show dual-control approval (self-approval blocked). Approve and show instant timetable update. |
| **4:15 - 5:00** | 45s | `/admin/proof` | **Validator Proof & Architecture**: Run official validator live in terminal; show 0 hard violations. Display architecture diagram (FastAPI + OR-Tools CP-SAT + Next.js). Summarize production readiness. |

---

## 6. Top 10 Fixes Ranked by Marks Gained per Hour

| Rank | Defect ID | Description | Marks Gained | Est. Time | Marks / Hour | Primary File & Function |
|:---:|:---:|---|:---:|:---:|:---:|---|
| **1** | **DEF-01** | Fix `log_audit()` argument mismatch across 6 routes | **+12** | 0.25 h | **48.0** | `backend/app/api/routes.py` (lines 848, 1016, 1154, 1178, 1213, 1630) |
| **2** | **DEF-02** | Configure `NEXT_PUBLIC_API_URL` on Vercel deployment | **+15** | 0.20 h | **75.0** | Vercel Environment Variables (`NEXT_PUBLIC_API_URL`) |
| **3** | **DEF-06** | Fix optimizer hint dictionary key (`s["id"]` $\to$ `s["session_id"]`) | **+5** | 0.10 h | **50.0** | `backend/app/jobs/runner.py:245` (`run_timetable_optimise_job`) |
| **4** | **DEF-03** | Remove frontend auto-admin login bypass | **+8** | 0.20 h | **40.0** | `frontend/src/lib/api.ts` (lines 66-83, 103-121) |
| **5** | **DEF-05** | Calibrate `feasibility_limit` to 60s for Render free CPU | **+6** | 0.25 h | **24.0** | `backend/app/jobs/runner.py:116` (`run_timetable_solve_job`) |
| **6** | **DEF-08** | Expand regex parser for "6 to 8 pm", "after lunch", "parso" | **+4** | 0.35 h | **11.4** | `backend/app/ai/provider.py:588` (`_fallback_parse`) |
| **7** | **DEF-07** | Fix Period 5 lunch false negative and add H11/H12/H13 checks | **+5** | 0.60 h | **8.3** | `backend/app/explain/engine.py:51` (`what_blocks`) |
| **8** | **DEF-04** | Replace hardcoded proof metrics with real validator report | **+8** | 0.50 h | **16.0** | `frontend/src/app/api/proof/summary/route.ts` & `admin/proof/page.tsx` |
| **9** | **DEF-09** | Add backend persistence endpoint for category priority order | **+4** | 0.60 h | **6.7** | `backend/app/api/routes.py` (`POST /api/admin/priority-order`) |
| **10** | **DEF-11** | Fix 6 Lighthouse color contrast elements & select label | **+3** | 0.25 h | **12.0** | `frontend/src/app/timetable/page.tsx` (Tailwind classes) |

*Total potential score increase*: **+70 raw marks (normalized to 26 net scorecard marks)** across **3.3 hours** of focused implementation.

---

## 7. Exact Commands to Reproduce Every Test

Every single test result in this report can be reproduced by running the official test runner:

### PowerShell (Windows)
```powershell
.\scripts\judge\run_all.ps1
```

### Bash (macOS / Linux / WSL)
```bash
chmod +x scripts/judge/run_all.sh
./scripts/judge/run_all.sh
```

### Individual Sub-Tests
```powershell
# 1. Full Pytest test suite (70 tests)
backend\venv\Scripts\python.exe -m pytest backend/tests -v --tb=short

# 2. Differential Fuzzing against official validator (5000 cases, seed 20261101)
backend\venv\Scripts\python.exe scripts/judge/fuzz_5000_new_seed.py

# 3. Placement Parity Checker (1500 moves)
backend\venv\Scripts\python.exe scripts/judge/parity_placement.py

# 4. Property Tests for Time Resolver & Hinglish Lexicon
backend\venv\Scripts\python.exe scripts/judge/property_time_resolver.py

# 5. 30 Random Disruption Scenarios (Fewest Moves & Feasibility Audit)
backend\venv\Scripts\python.exe scripts/judge/random_disruptions.py

# 6. Independent AI Prompts (38 booking prompts + 8 faculty queries)
backend\venv\Scripts\python.exe scripts/judge/independent_ai_prompts.py

# 7. Adversarial Hostile LLM Output Injection Test
backend\venv\Scripts\python.exe scripts/judge/adversarial_llm_test.py

# 8. Deployed Auth & Role RBAC Matrix Audit
backend\venv\Scripts\python.exe scripts/judge/test_deployed_auth.py
backend\venv\Scripts\python.exe scripts/judge/test_security_lite.py

# 9. Official Validator on Rerun Exports
backend\venv\Scripts\python.exe validator/validator.py --data data/cit_public.json --schedule docs/judge_evidence/schedule_rerun.json
backend\venv\Scripts\python.exe validator/validator.py --data data/cit_public.json --schedule docs/judge_evidence/schedule_after_rerun.json --disruption data/sample_disruption.json --baseline docs/judge_evidence/schedule_rerun.json
```

---

## 8. Summary & Next Steps

This concludes **Phase 1 (Read-Only Audit)**. No application code, validator logic, or deployment settings have been altered. All test scripts and evidence artifacts reside strictly under `scripts/judge/`, `tests/judge/`, and `docs/judge_evidence/`.

**Awaiting user approval before proceeding to Phase 2.** Reply `"fix"` to begin resolving defects in order of priority (P0 first, followed by P1 ranked by marks gained per hour).
