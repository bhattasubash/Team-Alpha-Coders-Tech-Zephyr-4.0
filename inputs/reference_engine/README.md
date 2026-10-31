# Reference engine (prototype, verified against the official validator)

Written by Claude (claude.ai) for the team lead. Declare this in AI_USAGE.md if any of it is ported into the repo.
These are single-file prototypes, not app code. Port the ideas into backend/app/solver, bookings and explain.
Do not paste blindly: keep the project's own types, config module and tests.

## Files
- timetable_solver.py   CP-SAT base timetable, exact S1..S6 objective, neighbourhood search (Keep optimising), minimal-move reschedule in 3 stages
- exam_solver.py        exam scheduler (rooms capacity//2, group clash, same-day penalty)
- booking_engine.py     priority-order booking decisions, alternatives, displacement, reservations for the timetable
- slot_rules.py         placement checker (legal-slots, why-not reasons, domain explanation)
- make_schedule.py      end to end run, then the official validator
- parity_slot.py        slot_rules vs validator on random moves
- run_resched2.py       reschedule a disruption file from a base schedule

Run (needs ortools, validator.py and cit_public.json in the same folder):
    python make_schedule.py 240

## Results measured in the sandbox (1 CPU core, so slower than your machine)
| Check | Result |
|---|---|
| Timetable, official validator | 0 hard violations |
| Soft penalty after 240 s of neighbourhood search (without booking reservations) | 67 (S1 2, S2 34, S3 3, S4 27, S5 0, S6 1). Model objective equals validator total |
| Same, with booking reservations, only 100 s run | 155. Not yet measured at 240 s or longer, so do not quote 67 for the reserved version |
| Exams | OPTIMAL, 0 hard, same-day penalty 0, 3 s |
| Bookings | score 67.0, the maximum reachable (BR-09 needs 1200 seats, BR-17 window ends at P14), 0 inversions, 0 overrides |
| Reschedule on sample_disruption.json | 14 moves, proven minimum (14 sessions are directly invalidated), 13 room-only and 1 time change, 0 hard, 13 s |
| slot_rules vs validator | 1426 of 1426 random single-session moves agree |

## Why these choices
- Two phases: feasibility first (13 s), then improve. The exact objective makes the first solution slow to find.
- Neighbourhood search frees a slice (days, groups, faculty or random sessions), re-solves it exactly and keeps it if better. Works on one core and is what the Keep optimising button should run.
- Reschedule objective is lexicographic: fewest moved sessions, then fewest time changes, then soft penalty. The validator counts a room-only change as a move too.
- Booking score depends on the timetable, so the timetable reserves the teaching-hour slots of the ideal booking plan. Without it the score was 65.5 on one run and 67.0 on another.
- Bookings are decided from the highest priority down. The validator flags an inversion only for rejected requests, so a request is rejected only when no valid slot exists anywhere.

## Known gaps
- No unsat-core explanation yet. explain_domain() covers sessions with zero legal slots only.
- Reschedule does not yet re-decide bookings when a moved session lands on an approved booking.
- Displacement of basket sessions is not attempted.
