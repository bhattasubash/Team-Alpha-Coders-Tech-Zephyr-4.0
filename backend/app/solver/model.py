"""CP-SAT solver for timetable generation and rescheduling.

Engine: OR-Tools CP-SAT. This module builds the constraint model, runs the solve,
and returns a schedule proposal through the pipeline.

Not yet implemented. The solver is P0 priority (section 3 of STRATEGY.md).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class SolverResult:
    """Output from a solver run."""

    status: str  # OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
    assignments: dict[str, tuple[str, int, str]] | None = None
    soft_penalty: int = 0
    sessions_moved: int = 0
    solve_time_seconds: float = 0.0
    is_proven_optimal: bool = False


class TimetableSolver:
    """Builds and solves the CP-SAT model for CIT scheduling.

    Variables per session: day, start period, room (boolean assignment over legal triples).
    Domain pruning removes triples that break lunch, lab start, room type, capacity,
    accessibility, room maintenance, and faculty unavailability.
    """

    def __init__(self, data: dict[str, Any], time_limit: int = 30, seed: int = 42) -> None:
        """Store dataset and solver parameters."""
        self.data = data
        self.time_limit = time_limit
        self.seed = seed

    def solve_initial(self) -> SolverResult:
        """Generate a zero-violation schedule from scratch.

        Phase 1: find any feasible solution. Phase 2: optimise soft penalty.
        """
        # TODO(subash): build the CP-SAT model with domain pruning
        raise NotImplementedError(
            "Initial solver not built yet. Listed in DECISIONS.md as pending."
        )

    def solve_reschedule(
        self,
        current: dict[str, tuple[str, int, str]],
        disruption: dict[str, Any] | None = None,
    ) -> SolverResult:
        """Minimal-move reschedule from the current timetable after a disruption.

        Warm-starts from current. Objective: hard constraints first, then minimize
        moved sessions, then soft penalty.
        """
        raise NotImplementedError(
            "Rescheduling solver not built yet. Listed in DECISIONS.md as pending."
        )

    def explain_infeasible(self) -> list[str]:
        """Extract conflicting constraint groups when the model is infeasible.

        Uses assumption literals and deletion-based minimization to find the
        smallest set of conflicting rules.
        """
        raise NotImplementedError(
            "Infeasibility explanation not built yet. Listed in DECISIONS.md as pending."
        )
