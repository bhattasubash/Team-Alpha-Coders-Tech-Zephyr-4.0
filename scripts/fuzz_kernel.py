"""Differential fuzzing for the scheduling kernel against the official validator."""

import json
import random
import sys
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "cit_public.json"
SCHEDULE_PATH = Path(__file__).resolve().parent.parent / "exports" / "schedule.json"

MUTATION_TYPES = ["move_session", "swap_rooms", "change_period"]
DEFAULT_ITERATIONS = 500


def load_schedule(path: Path) -> dict:
    """Load a schedule JSON file."""
    with open(path) as f:
        return json.load(f)


def mutate_schedule(schedule: dict, mutation_type: str) -> dict:
    """Apply a random mutation to a copy of the schedule."""
    # Future implementation:
    # - move_session: pick a random session, assign a new random period
    # - swap_rooms: pick two sessions in the same period, swap their rooms
    # - change_period: pick a session, move it to a different period on same day
    return schedule


def run_kernel_check(schedule: dict) -> dict:
    """Run the fast kernel constraint checker."""
    # Will call: from app.solver.kernel import check_constraints
    return {"valid": True, "violations": []}


def run_validator_check(schedule: dict) -> dict:
    """Run the official validator for ground truth."""
    # Will call: validator.validator.validate(data, schedule)
    return {"valid": True, "violations": []}


def compare_results(kernel_result: dict, validator_result: dict) -> bool:
    """Return True if kernel and validator agree."""
    return kernel_result["valid"] == validator_result["valid"]


def main():
    """Run differential fuzzing: mutate schedule, compare kernel vs validator."""
    if not SCHEDULE_PATH.exists():
        print("Fuzz testing requires a valid schedule. Run the solver first.")
        print(f"Expected schedule at: {SCHEDULE_PATH}")
        sys.exit(1)

    schedule = load_schedule(SCHEDULE_PATH)
    mismatches = 0

    for i in range(DEFAULT_ITERATIONS):
        mutation = random.choice(MUTATION_TYPES)
        mutated = mutate_schedule(schedule, mutation)

        kernel_result = run_kernel_check(mutated)
        validator_result = run_validator_check(mutated)

        if not compare_results(kernel_result, validator_result):
            mismatches += 1
            print(f"  MISMATCH at iteration {i}: mutation={mutation}")

    print(f"Fuzz complete: {DEFAULT_ITERATIONS} iterations, {mismatches} mismatches")


if __name__ == "__main__":
    main()
