"""Export complete schedule to exports/schedule.json and exports/schedule_after.json.

Milestone 6 & New Item N1:
Integrates:
- Baseline Timetable Solver with booking reservations (Milestone 3 & Fix F2)
- Exam Solver (Milestone 4)
- Spectra Week Booking Engine (Milestone 5 & Fix F2)
- Reschedule Solver on sample_disruption.json (Fix F1 & New Item N1)

Outputs exports/schedule.json and exports/schedule_after.json, verified with the official validator.
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
from app.bookings.engine import BookingEngine, reservations_for_bookings  # noqa: E402
from app.kernel.pipeline import apply_disruption_dict  # noqa: E402
from app.solver.exams import ExamSolver  # noqa: E402
from app.solver.model import TimetableSolver  # noqa: E402
from app.solver.reschedule import RescheduleSolver  # noqa: E402


def build_schedule(
    data: dict,
    team_name: str,
    output_path: Path,
) -> dict:
    """Generate and assemble full schedule: timetable + exams + fest week bookings."""
    dataset_id = data.get("dataset_id")
    print(f"Generating schedule for dataset: {dataset_id}")
    print(f"Team: {team_name}")

    # 1. Booking reservations & Timetable
    print("Computing booking reservations against empty timetable...")
    blocked_rooms, blocked_groups = reservations_for_bookings(data)
    print(f"Reserved {len(blocked_rooms)} room slots and {len(blocked_groups)} group slots for bookings")

    print("Solving timetable with CP-SAT solver...")
    solver = TimetableSolver(
        data,
        blocked_room_slots=blocked_rooms,
        blocked_group_slots=blocked_groups,
    )
    res = solver.solve_two_phase(feasibility_limit=35.0, optimize_limit=25.0)
    if res.schedule is None:
        raise RuntimeError("Timetable solver failed to find a feasible solution")
    timetable_schedule = res.schedule
    sessions_list = timetable_schedule["sessions"]
    print(f"Timetable sessions: {len(sessions_list)} (soft penalty: {res.soft_penalty})")

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


def build_schedule_after(
    data: dict,
    baseline_schedule: dict,
    disruption: dict,
    team_name: str,
    output_path: Path,
) -> dict:
    """Generate disrupted schedule (schedule_after.json) using RescheduleSolver."""
    print()
    print("=" * 70)
    print("SOLVING RESCHEDULE ON DISRUPTION FOR schedule_after.json")
    print("=" * 70)

    disrupted_data = apply_disruption_dict(data, disruption)
    dis_rooms, dis_groups = reservations_for_bookings(disrupted_data)

    solver = RescheduleSolver(
        disrupted_data,
        baseline_schedule,
        blocked_room_slots=dis_rooms,
        blocked_group_slots=dis_groups,
    )
    result = solver.solve()
    if result.schedule is None:
        raise RuntimeError("Reschedule solver failed to find a feasible solution")

    print(f"Reschedule complete: status={result.status}, moved={result.moved_count} "
          f"(forced={result.forced_moves}, knock-on={result.knock_on_moves}, "
          f"time_changed={result.time_changed_count}, room_only={result.room_only_changed_count})")

    # Exams
    exam_solver = ExamSolver(disrupted_data)
    exams_list = exam_solver.solve()

    # Bookings on disrupted schedule
    booking_engine = BookingEngine(disrupted_data, result.schedule)
    fest_week_after = booking_engine.decide_all()

    schedule_after = {
        "dataset_id": disrupted_data.get("dataset_id"),
        "team": team_name,
        "sessions": result.schedule["sessions"],
        "exams": exams_list,
        "fest_week": {
            "bookings": fest_week_after["bookings"],
            "decisions": fest_week_after["bookings"],
            "session_overrides": fest_week_after["session_overrides"],
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schedule_after, f, indent=2)

    print(f"Successfully exported schedule_after to: {output_path}")
    return schedule_after, disrupted_data


def print_validator_report(report: dict) -> None:
    """Print formatted summary of official validator report."""
    print(f"Dataset: {report['dataset_id']}   Schedule: {report.get('schedule_dataset_id')}   Team: {report.get('team')}")
    print(f"Hard violations: {report['hard_violation_count']}  {report.get('hard_by_rule', {})}")
    for x in report.get("hard_violations", []):
        print(f"  [{x['rule']}] ({x['where']}) {x['detail']}")

    print(f"Soft penalty total: {report.get('soft_total', 0)}")
    if "soft_penalties" in report:
        print(f"Soft penalties breakdown: {json.dumps(report['soft_penalties'], indent=2)}")

    if "exam_soft_penalty" in report:
        print(f"Exam soft penalty: {report['exam_soft_penalty']}")

    if "bookings" in report:
        b = report["bookings"]
        print(f"Bookings: score {b['booking_score']} / {b['booking_score_max_if_all_approved']}")
        print(f"  Approved: {b['approved']}, Alternatives: {b['alternatives']}, Rejected: {b['rejected']}")
        print(f"  Session overrides: {b['session_overrides']}, Priority inversions: {len(b['priority_inversions'])}")

    if "stability" in report:
        st = report["stability"]
        print(f"Stability: {st.get('sessions_moved', 0)} sessions moved "
              f"({st.get('time_changed', 0)} changed time, {st.get('room_only_changed', 0)} room only), "
              f"stability penalty: {st.get('stability_penalty', 0)}")

    if report.get("warnings"):
        print(f"Warnings ({len(report['warnings'])}):")
        for w in report["warnings"]:
            print(f"  [warning] {w}")


def main() -> None:
    """Parse CLI args, build schedule.json & schedule_after.json, and run validator."""
    parser = argparse.ArgumentParser(description="Export schedule.json and schedule_after.json and verify.")
    parser.add_argument(
        "--data",
        type=Path,
        default=ROOT_DIR / "data" / "cit_public.json",
        help="Path to input dataset JSON",
    )
    parser.add_argument(
        "--disruption",
        type=Path,
        default=ROOT_DIR / "data" / "sample_disruption.json",
        help="Path to sample disruption JSON",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT_DIR / "exports" / "schedule.json",
        help="Path to output schedule JSON",
    )
    parser.add_argument(
        "--output-after",
        type=Path,
        default=ROOT_DIR / "exports" / "schedule_after.json",
        help="Path to output schedule_after JSON",
    )
    args = parser.parse_args()

    team_name = os.getenv("TEAM_NAME", "CIT Scheduler")

    with open(args.data, encoding="utf-8") as f:
        data = json.load(f)

    with open(args.disruption, encoding="utf-8") as f:
        disruption = json.load(f)

    # 1. Build exports/schedule.json
    baseline_sched = build_schedule(
        data=data,
        team_name=team_name,
        output_path=args.output,
    )

    # 2. Build exports/schedule_after.json
    sched_after, disrupted_data = build_schedule_after(
        data=data,
        baseline_schedule=baseline_sched,
        disruption=disruption,
        team_name=team_name,
        output_path=args.output_after,
    )

    # 3. Run official validator on exports/schedule.json
    print()
    print("=" * 70)
    print("VALIDATING exports/schedule.json")
    print("=" * 70)
    report_base = validator.run(data, baseline_sched)
    print_validator_report(report_base)

    from datetime import UTC, datetime
    val_summary = {
        "hard_violations": report_base["hard_violation_count"],
        "soft_penalty": report_base.get("soft_total", 0),
        "booking_score": float(report_base.get("bookings", {}).get("booking_score", 0.0)),
        "time_run": datetime.now(UTC).isoformat(),
    }
    with open(ROOT_DIR / "exports" / "validator_report.json", "w", encoding="utf-8") as f:
        json.dump(val_summary, f, indent=2)

    if report_base["hard_violation_count"] > 0:
        print("\nERROR: Official validator reported hard violations on baseline schedule!")
        sys.exit(1)

    # 4. Run official validator on exports/schedule_after.json with baseline
    print()
    print("=" * 70)
    print("VALIDATING exports/schedule_after.json (WITH BASELINE)")
    print("=" * 70)
    report_after = validator.run(disrupted_data, sched_after, baseline=baseline_sched)
    print_validator_report(report_after)

    if report_after["hard_violation_count"] > 0:
        print("\nERROR: Official validator reported hard violations on schedule_after!")
        sys.exit(1)

    print("\nSUCCESS: Both schedule.json and schedule_after.json verified cleanly (0 hard violations)!")


if __name__ == "__main__":
    main()
