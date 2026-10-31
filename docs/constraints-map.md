# Constraints map

One row per rule. The "Validator function" column refers to the organiser-provided `validator.py`. The "Kernel function" column refers to our implementation in `backend/app/kernel/`. The "Test name" column refers to test functions in `backend/tests/`.

## Hard constraints

| Rule | Description | Validator function | Kernel function | Test name |
|------|-------------|--------------------|-----------------|-----------|
| H1 | Every session must be scheduled (no unassigned sessions) | `check_all_scheduled` | `kernel.check_h1_scheduled` | `test_h1_all_scheduled` |
| H2 | No faculty member teaches two sessions at the same time | `check_faculty_conflict` | `kernel.check_h2_faculty_conflict` | `test_h2_faculty_conflict` |
| H3 | No student group has two sessions at the same time | `check_group_conflict` | `kernel.check_h3_group_conflict` | `test_h3_group_conflict` |
| H4 | No room is used by two sessions at the same time | `check_room_conflict` | `kernel.check_h4_room_conflict` | `test_h4_room_conflict` |
| H5 | Room capacity must be >= group size | `check_capacity` | `kernel.check_h5_capacity` | `test_h5_capacity` |
| H6 | Room type must match session requirement (lab in lab room, etc.) | `check_room_type` | `kernel.check_h6_room_type` | `test_h6_room_type` |
| H7 | Faculty must not be scheduled during their unavailable periods | `check_faculty_unavail` | `kernel.check_h7_faculty_unavail` | `test_h7_faculty_unavail` |
| H8 | Room must not be scheduled during its unavailable periods (2 unavailabilities in dataset) | `check_room_unavail` | `kernel.check_h8_room_unavail` | `test_h8_room_unavail` |
| H9 | Period/lunch/lab rules: no teaching during lunch (after P5), labs start P2 or P6 only, events only in P10-P13 | `check_period_rules` | `kernel.check_h9_period_rules` | `test_h9_period_rules` |
| H10 | Sessions needing accessible rooms (20 sessions) must be in accessible rooms | `check_accessibility` | `kernel.check_h10_accessibility` | `test_h10_accessibility` |
| H11 | Basket slot sessions (9 sessions: OEB-1, OEB-2, OEB-3 with 3 each) must run in parallel | `check_basket_slot` | `kernel.check_h11_basket_slot` | `test_h11_basket_slot` |
| H12 | Faculty daily teaching limit: max 4 hours per day | `check_daily_limit` | `kernel.check_h12_daily_limit` | `test_h12_daily_limit` |
| H13 | Booking violations: approved bookings must not conflict with teaching schedule, priority order enforced | `check_booking_violations` | `kernel.check_h13_booking_violations` | `test_h13_booking_violations` |
| H14 | Fixed slot sessions must stay in their assigned slot | `check_fixed_slot` | `kernel.check_h14_fixed_slot` | `test_h14_fixed_slot` |

## Soft constraints

| Rule | Description | Penalty | Validator function | Kernel function | Test name |
|------|-------------|---------|--------------------|-----------------|-----------| 
| S1 | Faculty preference violation | 2 pts per hour in non-preferred slot | `calc_faculty_pref` | `kernel.calc_s1_faculty_pref` | `test_s1_faculty_pref` |
| S2 | Student group gaps (idle periods between classes) | per gap period | `calc_group_gaps` | `kernel.calc_s2_group_gaps` | `test_s2_group_gaps` |
| S3 | Student group overload: more than 6 teaching hours in a day | 3 pts * (hours - 6) | `calc_group_overload` | `kernel.calc_s3_group_overload` | `test_s3_group_overload` |
| S4 | Same course taught twice in one day to a group | 3 pts * (count - 1) | `calc_same_course` | `kernel.calc_s4_same_course` | `test_s4_same_course` |
| S5 | Room utilization below 40% | 1 pt per underutilized room-slot | `calc_utilization` | `kernel.calc_s5_utilization` | `test_s5_utilization` |
| S6 | Session scheduled at period 9 (last period, unpopular) | 1 pt per P9 session | `calc_p9_penalty` | `kernel.calc_s6_p9_penalty` | `test_s6_p9_penalty` |

## Booking constraints

| Rule | Description | Validator function | Kernel function | Test name |
|------|-------------|--------------------|-----------------|-----------|
| B1 | Duplicate booking or invalid status value | `check_booking_status` | `kernel.check_b1_booking_status` | `test_b1_booking_status` |
| B2 | Invalid override (lower priority overriding higher priority) | `check_booking_override` | `kernel.check_b2_booking_override` | `test_b2_booking_override` |
| B3 | Cancelled booking must not be approved (BR-04 is cancelled) | `check_cancelled_approved` | `kernel.check_b3_cancelled_approved` | `test_b3_cancelled_approved` |

## Exam constraints

| Rule | Description | Validator function | Kernel function | Test name |
|------|-------------|--------------------|-----------------|-----------|
| E1 | All 41 midsem exams must be scheduled, no unknown exam IDs | `check_exam_scheduled` | `kernel.check_e1_exam_scheduled` | `test_e1_exam_scheduled` |
| E2 | Exam room must be designated for exams (capacity halved: room fits ceil(capacity/2) students) | `check_exam_room` | `kernel.check_e2_exam_room` | `test_e2_exam_room` |
