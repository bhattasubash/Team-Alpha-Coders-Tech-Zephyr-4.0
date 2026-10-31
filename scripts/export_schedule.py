"""Export complete schedule to exports/schedule.json and run the official validator.

Milestone 6: EXPORT AND VERIFY
Integrates:
- Baseline Timetable Solver (Milestone 3)
- Exam Solver (Milestone 4)
- Spectra Week Booking Engine (Milestone 5)
Outputs exports/schedule.json and verifies 0 hard violations with the official validator.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Add backend and validator to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))
sys.path.insert(0, str(ROOT_DIR / "validator"))

import validator  # noqa: E402
from app.bookings.engine import BookingEngine  # noqa: E402
from app.solver.exams import ExamSolver  # noqa: E402
from app.solver.model import TimetableSolver  # noqa: E402


def build_schedule(
    data_path: Path,
    output_path: Path,
    use_scratch_cache: bool = True,
) -> dict:
    """Generate and assemble full schedule: timetable + exams + fest week bookings."""
    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)

    dataset_id = data.get("dataset_id")
    team_name = os.getenv("TEAM_NAME", "CIT Scheduler")

    print(f"Generating schedule for dataset: {dataset_id}")
    print(f"Team: {team_name}")

    # 1. Baseline Timetable
    scratch_timetable = ROOT_DIR / "backend" / "scratch" / "schedule_soft_3b.json"
    timetable_schedule = None
    if use_scratch_cache and scratch_timetable.exists():
        try:
            with open(scratch_timetable, encoding="utf-8") as f:
                cached = json.load(f)
                if cached.get("dataset_id") == dataset_id and "sessions" in cached:
                    print("Using cached optimal timetable from scratch/schedule_soft_3b.json")
                    timetable_schedule = cached
        except Exception:
            timetable_schedule = None

    if timetable_schedule is None:
        print("Solving timetable with CP-SAT solver...")
        solver = TimetableSolver(data)
        res = solver.solve_two_phase(feasibility_limit=20.0, optimize_limit=25.0)
        if res.schedule is None:
            raise RuntimeError("Timetable solver failed to find a feasible solution")
        timetable_schedule = res.schedule

    sessions_list = timetable_schedule["sessions"]
    print(f"Timetable sessions: {len(sessions_list)}")

    # 2. Exam Scheduling
    print("Solving exam schedule with CP-SAT exam solver...")
    exam_solver = ExamSolver(data)
    exams_list = exam_solver.solve()
    print(f"Scheduled exams: {len(exams_list)}")

    # 3. Spectra Week Bookings
    print("Deciding Spectra week bookings with BookingEngine...")
    booking_engine = BookingEngine(data, timetable_schedule)
    fest_week = booking_engine.decide_all()
    print(f"Booking decisions: {len(fest_week['bookings'])}, Session overrides: {len(fest_week['session_overrides'])}")

    # 4. Assemble Full Submission Schedule
    full_schedule = {
        "dataset_id": dataset_id,
        "team": team_name,
        "sessions": sessions_list,
        "exams": exams_list,
        "fest_week": {
            "bookings": fest_week["bookings"],
            "decisions": fest_week["bookings"],
            "session_overrides": fest_week["session_overrides"],
        },
    }

    # 5. Write to output path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(full_schedule, f, indent=2)

    print(f"Successfully exported schedule to: {output_path}")
    return full_schedule


def main() -> None:
    """Parse CLI args, build schedule, and run official validator."""
    parser = argparse.ArgumentParser(description="Export schedule and verify with official validator.")
    parser.add_argument(
        "--data",
        type=Path,
        default=ROOT_DIR / "data" / "cit_public.json",
        help="Path to input dataset JSON",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT_DIR / "exports" / "schedule.json",
        help="Path to output schedule JSON",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Force re-solving timetable from scratch",
    )
    args = parser.parse_args()

    # Build schedule
    build_schedule(
        data_path=args.data,
        output_path=args.output,
        use_scratch_cache=not args.no_cache,
    )

    # Run official validator
    print()
    print("=" * 70)
    print("RUNNING OFFICIAL VALIDATOR ON exports/schedule.json")
    print("=" * 70)

    with open(args.data, encoding="utf-8") as f:
        data = json.load(f)
    with open(args.output, encoding="utf-8") as f:
        sched = json.load(f)

    report = validator.run(data, sched)

    print(f"Dataset: {report['dataset_id']}   Schedule: {report['schedule_dataset_id']}   Team: {report['team']}")
    print(f"Hard violations: {report['hard_violation_count']}  {report['hard_by_rule']}")
    for x in report["hard_violations"]:
        print(f"  [{x['rule']}] ({x['where']}) {x['detail']}")

    print(f"Soft penalty total: {report['soft_total']}")
    print(f"Soft penalties breakdown: {json.dumps(report['soft_penalties'], indent=2)}")

    if "exam_soft_penalty" in report:
        print(f"Exam soft penalty: {report['exam_soft_penalty']}")

    if "bookings" in report:
        b = report["bookings"]
        print(f"Bookings: score {b['booking_score']} / {b['booking_score_max_if_all_approved']}")
        print(f"  Approved: {b['approved']}, Alternatives: {b['alternatives']}, Rejected: {b['rejected']}")
        print(f"  Session overrides: {b['session_overrides']}, Priority inversions: {len(b['priority_inversions'])}")
        for inv in b["priority_inversions"]:
            print(f"  [inversion] {inv}")

    if report["warnings"]:
        print(f"Warnings ({len(report['warnings'])}):")
        for w in report["warnings"]:
            print(f"  [warning] {w}")

    if report["hard_violation_count"] > 0:
        print("\nERROR: Official validator reported hard violations!")
        sys.exit(1)

    print("\nSUCCESS: All hard violations are ZERO. Official validator passed cleanly.")


if __name__ == "__main__":
    main()
