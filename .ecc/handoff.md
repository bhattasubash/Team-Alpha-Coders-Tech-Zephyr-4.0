# Handoff Note (2026-11-01 06:22 IST)

## What Was Done
1. Fixed `log_audit()` argument mismatch across routes (DEF-01) and added defensive parameter handling in `repository.py`.
2. Fixed optimizer hint extraction key `s["id"]` -> `(s.get("session_id") or s.get("id"))` in `runner.py:245` (DEF-06) and increased feasibility timeout to 60s.
3. Corrected placement checker Period 5 lunch boundary bug in `engine.py:51` and added H11, H12, and H13 checks: 1500-case parity test achieves 0 false positives and 0 false negatives (100% parity).
4. Expanded AI fallback regex parser for "6 to 8 pm", "after lunch", and "parso" (9/9 property tests pass).
5. Replaced `alert()` popup in `NewBookingPage` with real `api.createBooking()` and 4-state lifecycle (`idle`, `submitting`, `success`, `error`).
6. Differentiated Dean/Admin ("Approved & Committed") vs Faculty/Club ("Pending Dean Approval") in UI and API.
7. Added `POST /api/bookings/{id}/review` endpoint with self-approval guards and audit logging.
8. Added "Submissions Awaiting Dean Approval" ledger with direct "Approve"/"Reject" actions on the Dean Dashboard.
9. Converted desktop navigation rail in `Rail.tsx` to `fixed left-0 top-0 bottom-0 h-screen z-30` so it stays sticky.
10. Removed silent auto-admin login bypass from `api.ts`.
11. Updated `BUGS.md` and `DECISIONS.md`.

## Open Issues / Remaining Tasks
- Deploy git commit to Vercel/Render before 12:00 IST deadline.
- Set `NEXT_PUBLIC_API_URL=https://cit-scheduler-backend.onrender.com` on Vercel project environment variables.
- Optional: Add `favicon.ico` in `frontend/public/` to clear remaining 404.

## Next Steps
- Verify deployed application with newly pushed fixes.
