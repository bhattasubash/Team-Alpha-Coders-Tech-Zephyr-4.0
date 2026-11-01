"""Background solver job execution runner for Milestone 8 (Persistence and Jobs).

Runs CP-SAT timetable generation and optimization in background daemon threads,
tracking phases, elapsed seconds, solver status, and soft penalty scores.
Upon successful solve, commits the new schedule_state through the kernel repository.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from pathlib import Path
from typing import Any

from app.bookings.engine import BookingEngine, reservations_for_bookings
from app.db.repository import (
    commit_new_schedule,
    create_job,
    get_active_dataset,
    get_active_schedule,
    get_job,
    get_running_job,
    log_audit,
    update_job,
)
from app.solver.config import SolverConfig
from app.solver.exams import ExamSolver
from app.solver.model import TimetableSolver

logger = logging.getLogger(__name__)

# In-memory tracking of active job start timestamps
ACTIVE_JOB_TIMERS: dict[str, float] = {}


def get_job_metrics(job: dict[str, Any]) -> dict[str, Any]:
    """Calculate real-time elapsed seconds and progress for a job."""
    job_id = job["id"]
    status_lower = str(job["status"]).lower()

    if status_lower == "completed":
        return {
            "elapsed": float(job.get("elapsed_seconds") or 0.0),
            "progress": 1.0,
        }
    if status_lower in ("running", "queued"):
        start = ACTIVE_JOB_TIMERS.get(job_id)
        if start:
            elapsed = round(time.time() - start, 2)
            # Estimate progress up to 95% while solving
            progress = min(0.95, round(elapsed / 30.0, 2))
            return {"elapsed": elapsed, "progress": progress}
        return {
            "elapsed": float(job.get("elapsed_seconds") or 0.0),
            "progress": 0.5,
        }
    return {
        "elapsed": float(job.get("elapsed_seconds") or 0.0),
        "progress": 0.0,
    }


def run_timetable_solve_job(
    job_id: str,
    time_limit_seconds: int = 30,
    random_seed: int = 42,
    team_name: str = "Team Alpha Coders",
) -> None:
    """Execute background timetable generation with CP-SAT and commit to database."""
    start_time = time.time()
    ACTIVE_JOB_TIMERS[job_id] = start_time
    try:
        update_job(
            job_id=job_id,
            status="RUNNING",
            phase="Phase 1: Booking Reservations",
            elapsed_seconds=0.0,
            solver_status="UNKNOWN",
        )

        data = get_active_dataset()
        if not data:
            data_path = Path("data/cit_public.json")
            if not data_path.exists():
                data_path = Path(__file__).resolve().parents[3] / "data" / "cit_public.json"
            with open(data_path, encoding="utf-8") as f:
                data = json.load(f)

        dataset_id = data.get("dataset_id", "cit-public-v1")

        # Phase 1: Booking reservations against empty timetable
        blocked_rooms, blocked_groups = reservations_for_bookings(data)
        elapsed = round(time.time() - start_time, 2)
        update_job(
            job_id=job_id,
            status="RUNNING",
            phase="Phase 2: Timetable Solve",
            elapsed_seconds=elapsed,
            solver_status="UNKNOWN",
        )

        # Extract hints from active schedule or exports/schedule.json for warm-start
        active_sched = get_active_schedule()
        if not active_sched or "sessions" not in active_sched:
            sched_path = Path("exports/schedule.json")
            if not sched_path.exists():
                sched_path = Path(__file__).resolve().parents[3] / "exports" / "schedule.json"
            if sched_path.exists():
                try:
                    with open(sched_path, encoding="utf-8") as f:
                        active_sched = json.load(f)
                except Exception:
                    pass

        hint_assignments = None
        if active_sched and "sessions" in active_sched:
            hint_assignments = {
                (s.get("session_id") or s.get("id")): (s["day"], s["start_period"], s["room_id"])
                for s in active_sched["sessions"]
                if (s.get("session_id") or s.get("id")) and "day" in s and "start_period" in s and "room_id" in s
            }

        # Phase 2: Solve Timetable
        config = SolverConfig(
            time_limit_seconds=float(time_limit_seconds),
            random_seed=random_seed,
        )
        solver = TimetableSolver(
            data,
            config=config,
            blocked_room_slots=blocked_rooms,
            blocked_group_slots=blocked_groups,
        )

        feasibility_limit = max(60.0, float(time_limit_seconds) * 0.75)
        optimize_limit = max(5.0, float(time_limit_seconds) * 0.25)
        res = solver.solve_two_phase(
            feasibility_limit=feasibility_limit,
            optimize_limit=optimize_limit,
            hint_assignments=hint_assignments,
        )

        if res.assignments is None or res.schedule is None:
            if active_sched and "sessions" in active_sched:
                logger.warning("Solver timed out without assignment; falling back to stored verified baseline.")
                res = solver.solve_initial(hint_assignments=hint_assignments, time_limit_override=0.1)

        if res.assignments is None or res.schedule is None:
            elapsed = round(time.time() - start_time, 2)
            update_job(
                job_id=job_id,
                status="FAILED",
                phase="Failed",
                elapsed_seconds=elapsed,
                solver_status=res.status,
                error_message="Timetable solver could not find a feasible solution",
            )
            return

        # Phase 3: Kernel Commit (Exams, Bookings, Full Assembly)
        elapsed = round(time.time() - start_time, 2)
        update_job(
            job_id=job_id,
            status="RUNNING",
            phase="Phase 3: Kernel Commit",
            elapsed_seconds=elapsed,
            best_soft_score=float(res.soft_penalty),
            solver_status=res.status,
        )

        exam_solver = ExamSolver(data)
        exams_list = exam_solver.solve()

        booking_engine = BookingEngine(data, res.schedule)
        fest_week = booking_engine.decide_all()

        full_schedule = {
            "dataset_id": dataset_id,
            "team": team_name,
            "sessions": res.schedule["sessions"],
            "exams": exams_list,
            "fest_week": {
                "bookings": fest_week["bookings"],
                "decisions": fest_week["bookings"],
                "session_overrides": fest_week["session_overrides"],
            },
        }

        # Commit through the kernel
        new_version = commit_new_schedule(full_schedule, dataset_id=dataset_id)
        log_audit(
            action="generate_timetable",
            proposal_id=None,
            proposer_id="system",
            approver_id="system",
            detail={
                "job_id": job_id,
                "version": new_version,
                "sessions_count": len(full_schedule["sessions"]),
                "soft_penalty": res.soft_penalty,
                "solver_status": res.status,
            },
        )

        elapsed = round(time.time() - start_time, 2)
        update_job(
            job_id=job_id,
            status="COMPLETED",
            phase="Completed",
            elapsed_seconds=elapsed,
            best_soft_score=float(res.soft_penalty),
            solver_status=res.status,
            result_json=json.dumps({
                "version": new_version,
                "sessions_count": len(full_schedule["sessions"]),
                "soft_penalty": res.soft_penalty,
            }),
        )

    except Exception as exc:
        logger.exception("Error running timetable job %s", job_id)
        elapsed = round(time.time() - start_time, 2)
        update_job(
            job_id=job_id,
            status="FAILED",
            phase="Failed",
            elapsed_seconds=elapsed,
            solver_status="ERROR",
            error_message=str(exc),
        )
    finally:
        ACTIVE_JOB_TIMERS.pop(job_id, None)


def run_timetable_optimise_job(
    job_id: str,
    time_limit_seconds: int = 30,
    random_seed: int = 42,
    team_name: str = "Team Alpha Coders",
) -> None:
    """Execute background timetable optimization with CP-SAT using active schedule as hint."""
    start_time = time.time()
    ACTIVE_JOB_TIMERS[job_id] = start_time
    try:
        update_job(
            job_id=job_id,
            status="RUNNING",
            phase="Phase 1: Booking Reservations",
            elapsed_seconds=0.0,
            solver_status="UNKNOWN",
        )

        data = get_active_dataset()
        if not data:
            data_path = Path("data/cit_public.json")
            if not data_path.exists():
                data_path = Path(__file__).resolve().parents[3] / "data" / "cit_public.json"
            with open(data_path, encoding="utf-8") as f:
                data = json.load(f)

        dataset_id = data.get("dataset_id", "cit-public-v1")
        blocked_rooms, blocked_groups = reservations_for_bookings(data)

        # Extract hints from active schedule
        active_sched = get_active_schedule()
        hint_assignments = None
        if active_sched and "sessions" in active_sched:
            hint_assignments = {
                (s.get("session_id") or s.get("id")): (s["day"], s["start_period"], s["room_id"])
                for s in active_sched["sessions"]
                if (s.get("session_id") or s.get("id")) and "day" in s and "start_period" in s and "room_id" in s
            }

        elapsed = round(time.time() - start_time, 2)
        update_job(
            job_id=job_id,
            status="RUNNING",
            phase="Phase 2: Timetable Optimization",
            elapsed_seconds=elapsed,
            solver_status="UNKNOWN",
        )

        config = SolverConfig(
            time_limit_seconds=float(time_limit_seconds),
            random_seed=random_seed,
        )
        solver = TimetableSolver(
            data,
            config=config,
            blocked_room_slots=blocked_rooms,
            blocked_group_slots=blocked_groups,
        )

        res = solver.solve_initial(
            include_soft_objective=True,
            hint_assignments=hint_assignments,
            time_limit_override=float(time_limit_seconds),
        )

        if res.assignments is None or res.schedule is None:
            elapsed = round(time.time() - start_time, 2)
            update_job(
                job_id=job_id,
                status="FAILED",
                phase="Failed",
                elapsed_seconds=elapsed,
                solver_status=res.status,
                error_message="Optimization solver failed to find an improved solution",
            )
            return

        elapsed = round(time.time() - start_time, 2)
        update_job(
            job_id=job_id,
            status="RUNNING",
            phase="Phase 3: Kernel Commit",
            elapsed_seconds=elapsed,
            best_soft_score=float(res.soft_penalty),
            solver_status=res.status,
        )

        exam_solver = ExamSolver(data)
        exams_list = exam_solver.solve()

        booking_engine = BookingEngine(data, res.schedule)
        fest_week = booking_engine.decide_all()

        full_schedule = {
            "dataset_id": dataset_id,
            "team": team_name,
            "sessions": res.schedule["sessions"],
            "exams": exams_list,
            "fest_week": {
                "bookings": fest_week["bookings"],
                "decisions": fest_week["bookings"],
                "session_overrides": fest_week["session_overrides"],
            },
        }

        new_version = commit_new_schedule(full_schedule, dataset_id=dataset_id)
        log_audit(
            action="optimise_timetable",
            proposal_id=None,
            proposer_id="system",
            approver_id="system",
            detail={
                "job_id": job_id,
                "version": new_version,
                "sessions_count": len(full_schedule["sessions"]),
                "soft_penalty": res.soft_penalty,
                "solver_status": res.status,
            },
        )

        elapsed = round(time.time() - start_time, 2)
        update_job(
            job_id=job_id,
            status="COMPLETED",
            phase="Completed",
            elapsed_seconds=elapsed,
            best_soft_score=float(res.soft_penalty),
            solver_status=res.status,
            result_json=json.dumps({
                "version": new_version,
                "sessions_count": len(full_schedule["sessions"]),
                "soft_penalty": res.soft_penalty,
            }),
        )

    except Exception as exc:
        logger.exception("Error running timetable optimize job %s", job_id)
        elapsed = round(time.time() - start_time, 2)
        update_job(
            job_id=job_id,
            status="FAILED",
            phase="Failed",
            elapsed_seconds=elapsed,
            solver_status="ERROR",
            error_message=str(exc),
        )
    finally:
        ACTIVE_JOB_TIMERS.pop(job_id, None)
