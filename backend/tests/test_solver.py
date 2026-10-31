"""Tests for the CP-SAT timetable solver: domain pruning and feasibility."""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from app.kernel.context import KernelContext
from app.solver.config import SolverConfig
from app.solver.domain import prune_session_domains
from app.solver.model import TimetableSolver


def test_domain_pruning(dataset):
    """Verify domain pruning produces non-empty legal domains respecting all static rules."""
    ctx = KernelContext(dataset)
    domains = prune_session_domains(dataset, ctx)

    assert len(domains) == len(dataset["sessions"])
    for s in dataset["sessions"]:
        sid = s["id"]
        legal_triples = domains[sid]
        assert len(legal_triples) > 0, f"Session {sid} has an empty domain"

        dur = s["duration"]
        kind = s.get("kind")
        needs_acc = s.get("needs_accessible", False)
        size = s["size"]
        room_types = set(s["room_types"])

        for d, t, r in legal_triples:
            assert d in ctx.days
            assert 1 <= t <= 9 - dur + 1
            # Lunch break check
            assert not (t <= ctx.lunch < t + dur - 1)
            # Lab starts
            if kind == "lab":
                assert t in ctx.lab_starts
            # Room constraints
            room = ctx.rooms[r]
            assert room["type"] in room_types
            assert room["capacity"] >= size
            if needs_acc:
                assert room["accessible"]


@pytest.mark.slow
def test_solve_feasibility_zero_hard_violations(dataset, validator_module):
    """Sub-step 3A: Solve feasibility only, write to scratch path, verify 0 hard violations."""
    config = SolverConfig(time_limit_seconds=30.0, num_workers=8, random_seed=42)
    solver = TimetableSolver(dataset, config=config)

    result = solver.solve_initial(include_soft_objective=False)
    assert result.status in ("FEASIBLE", "OPTIMAL")
    assert result.assignments is not None
    assert len(result.assignments) == len(dataset["sessions"])

    # Write temporary schedule to scratch path (NOT in exports/)
    scratch_dir = Path("backend/scratch")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    temp_path = scratch_dir / "schedule_feasibility_3a.json"
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(result.schedule, f, indent=2)

    # Validate with official validator
    official_ctx = validator_module.Ctx(dataset)
    timetable_violations, _ = validator_module.check_timetable(
        official_ctx,
        result.assignments,
        "timetable",
    )

    assert len(timetable_violations) == 0, f"Found hard violations: {timetable_violations}"


@pytest.mark.slow
def test_solve_two_phase_soft_objective(dataset, validator_module):
    """Sub-step 3B: Solve two-phase with soft objective, verify 0 hard violations and score."""
    config = SolverConfig(time_limit_seconds=60.0, num_workers=8, random_seed=42)
    solver = TimetableSolver(dataset, config=config)

    result = solver.solve_two_phase(feasibility_limit=35.0, optimize_limit=25.0)
    assert result.status in ("FEASIBLE", "OPTIMAL")
    assert result.assignments is not None
    assert len(result.assignments) == len(dataset["sessions"])

    # Write temporary schedule to scratch path (NOT in exports/)
    scratch_dir = Path("backend/scratch")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    temp_path = scratch_dir / "schedule_soft_3b.json"
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(result.schedule, f, indent=2)

    # Validate with official validator
    official_ctx = validator_module.Ctx(dataset)
    timetable_violations, _ = validator_module.check_timetable(
        official_ctx,
        result.assignments,
        "timetable",
    )
    assert len(timetable_violations) == 0, f"Found hard violations: {timetable_violations}"

    # Official validator soft score check
    soft_dict, total_soft = validator_module.soft_score(official_ctx, result.assignments)
    assert total_soft == result.soft_penalty
    assert isinstance(soft_dict, dict)

