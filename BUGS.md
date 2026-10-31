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
