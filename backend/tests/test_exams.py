"""Tests for Milestone 4: Exam scheduling solver and official validator parity."""

from __future__ import annotations

import pytest

from app.solver.config import SolverConfig
from app.solver.exams import ExamSolver


@pytest.mark.slow
def test_exam_solver_all_constraints(dataset, validator_module):
    """Test exam solver against all Milestone 4 requirements:
    - Every exam is scheduled exactly once.
    - Every assigned room has 'exam' in allowed_uses.
    - Sum of capacity // 2 >= exam size.
    - No room double-booking.
    - No group double-booking.
    - Soft penalty reported and <= naive round robin.
    - Official validator check_exams returns 0 violations.
    """
    config = SolverConfig(time_limit_seconds=20.0, num_workers=8, random_seed=42)
    solver = ExamSolver(dataset, config=config)

    # 1. Run naive round robin for baseline soft penalty
    naive_schedule = solver.solve_naive_round_robin()
    official_ctx = validator_module.Ctx(dataset)
    _, naive_soft_penalty = validator_module.check_exams(official_ctx, naive_schedule)

    # 2. Run CP-SAT exam solver
    scheduled_exams = solver.solve(time_limit_override=50.0)

    # A. Every exam is scheduled exactly once
    dataset_exams = dataset.get("exams", [])
    assert len(scheduled_exams) == len(dataset_exams)

    scheduled_ids = [e["exam_id"] for e in scheduled_exams]
    assert len(scheduled_ids) == len(set(scheduled_ids))
    assert set(scheduled_ids) == {e["id"] for e in dataset_exams}

    # B. Every assigned room has 'exam' in allowed_uses
    rooms_by_id = {r["id"]: r for r in dataset["rooms"]}
    for e in scheduled_exams:
        assert len(e["rooms"]) > 0, f"Exam {e['exam_id']} has no rooms assigned"
        for rid in e["rooms"]:
            assert rid in rooms_by_id
            assert "exam" in rooms_by_id[rid].get("allowed_uses", []), (
                f"Room {rid} does not allow exams for exam {e['exam_id']}"
            )

    # C. Sum of capacity // 2 >= exam size
    exams_by_id = {e["id"]: e for e in dataset_exams}
    for e in scheduled_exams:
        eid = e["exam_id"]
        size = exams_by_id[eid]["size"]
        seats = sum(rooms_by_id[rid]["capacity"] // 2 for rid in e["rooms"])
        assert seats >= size, (
            f"Exam {eid} of size {size} allocated only {seats} seats"
        )

    # D. No room double-booking
    room_occupancy: set[tuple[str, str, str]] = set()
    for e in scheduled_exams:
        day = e["day"]
        sess = e["session"]
        for rid in e["rooms"]:
            key = (rid, day, sess)
            assert key not in room_occupancy, f"Room double-booking: {key}"
            room_occupancy.add(key)

    # E. No group double-booking
    group_occupancy: set[tuple[str, str, str]] = set()
    for e in scheduled_exams:
        eid = e["exam_id"]
        day = e["day"]
        sess = e["session"]
        for g in exams_by_id[eid].get("groups", []):
            key = (g, day, sess)
            assert key not in group_occupancy, f"Group double-booking: {key}"
            group_occupancy.add(key)

    # F. Run through official validator check_exams
    hard_violations, exam_soft_penalty = validator_module.check_exams(official_ctx, scheduled_exams)
    assert len(hard_violations) == 0, f"Validator found hard violations: {hard_violations}"

    # G. Soft penalty reported and <= naive round robin
    assert exam_soft_penalty <= naive_soft_penalty, (
        f"Solver soft penalty ({exam_soft_penalty}) exceeds naive baseline ({naive_soft_penalty})"
    )
    assert exam_soft_penalty == 0, f"Expected 0 soft penalty, got {exam_soft_penalty}"
