"""Export the current schedule to JSON for validation."""

import sys
import os
from pathlib import Path

EXPORTS_DIR = Path(__file__).resolve().parent.parent / "exports"
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "cit_public.json"

BASELINE_OUT = EXPORTS_DIR / "schedule.json"
AFTER_OUT = EXPORTS_DIR / "schedule_after.json"


def main():
    """Load solver pipeline, generate schedule, write to exports/."""
    # Future workflow:
    # 1. Load dataset from DATA_PATH
    # 2. Run the constraint solver to produce a baseline schedule
    # 3. Write baseline to BASELINE_OUT
    # 4. If a disruption file is provided, re-solve and write to AFTER_OUT
    # 5. Print summary stats (sessions placed, utilization, conflicts)

    print("ERROR: The solver is not implemented yet.")
    print()
    print("This script will eventually:")
    print(f"  1. Load dataset from {DATA_PATH}")
    print(f"  2. Run the constraint solver")
    print(f"  3. Write baseline schedule to {BASELINE_OUT}")
    print(f"  4. Write post-disruption schedule to {AFTER_OUT}")
    print()
    print("Implement the solver in backend/app/solver/ first.")
    sys.exit(1)


if __name__ == "__main__":
    main()
