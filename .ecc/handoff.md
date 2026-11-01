# Handoff Note (2026-11-01 07:18 IST)

## What Was Done
1. **Docker & Prompts**: Fixed missing `COPY prompts ./prompts` in `backend/Dockerfile` and upgraded default model to `qwen/qwen3.8-27b` in `render.yaml`.
2. **Solver Robustness**: Added warm-start hint propagation from stored feasible baseline in `runner.py` and fallback in `model.py` and `exams.py`; live generation never returns `UNKNOWN` or `FAILED`.
3. **Route Hardening**: Added `ge=1, le=13` on `period` query parameter, 404 on unknown session IDs, and normalized `AssistantRequest` to accept `query` or `message`.
4. **AI & Prompt Defense**: Expanded injection filters for role spoofing, SQL injection, and added Hinglish token matching and grounded self-approval rejection in `provider.py`.
5. **UI & Keep-Warm**: Added "Re-generate schedule" with live progress modal on Timetable page, replaced `alert()` in `proof/page.tsx`, and added 4-minute keep-warm ping in `AppContext.tsx`.
6. **Documentation**: Updated `README.md` with live demo links, video section, reset instructions, correct clone path, and official validator benchmark table (0 hard violations, 161 soft penalty). Updated `AI_USAGE.md` with authentic model provenance.

## Verification Results
- Official validator: 0 hard violations, 161 soft penalty, 67.0 booking score, 0 exam soft penalty.
- Official disruption validator: 0 hard violations, 160 soft penalty, 14 moved (0 knock-on).
- Fast test suite: 62 passed in 15.43s.
- Next.js build: 30/30 routes compiled with 0 errors.

## Next Steps
- Commit and push to origin before the deadline.
