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
