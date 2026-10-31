"""Configuration for the OR-Tools CP-SAT timetable solver."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class SolverConfig:
    """Configurable solver parameters. Read from environment or arguments with fixed defaults."""

    time_limit_seconds: float = float(os.getenv("SOLVER_TIME_LIMIT", "45.0"))
    num_workers: int = int(os.getenv("SOLVER_NUM_WORKERS", str(os.cpu_count() or 8)))
    random_seed: int = int(os.getenv("SOLVER_RANDOM_SEED", "42"))

    # Soft penalty weights mirroring validator.py exactly
    s1_faculty_avoid_weight: int = 2
    s2_group_gap_weight: int = 1
    s3_group_overload_weight: int = 3
    s4_same_course_weight: int = 3
    s5_room_underutilized_weight: int = 1
    s6_p9_session_weight: int = 1
