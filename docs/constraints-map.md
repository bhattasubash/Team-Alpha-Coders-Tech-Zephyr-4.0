# Constraints map

Mapping of every constraint rule between the official validator, the backend kernel, and test suite.
Evaluated from direct inspection of `validator/validator.py`, `backend/app/kernel/validate.py`, and `backend/tests/test_kernel.py`.

## Status summary
- DONE: 24 rules (100% parity achieved across timetable, bookings, exams, and soft scoring)
- PARTIAL: 0 rules
- MISSING: 0 rules

## Hard constraints (Timetable)

| Rule | Description | Validator function | Kernel function | Test name | Status |
|------|-------------|--------------------|-----------------|-----------|--------|
| H1 | Every session scheduled exactly once, no unknown session IDs, valid days and rooms, no duplicate sessions | `check_timetable`, `run` | `check_all_scheduled`, `validate_timetable`, `validate_schedule` | `test_h1_unscheduled`, `test_h1_unknown_session` | DONE |
| H2 | No faculty double-booking at the same day and period | `check_timetable` | `check_faculty_conflicts`, `validate_timetable` | `test_h2_faculty_conflict` | DONE |
| H3 | No student group double-booking (basket sessions share key) | `check_timetable`, `check_exams` | `check_group_conflicts`, `check_exam_h3`, `validate_timetable` | `test_h3_group_conflict`, `test_exam_h3_group_conflict` | DONE |
| H4 | No room double-booking at the same day and period | `check_timetable`, `check_exams` | `check_room_conflicts`, `check_exam_h4`, `validate_timetable` | `test_h4_room_conflict`, `test_exam_h4_room_conflict` | DONE |
| H5 | Room capacity must be greater than or equal to session size | `check_timetable`, `check_exams` | `check_capacity`, `check_exam_h5`, `validate_timetable` | `test_h5_capacity`, `test_exam_h5_half_capacity` | DONE |
| H6 | Room type must be in session allowed room_types | `check_timetable` | `check_room_types`, `validate_timetable` | `test_h6_room_type` | DONE |
| H7 | Faculty must not be scheduled during unavailable periods | `check_timetable` | `check_faculty_availability`, `validate_timetable` | `test_h7_faculty_unavailable` | DONE |
| H8 | Room must not be scheduled during unavailable periods | `check_timetable` | `check_room_availability`, `validate_timetable` | `test_h8_room_unavailable` | DONE |
| H9 | Periods within P1-P9, no teaching across lunch gap, labs start at P2 or P6 | `check_timetable` | `check_period_constraints`, `validate_timetable` | `test_h9_period_out_of_range`, `test_h9_crosses_lunch`, `test_h9_lab_wrong_start` | DONE |
| H10 | Sessions requiring accessible rooms must be placed in accessible rooms | `check_timetable` | `check_accessibility`, `validate_timetable` | `test_h10_accessibility` | DONE |
| H11 | Sessions sharing a basket_slot must be scheduled at identical day and start period | `check_timetable` | `check_basket_slots`, `validate_timetable` | `test_h11_basket_slot_mismatch` | DONE |
| H12 | Faculty daily teaching hours must not exceed max_hours_per_day | `check_timetable` | `check_faculty_daily_limit`, `validate_timetable` | `test_h12_faculty_daily_limit` | DONE |
| H13 | Spectra week booking checks: duration, allowed uses, room type, capacity, needs, window, room unavailability, room busy, mandatory groups | `check_bookings` | `check_booking_h13`, `check_bookings` | `test_h13_booking_checks` | DONE |
| H14 | Fixed slot sessions must be placed at specified day and start period | `check_timetable` | `check_fixed_slots`, `validate_timetable` | `test_h14_fixed_slot` | DONE |

## Booking constraints (Spectra week)

| Rule | Description | Validator function | Kernel function | Test name | Status |
|------|-------------|--------------------|-----------------|-----------|--------|
| B1 | Exactly one valid decision per non-cancelled request, valid status values | `check_bookings` | `check_booking_b1`, `check_bookings` | `test_b1_booking_status` | DONE |
| B2 | Valid session override: existing session, displaced by approved institute event, timetable valid | `check_bookings` | `check_booking_b2`, `check_bookings` | `test_b2_booking_override` | DONE |
| B3 | Cancelled requests must never be approved or offered alternatives | `check_bookings` | `check_booking_b3`, `check_bookings` | `test_b3_cancelled_approved` | DONE |
| Inversion | Priority inversion detection: higher priority request rejected while lower priority approved in compatible slot | `check_bookings` | `check_priority_inversions`, `check_bookings` | `test_priority_inversion_detection` | DONE |

## Exam constraints

| Rule | Description | Validator function | Kernel function | Test name | Status |
|------|-------------|--------------------|-----------------|-----------|--------|
| E1 | All exams scheduled exactly once, valid exam week days and sessions, no unknown IDs | `check_exams` | `check_exam_e1`, `check_exams` | `test_e1_exam_scheduled` | DONE |
| E2 | Exam room allowed uses must contain exam | `check_exams` | `check_exam_e2`, `check_exams` | `test_e2_exam_room` | DONE |
| Exam H3 | No student group double-booked in same exam slot | `check_exams` | `check_exam_h3`, `check_exams` | `test_exam_h3_group_conflict` | DONE |
| Exam H4 | No room double-booked in same exam slot | `check_exams` | `check_exam_h4`, `check_exams` | `test_exam_h4_room_conflict` | DONE |
| Exam H5 | Total room seats (floor division: capacity // 2) must be >= exam size | `check_exams` | `check_exam_h5`, `check_exams` | `test_exam_h5_half_capacity` | DONE |
| Exam Soft | Multiple exams on same day for a student group | `check_exams` | `check_exam_soft`, `check_exams` | `test_exam_soft_penalty` | DONE |

## Soft constraints

| Rule | Description | Penalty weight | Validator function | Kernel function | Test name | Status |
|------|-------------|----------------|--------------------|-----------------|-----------|--------|
| S1 | Faculty avoid preference violation | 2 per hour | `soft_score` | `soft_score` | `test_soft_s1_faculty_preference` | DONE |
| S2 | Student group gaps between classes | 1 per gap period | `soft_score` | `soft_score` | `test_soft_s2_group_gaps` | DONE |
| S3 | Student group daily overload (> 6 hours) | 3 per hour over 6 | `soft_score` | `soft_score` | `test_soft_s3_group_overload` | DONE |
| S4 | Multiple lectures of same course in one day for a group, or duplicate basket course in a day | 3 per extra lecture | `soft_score` | `soft_score` | `test_soft_s4_same_course_lectures`, `test_soft_s4_basket_lectures` | DONE |
| S5 | Room underutilization (size / capacity < 0.4) | 1 per session | `soft_score` | `soft_score` | `test_soft_s5_underutilized` | DONE |
| S6 | Teaching in last period (P9) | 1 per session touching P9 | `soft_score` | `soft_score` | `test_soft_s6_last_period` | DONE |
