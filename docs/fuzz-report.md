# Differential fuzzing report

## Summary
- Date: 2026-10-31
- Seed: 42
- Target iterations: 2000
- Total cases executed: 2000
- Mismatches detected: 0
- Agreement rate: 100.00%

## Mutation types tested
- `move_session`: moves session day, period, or room
- `swap_rooms`: swaps room assignments between two sessions
- `swap_times`: swaps time slots between two sessions
- `change_basket`: desynchronizes parallel basket slot sessions
- `delete_session`: removes sessions to trigger H1 unscheduled
- `duplicate_session`: duplicates session IDs in schedule
- `change_booking_status`: mutates booking statuses (approved, rejected, alternative, unknown)
- `move_booking`: mutates booking days, periods, and rooms
- `move_exam`: alters exam days, sessions, and room assignments
- `duplicate_exam`: duplicates exam IDs in schedule
- `delete_exam`: removes exams to trigger E1 unscheduled

## Outcome
Parity achieved. All 2000 mutated cases yielded identical hard_by_rule and soft_total results.
