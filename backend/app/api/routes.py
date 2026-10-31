"""Complete API route definitions implementing the CIT Campus Scheduling API contract.

Endpoints without business logic raise NotImplementedError, which is transformed
by the global exception handler into HTTP 501 with the standardized error envelope:
{"error": {"code": "NOT_IMPLEMENTED", "message": "...", "details": [...]}}
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import threading
import time
from datetime import datetime, UTC
from typing import Any, Literal
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status

from app.api.schemas import (
    AdminResetResponse,
    ApproveProposalResponse,
    AssistantRequest,
    AssistantResponse,
    BookingCancelResponse,
    BookingDecideResponse,
    BookingDecision,
    BookingPrecheckResult,
    BookingsListResponse,
    CreateBookingRequest,
    DashboardResponse,
    DisruptionsPreviewRequest,
    ErrorEnvelope,
    ExamAssignment,
    ExamsResponse,
    ExplainBookingResponse,
    ExplainSessionResponse,
    FieldProvenance,
    FreeRoom,
    FreeRoomsResponse,
    FuzzRunSummary,
    GenerateExamsRequest,
    GenerateTimetableRequest,
    HealthResponse,
    JobStatusResponse,
    LegalSlot,
    LegalSlotsResponse,
    LoginRequest,
    MetaResponse,
    OfficialValidationResponse,
    OptimiseTimetableRequest,
    ParseBookingResponse,
    ParseBookingTextRequest,
    ProofSummaryResponse,
    Proposal,
    ProposalListResponse,
    RejectProposalRequest,
    RoomUtilisationItem,
    SessionAssignment,
    SessionMoveRequest,
    SlotMove,
    TimetableAllResponse,
    TimetableViewResponse,
    TokenResponse,
    UserProfileResponse,
    ValidationReportResponse,
    ValidatorRunSummary,
    ViolationItem,
)
from app.auth.users import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_optional_user,
    require_role,
)
from app.ai.provider import LLMProvider
from app.bookings.engine import BookingEngine
from app.db.connection import get_connection
from app.db.repository import (
    commit_new_schedule,
    create_job,
    get_active_dataset,
    get_active_schedule,
    get_booking as db_get_booking,
    get_job,
    get_proposal,
    get_running_job,
    list_bookings as db_list_bookings,
    list_proposals,
    log_audit,
    reset_database as db_reset_database,
    save_booking as db_save_booking,
    save_proposal,
    update_booking_status as db_update_booking_status,
    update_proposal_status,
)
from app.explain.engine import ExplainEngine
from app.jobs.runner import (
    get_job_metrics,
    run_timetable_optimise_job,
    run_timetable_solve_job,
)
from app.kernel.context import KernelContext
from app.kernel.pipeline import (
    GLOBAL_PROPOSAL_STORE,
    approve_proposal_pipeline,
    propose_reschedule,
    reject_proposal_pipeline,
)
from app.kernel.validate import (
    check_bookings,
    check_exam_soft,
    to_assign,
    validate_schedule,
)
from app.solver.domain import prune_session_domains
from app.solver.exams import ExamSolver

router = APIRouter()
llm_provider = LLMProvider()

# Common responses for Swagger / OpenAPI documentation
RESPONSES_501 = {
    501: {"model": ErrorEnvelope, "description": "Not implemented yet (API contract placeholder)"},
    401: {"model": ErrorEnvelope, "description": "Unauthenticated"},
    403: {"model": ErrorEnvelope, "description": "Forbidden"},
}


# =============================================================================
# Health & Proof Metrics State & Helpers
# =============================================================================

SERVER_START_TIME = time.time()
GLOBAL_LAST_GENERATE_STATUS: str | None = None
GLOBAL_LAST_VALIDATOR_RESULT: dict[str, Any] | None = None


def get_git_commit() -> str | None:
    """Retrieve git commit SHA from env GIT_SHA or git rev-parse."""
    sha = os.getenv("GIT_SHA")
    if sha:
        return sha
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=2,
            cwd=Path(__file__).resolve().parents[3],
        )
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()
    except Exception:
        pass
    return None


def is_solver_available() -> bool:
    """Check if OR-Tools CP-SAT is available."""
    try:
        import ortools  # noqa: F401
        return True
    except ImportError:
        return False


def get_ortools_version() -> str | None:
    """Get installed ortools version."""
    try:
        import ortools
        return ortools.__version__
    except Exception:
        return None


def parse_fuzz_report() -> FuzzRunSummary | None:
    """Parse latest differential fuzz run from docs/fuzz-report.md."""
    fuzz_path = Path("docs/fuzz-report.md")
    if not fuzz_path.exists():
        fuzz_path = Path(__file__).resolve().parents[3] / "docs" / "fuzz-report.md"
    if not fuzz_path.exists():
        return None
    try:
        content = fuzz_path.read_text(encoding="utf-8")
        cases = None
        mismatches = None
        seed = None
        date = None
        for line in content.splitlines():
            s = line.strip()
            if s.startswith("- Total cases executed:"):
                cases = int(s.split(":")[-1].strip())
            elif s.startswith("- Mismatches detected:"):
                mismatches = int(s.split(":")[-1].strip())
            elif s.startswith("- Seed:"):
                seed = int(s.split(":")[-1].strip())
            elif s.startswith("- Date:"):
                date = s.split(":")[-1].strip()
        if cases is not None and mismatches is not None:
            return FuzzRunSummary(cases=cases, mismatches=mismatches, seed=seed, date=date)
    except Exception:
        pass
    return None


def parse_redteam_pass_rate() -> float | str | None:
    """Parse latest red-team pass rate from docs/redteam-report.md (or None if N/A)."""
    red_path = Path("docs/redteam-report.md")
    if not red_path.exists():
        red_path = Path(__file__).resolve().parents[3] / "docs" / "redteam-report.md"
    if not red_path.exists():
        return None
    try:
        content = red_path.read_text(encoding="utf-8")
        for line in content.splitlines():
            s = line.strip()
            if s.startswith("Pass rate:"):
                val = s.split(":", 1)[1].strip()
                if "N/A" in val or "no cases executed" in val:
                    return None
                if "%" in val:
                    return float(val.replace("%", "").strip())
                try:
                    return float(val)
                except ValueError:
                    return val
    except Exception:
        pass
    return None


def get_last_validator_result() -> ValidatorRunSummary | None:
    """Retrieve last official validator result or None if never run."""
    if GLOBAL_LAST_VALIDATOR_RESULT is not None:
        return ValidatorRunSummary(**GLOBAL_LAST_VALIDATOR_RESULT)
    rep_path = Path("exports/validator_report.json")
    if not rep_path.exists():
        rep_path = Path(__file__).resolve().parents[3] / "exports" / "validator_report.json"
    if rep_path.exists():
        try:
            with open(rep_path, encoding="utf-8") as f:
                d = json.load(f)
                return ValidatorRunSummary(
                    hard_violations=d.get("hard_violations", 0),
                    soft_penalty=d.get("soft_penalty", 0),
                    booking_score=float(d.get("booking_score", 0.0)),
                    time_run=d.get("time_run", ""),
                )
        except Exception:
            pass
    return None


# =============================================================================
# Health & Proof Endpoints
# =============================================================================

@router.get("/api/health", response_model=HealthResponse, tags=["health"])
@router.get("/health", response_model=HealthResponse, tags=["health"])
def get_health() -> HealthResponse:
    """Return application health status with git commit, solver availability, LLM status, dataset ID, and uptime."""
    has_llm = bool(
        os.getenv("LLM_API_KEY")
        or os.getenv("GROQ_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("ANTHROPIC_API_KEY")
    )
    return HealthResponse(
        status="ok",
        version="0.1.0",
        git_commit=get_git_commit(),
        solver_available=is_solver_available(),
        llm_configured=has_llm,
        dataset_id="cit_public",
        uptime=round(time.time() - SERVER_START_TIME, 2),
    )


@router.get(
    "/api/proof/summary",
    response_model=ProofSummaryResponse,
    tags=["proof"],
)
def get_proof_summary(
    user: dict[str, Any] = Depends(require_role("admin")),
) -> ProofSummaryResponse:
    """Return proof dashboard metrics: fuzz run, red-team pass rate, ortools version, solver status, validator result."""
    return ProofSummaryResponse(
        latest_fuzz_run=parse_fuzz_report(),
        latest_red_team_pass_rate=parse_redteam_pass_rate(),
        ortools_version=get_ortools_version(),
        last_generate_status=GLOBAL_LAST_GENERATE_STATUS,
        last_validator_result=get_last_validator_result(),
    )


# =============================================================================
# Auth Endpoints
# =============================================================================

@router.post(
    "/api/auth/login",
    response_model=TokenResponse,
    responses={401: {"model": ErrorEnvelope}},
    tags=["auth"],
)
def login(req: LoginRequest) -> TokenResponse:
    """Authenticate demo users and return JWT access token."""
    user = authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Invalid email or password", "details": []},
        )
    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user["role"],
        email=user["email"],
    )


@router.get("/api/auth/me", response_model=UserProfileResponse, tags=["auth"])
def get_me(user: dict[str, Any] = Depends(get_current_user)) -> UserProfileResponse:
    """Return authenticated user profile."""
    return UserProfileResponse(
        email=user["email"],
        name=user["name"],
        role=user["role"],
        faculty_id=user.get("faculty_id"),
        department=user.get("department"),
        club_name=user.get("club_name"),
        profile=user.get("profile"),
    )


# =============================================================================
# Meta Endpoints
# =============================================================================

@router.get(
    "/api/meta",
    response_model=MetaResponse,
    tags=["meta"],
)
def get_meta() -> MetaResponse:
    """Return calendar, rooms, faculty, groups, courses, session kinds, and period times."""
    data = get_active_dataset()
    if not data:
        data_path = Path("data/cit_public.json")
        if not data_path.exists():
            data_path = Path(__file__).resolve().parents[3] / "data" / "cit_public.json"
        if data_path.exists():
            with open(data_path, encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = {}

    rooms = data.get("rooms", [])
    faculty = data.get("faculty", [])
    student_groups = data.get("student_groups", [])
    courses = data.get("courses", [])
    calendar = data.get("calendar", {})
    period_times = calendar.get("periods", [])
    session_kinds = sorted(list({s.get("kind") for s in data.get("sessions", []) if s.get("kind")}))

    return MetaResponse(
        calendar=calendar,
        rooms=rooms,
        faculty=faculty,
        student_groups=student_groups,
        courses=courses,
        session_kinds=session_kinds,
        period_times=period_times,
        room_count=len(rooms),
        faculty_count=len(faculty),
        group_count=len(student_groups),
        course_count=len(courses),
    )


# =============================================================================
# Timetable Endpoints
# =============================================================================

def hydrate_sessions(
    raw_sessions: list[dict[str, Any]],
    data: dict[str, Any] | None = None,
) -> list[SessionAssignment]:
    """Hydrate raw schedule assignments with course/faculty/group details from dataset."""
    if data is None:
        data = get_active_dataset()
        if not data:
            data_path = Path("data/cit_public.json")
            if not data_path.exists():
                data_path = Path(__file__).resolve().parents[3] / "data" / "cit_public.json"
            if data_path.exists():
                with open(data_path, encoding="utf-8") as f:
                    data = json.load(f)
            else:
                data = {}

    session_info = {s["id"]: s for s in data.get("sessions", [])}
    result: list[SessionAssignment] = []
    for s in raw_sessions:
        s_id = s.get("session_id") or s.get("id") or ""
        info = session_info.get(s_id, {})
        result.append(
            SessionAssignment(
                session_id=s_id,
                day=s.get("day", ""),
                start_period=s.get("start_period", 1),
                duration=info.get("duration", 1),
                room_id=s.get("room_id", ""),
                faculty_id=info.get("faculty_id", ""),
                course_id=info.get("course_id", ""),
                groups=info.get("groups", []),
                kind=info.get("kind", ""),
                basket_slot=info.get("basket_slot"),
            )
        )
    return result


@router.get(
    "/api/timetable",
    response_model=TimetableViewResponse,
    tags=["timetable"],
)
def get_timetable(
    view: Literal["group", "faculty", "room"] = Query("group"),
    id: str = Query(..., description="ID of the group, faculty, or room to filter"),
    user: dict[str, Any] = Depends(get_current_user),
) -> TimetableViewResponse:
    """Return timetable filtered by group, faculty, or room view."""
    sched = get_active_schedule()
    data = get_active_dataset()
    sessions = sched.get("sessions", []) if sched else []
    hydrated = hydrate_sessions(sessions, data)
    filtered = []
    for s in hydrated:
        if view == "group" and id in s.groups:
            filtered.append(s)
        elif view == "faculty" and s.faculty_id == id:
            filtered.append(s)
        elif view == "room" and s.room_id == id:
            filtered.append(s)
    return TimetableViewResponse(
        view=view,
        view_id=id,
        count=len(filtered),
        sessions=filtered,
    )


@router.get(
    "/api/timetable/all",
    response_model=TimetableAllResponse,
    tags=["timetable"],
)
def get_timetable_all(
    user: dict[str, Any] = Depends(get_current_user),
) -> TimetableAllResponse:
    """Return full timetable across all groups and rooms."""
    sched = get_active_schedule()
    data = get_active_dataset()
    dataset_id = sched.get("dataset_id", "cit-public-v1") if sched else "cit-public-v1"
    team = sched.get("team", "Team Alpha Coders") if sched else "Team Alpha Coders"
    sessions = sched.get("sessions", []) if sched else []
    hydrated = hydrate_sessions(sessions, data)

    soft_penalties = {"S1": 0, "S2": 0, "S3": 0, "S4": 0, "S5": 0, "S6": 0}
    soft_total = 0
    try:
        import validator
        if data and sched:
            rep = validator.run(data, sched)
            soft_penalties = rep.get("soft_penalties", soft_penalties)
            soft_total = rep.get("soft_total", 0)
    except Exception:
        pass

    return TimetableAllResponse(
        dataset_id=dataset_id,
        team=team,
        count=len(hydrated),
        sessions=hydrated,
        soft_total=soft_total,
        soft_penalties=soft_penalties,
    )


@router.post(
    "/api/timetable/generate",
    response_model=JobStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["timetable"],
)
def generate_timetable(
    req: GenerateTimetableRequest = GenerateTimetableRequest(),
    user: dict[str, Any] = Depends(require_role("admin")),
) -> JobStatusResponse:
    """Trigger background timetable generation solver (Admin only)."""
    running = get_running_job()
    if running is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "JOB_RUNNING",
                "message": f"Solver job {running['id']} is currently running",
                "details": [],
            },
        )

    job_id = f"job-{uuid.uuid4().hex[:8]}"
    create_job(job_id=job_id, job_type="generate_timetable", status="queued", phase="Queued")

    thread = threading.Thread(
        target=run_timetable_solve_job,
        args=(job_id, req.time_limit_seconds, req.random_seed),
        daemon=True,
    )
    thread.start()

    return JobStatusResponse(
        job_id=job_id,
        status="queued",
        progress=0.0,
        phase="Queued",
        best_soft_penalty=None,
        solver_status="UNKNOWN",
        seconds=0.0,
    )


@router.post(
    "/api/timetable/optimise",
    response_model=JobStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["timetable"],
)
def optimise_timetable(
    req: OptimiseTimetableRequest = OptimiseTimetableRequest(),
    user: dict[str, Any] = Depends(require_role("admin")),
) -> JobStatusResponse:
    """Continue optimizing timetable from best known solution (Admin only)."""
    running = get_running_job()
    if running is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "JOB_RUNNING",
                "message": f"Solver job {running['id']} is currently running",
                "details": [],
            },
        )

    job_id = f"job-{uuid.uuid4().hex[:8]}"
    create_job(job_id=job_id, job_type="optimise_timetable", status="queued", phase="Queued")

    thread = threading.Thread(
        target=run_timetable_optimise_job,
        args=(job_id, req.time_limit_seconds, req.random_seed),
        daemon=True,
    )
    thread.start()

    return JobStatusResponse(
        job_id=job_id,
        status="queued",
        progress=0.0,
        phase="Queued",
        best_soft_penalty=None,
        solver_status="UNKNOWN",
        seconds=0.0,
    )


@router.get(
    "/api/jobs/{id}",
    response_model=JobStatusResponse,
    tags=["timetable"],
)
def get_job_status(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> JobStatusResponse:
    """Get solver background job progress and metrics."""
    job = get_job(id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Job {id} not found", "details": []},
        )
    metrics = get_job_metrics(job)
    stat = str(job["status"]).lower()
    if stat not in ("queued", "running", "completed", "failed", "stopped"):
        stat = "running" if stat == "pending" else "completed"

    return JobStatusResponse(
        job_id=job["id"],
        status=stat,  # type: ignore[arg-type]
        progress=metrics["progress"],
        phase=job.get("phase"),
        best_soft_penalty=int(job["best_soft_score"]) if job.get("best_soft_score") is not None else None,
        solver_status=job.get("solver_status") or "UNKNOWN",
        seconds=metrics["elapsed"],
    )


# =============================================================================
# Validation Endpoints
# =============================================================================

@router.get(
    "/api/validation",
    response_model=ValidationReportResponse,
    tags=["validation"],
)
def get_validation_report(
    user: dict[str, Any] = Depends(get_current_user),
) -> ValidationReportResponse:
    """Return internal kernel validation report."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)
    sched = get_active_schedule()
    if not sched:
        with open("exports/schedule.json", encoding="utf-8") as f:
            sched = json.load(f)

    rep = validate_schedule(data, sched)
    violations = [
        ViolationItem(
            rule=v.get("rule", "") if isinstance(v, dict) else getattr(v, "rule", ""),
            where=v.get("where", "") if isinstance(v, dict) else getattr(v, "where", ""),
            detail=v.get("detail", "") if isinstance(v, dict) else getattr(v, "detail", ""),
        )
        for v in rep.get("hard_violations", [])
    ]
    return ValidationReportResponse(
        dataset_id=rep.get("dataset_id") or "cit-public-v1",
        schedule_dataset_id=rep.get("schedule_dataset_id") or "cit-public-v1",
        team=rep.get("team") or "CIT Scheduler",
        hard_violation_count=rep.get("hard_violation_count", 0),
        hard_by_rule=rep.get("hard_by_rule", {}),
        hard_violations=violations,
        soft_total=rep.get("soft_total", 0),
        soft_penalties=rep.get("soft_penalties", {}),
        bookings=rep.get("bookings"),
        exam_soft_penalty=rep.get("exam_soft_penalty"),
        warnings=rep.get("warnings", []),
        count=rep.get("hard_violation_count", 0),
    )


@router.get(
    "/api/validation/official",
    response_model=OfficialValidationResponse,
    tags=["validation"],
)
def get_official_validation(
    user: dict[str, Any] = Depends(require_role("admin")),
) -> OfficialValidationResponse:
    """Run official validator as subprocess and return ground-truth report (Admin only)."""
    data_path = Path("data/cit_public.json")
    sched_path = Path("exports/schedule.json")
    val_script = Path("validator/validator.py")
    if not data_path.exists():
        data_path = Path(__file__).resolve().parents[3] / "data" / "cit_public.json"
        sched_path = Path(__file__).resolve().parents[3] / "exports" / "schedule.json"
        val_script = Path(__file__).resolve().parents[3] / "validator" / "validator.py"

    cmd = [
        "python",
        str(val_script),
        "--data",
        str(data_path),
        "--schedule",
        str(sched_path),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        raw_out = proc.stdout + proc.stderr
    except Exception as e:
        raw_out = f"Validator execution error: {e}"

    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)
    with open(sched_path, encoding="utf-8") as f:
        sched = json.load(f)
    rep = validate_schedule(data, sched)
    return OfficialValidationResponse(report=rep, raw_output=raw_out)


# =============================================================================
# Manual Scheduling Endpoints
# =============================================================================

@router.get(
    "/api/sessions/{id}/legal-slots",
    response_model=LegalSlotsResponse,
    tags=["manual-scheduling"],
)
def get_legal_slots(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> LegalSlotsResponse:
    """Return every day, start period, room triple with legal true/false and reason codes."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)
    sched = get_active_schedule()
    if not sched:
        with open("exports/schedule.json", encoding="utf-8") as f:
            sched = json.load(f)

    ctx = KernelContext(data)
    domains = prune_session_domains(data, ctx)
    session_slots = domains.get(id, [])
    explainer = ExplainEngine(data, sched)

    legal_slot_items: list[LegalSlot] = []
    for day, period, room_id in session_slots:
        blocks = explainer.what_blocks(id, day, period, room_id)
        is_legal = len(blocks) == 0
        legal_slot_items.append(
            LegalSlot(
                day=day,
                start_period=period,
                room_id=room_id,
                legal=is_legal,
                reason_codes=blocks if blocks else ["VALID"],
                reason="Slot is valid with zero clashes." if is_legal else f"Blocked by {', '.join(blocks)}",
            )
        )

    return LegalSlotsResponse(
        session_id=id,
        count=len(legal_slot_items),
        slots=legal_slot_items,
    )


@router.post(
    "/api/sessions/{id}/move",
    response_model=Proposal,
    tags=["manual-scheduling"],
)
def move_session(
    id: str,
    req: SessionMoveRequest,
    user: dict[str, Any] = Depends(require_role("admin", "department_coordinator")),
) -> Proposal:
    """Propose a single session move; returns proposal with diff or validation error."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)
    sched = get_active_schedule()
    if not sched:
        with open("exports/schedule.json", encoding="utf-8") as f:
            sched = json.load(f)

    sessions = sched.get("sessions", [])
    target_idx = None
    curr_slot = None
    for idx, s in enumerate(sessions):
        if s["session_id"] == id:
            target_idx = idx
            curr_slot = {
                "day": s["day"],
                "start_period": s["start_period"],
                "room_id": s["room_id"],
            }
            break

    if target_idx is None or curr_slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Session {id} not found in schedule", "details": []},
        )

    proposed_sched = json.loads(json.dumps(sched))
    proposed_sched["sessions"][target_idx]["day"] = req.target_day
    proposed_sched["sessions"][target_idx]["start_period"] = req.target_start_period
    proposed_sched["sessions"][target_idx]["room_id"] = req.target_room_id

    rep = validate_schedule(data, proposed_sched)
    hard_violations = rep.get("hard_violations", [])
    infeasible = len(hard_violations) > 0

    kind: Literal["time", "room_only"] = (
        "time"
        if (req.target_day != curr_slot["day"] or req.target_start_period != curr_slot["start_period"])
        else "room_only"
    )
    move = SlotMove(
        session_id=id,
        from_slot=curr_slot,
        to_slot={
            "day": req.target_day,
            "start_period": req.target_start_period,
            "room_id": req.target_room_id,
        },
        kind=kind,
    )

    prop_id = f"prop-move-{uuid.uuid4().hex[:8]}"
    prop_status: Literal["pending", "rejected"] = "rejected" if infeasible else "pending"
    reason = (
        f"Proposed move creates {len(hard_violations)} hard violations: {', '.join(v.rule for v in hard_violations)}"
        if infeasible
        else "Manual session move verified: 0 hard violations."
    )
    reason_codes = [v.rule for v in hard_violations] if infeasible else ["VALID"]

    proposal = Proposal(
        id=prop_id,
        status=prop_status,
        moves=[move],
        moved_count=1,
        forced_moves=1,
        knock_on_moves=0,
        proven_minimum=not infeasible,
        infeasible=infeasible,
        conflicts=[v.detail for v in hard_violations],
        reason_codes=reason_codes,
        reason=reason,
    )

    GLOBAL_PROPOSAL_STORE.save(proposal, proposed_sched, proposer_id=user.get("email", "admin"))
    save_proposal(
        proposal_id=proposal.id,
        status=proposal.status,
        moves=[m.model_dump() for m in proposal.moves],
        proposer_id=user.get("email", "admin"),
        schedule_json=proposed_sched,
    )
    log_audit(
        action="propose_manual_move",
        user_id=user.get("email", "admin"),
        details={"session_id": id, "to_slot": move.to_slot, "status": proposal.status},
    )
    return proposal


# =============================================================================
# Rooms Endpoints
# =============================================================================

@router.get(
    "/api/rooms/free",
    response_model=FreeRoomsResponse,
    tags=["rooms"],
)
def get_free_rooms(
    day: str = Query(...),
    period: int = Query(...),
    duration: int = Query(1),
    type: str | None = Query(None),
    min_capacity: int | None = Query(None),
    accessible: bool | None = Query(None),
    user: dict[str, Any] = Depends(get_current_user),
) -> FreeRoomsResponse:
    """Return free rooms matching criteria at given day and period."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)
    sched = get_active_schedule()
    if not sched:
        with open("exports/schedule.json", encoding="utf-8") as f:
            sched = json.load(f)

    target_periods = set(range(period, period + duration))
    busy_rooms: set[str] = set()

    for u in data.get("room_unavailability", []):
        if u.get("day") == day and (target_periods & set(u.get("periods", []))):
            busy_rooms.add(u["room_id"])

    for s in sched.get("sessions", []):
        if s.get("day") == day:
            s_start = s["start_period"]
            s_dur = s.get("duration", 1)
            s_periods = set(range(s_start, s_start + s_dur))
            if target_periods & s_periods:
                busy_rooms.add(s["room_id"])

    free_rooms: list[FreeRoom] = []
    for r in data.get("rooms", []):
        rid = r["id"]
        if rid in busy_rooms:
            continue
        if type is not None and r.get("type") != type:
            continue
        if min_capacity is not None and r.get("capacity", 0) < min_capacity:
            continue
        if accessible is not None and bool(r.get("accessible", False)) != accessible:
            continue

        free_rooms.append(
            FreeRoom(
                room_id=rid,
                capacity=r.get("capacity", 0),
                type=r.get("type", "classroom"),
                accessible=bool(r.get("accessible", False)),
                allowed_uses=r.get("allowed_uses", []),
            )
        )

    return FreeRoomsResponse(
        day=day,
        period=period,
        duration=duration,
        count=len(free_rooms),
        rooms=free_rooms,
    )


# =============================================================================
# Exams Endpoints
# =============================================================================

def hydrate_exams(
    raw_exams: list[dict[str, Any]],
    data: dict[str, Any],
) -> list[ExamAssignment]:
    """Hydrate exam assignments with course/groups/seats information."""
    d_exams = {e["id"]: e for e in data.get("exams", [])}
    room_caps = {r["id"]: r.get("capacity", 0) for r in data.get("rooms", [])}
    hydrated = []
    for ex in raw_exams:
        eid = ex["exam_id"]
        meta = d_exams.get(eid, {})
        rooms = ex.get("rooms", ex.get("room_ids", []))
        seats = sum(room_caps.get(r, 0) for r in rooms)
        course_ids = meta.get("course_ids", [])
        hydrated.append(
            ExamAssignment(
                exam_id=eid,
                course_id=course_ids[0] if course_ids else eid,
                day=ex["day"],
                session=ex["session"],
                rooms=rooms,
                size=meta.get("size", 0),
                seats_provided=seats,
                groups=meta.get("groups", []),
            )
        )
    return hydrated


@router.get(
    "/api/exams",
    response_model=ExamsResponse,
    tags=["exams"],
)
def get_exams(
    user: dict[str, Any] = Depends(get_current_user),
) -> ExamsResponse:
    """Return scheduled midsem exams with room allocations."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)
    sched = get_active_schedule()
    if not sched:
        with open("exports/schedule.json", encoding="utf-8") as f:
            sched = json.load(f)

    exams_list = sched.get("exams", [])
    ctx = KernelContext(data)
    penalty = check_exam_soft(ctx, exams_list) if exams_list else 0
    assignments = hydrate_exams(exams_list, data)
    return ExamsResponse(
        count=len(assignments),
        exams=assignments,
        exam_soft_penalty=penalty,
    )


@router.post(
    "/api/exams/generate",
    response_model=ExamsResponse,
    tags=["exams"],
)
def generate_exams(
    req: GenerateExamsRequest = GenerateExamsRequest(),
    user: dict[str, Any] = Depends(require_role("admin")),
) -> ExamsResponse:
    """Generate exam schedule via CP-SAT solver (Admin only)."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)
    exam_solver = ExamSolver(data)
    exams_list = exam_solver.solve(time_limit_override=req.time_limit_seconds)

    sched = get_active_schedule()
    if not sched:
        with open("exports/schedule.json", encoding="utf-8") as f:
            sched = json.load(f)

    sched["exams"] = exams_list
    commit_new_schedule(sched, dataset_id=data.get("dataset_id", "cit-public-v1"))
    log_audit(
        action="generate_exams",
        user_id=user.get("email", "admin"),
        details={"exam_count": len(exams_list)},
    )

    ctx = KernelContext(data)
    penalty = check_exam_soft(ctx, exams_list)
    assignments = hydrate_exams(exams_list, data)
    return ExamsResponse(
        count=len(assignments),
        exams=assignments,
        exam_soft_penalty=penalty,
    )


# =============================================================================
# Bookings Endpoints
# =============================================================================

@router.get(
    "/api/bookings",
    response_model=BookingsListResponse,
    tags=["bookings"],
)
def get_bookings(
    user: dict[str, Any] = Depends(get_current_user),
) -> BookingsListResponse:
    """List all booking requests and their current statuses."""
    items = db_list_bookings()
    if not items:
        data = get_active_dataset() or {}
        sched = get_active_schedule() or {}
        decisions = {
            b["request_id"]: b
            for b in sched.get("fest_week", {}).get("bookings", [])
        }
        for req in data.get("booking_requests", []):
            merged = dict(req)
            dec = decisions.get(req["id"])
            if dec:
                merged["status"] = dec.get("status", "pending")
                merged["assigned_room"] = dec.get("room_id")
                merged["assigned_day"] = dec.get("day")
                merged["assigned_start_period"] = dec.get("start_period")
                merged["assigned_end_period"] = dec.get("end_period")
                merged["reason"] = dec.get("reason", "")
                merged["reason_codes"] = dec.get("reason_codes", [])
            else:
                merged["status"] = "pending"
            items.append(merged)
    return BookingsListResponse(count=len(items), bookings=items)


@router.post(
    "/api/bookings/parse",
    response_model=ParseBookingResponse,
    tags=["bookings"],
)
def parse_booking(
    req: ParseBookingTextRequest,
    user: dict[str, Any] | None = Depends(get_optional_user),
) -> ParseBookingResponse:
    """Parse natural language booking text into structured draft with provenance."""
    role = user.get("role", "club") if user else "club"
    result = llm_provider.parse_booking_text(req.text, role)

    follow_ups = []
    if isinstance(result.follow_up, list):
        follow_ups = result.follow_up
    elif result.follow_up:
        follow_ups = [result.follow_up]

    prov_dict = {}
    if result.provenance:
        for k, v in result.provenance.items():
            if isinstance(v, dict):
                prov_dict[k] = FieldProvenance(
                    value=v.get("value", getattr(result, k, None)),
                    confidence=float(v.get("confidence", 0.9)),
                    source_snippet=str(v.get("source_snippet", "")),
                )
            elif isinstance(v, FieldProvenance):
                prov_dict[k] = v
            else:
                prov_dict[k] = FieldProvenance(
                    value=getattr(result, k, None),
                    confidence=0.9,
                    source_snippet=str(v),
                )

    return ParseBookingResponse(
        draft=result.__dict__,
        provenance=prov_dict,
        follow_up_questions=follow_ups,
        source="llm" if not result.used_fallback else "fallback",
    )


@router.post(
    "/api/bookings",
    response_model=BookingPrecheckResult,
    tags=["bookings"],
)
def create_booking(
    req: CreateBookingRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> BookingPrecheckResult:
    """Submit structured booking request and run kernel pre-check."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)

    room_obj = next((r for r in data.get("rooms", []) if r["id"] == req.requested_room), None)
    reasons: list[str] = []
    if req.requested_room and not room_obj:
        reasons.append("H4")
    if room_obj and room_obj.get("capacity", 0) < req.attendance:
        reasons.append("H5")
    if room_obj and req.room_types and room_obj.get("type") not in req.room_types:
        reasons.append("H6")

    req_id = f"BR-NEW-{uuid.uuid4().hex[:6]}"
    req_dict = req.model_dump()
    req_dict["id"] = req_id
    req_dict["requester"] = user.get("email", "unknown")
    req_dict["role"] = user.get("role", "club")

    if reasons:
        return BookingPrecheckResult(
            legal=False,
            reason_codes=reasons,
            reason=f"Precheck failed: breaks constraint {reasons[0]}.",
            details={"rules_violated": reasons},
        )

    db_save_booking(request_id=req_id, request_data=req_dict, status="pending")
    log_audit(
        action="create_booking",
        user_id=user.get("email", "user"),
        details={"request_id": req_id},
    )
    return BookingPrecheckResult(
        legal=True,
        reason_codes=["VALID"],
        reason="Booking request passed kernel precheck and was queued for decision.",
        details={"request_id": req_id},
    )


@router.post(
    "/api/bookings/{id}/cancel",
    response_model=BookingCancelResponse,
    tags=["bookings"],
)
def cancel_booking(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> BookingCancelResponse:
    """Cancel a booking request; sets status to rejected."""
    db_update_booking_status(id, "cancelled")
    log_audit(
        action="cancel_booking",
        user_id=user.get("email", "user"),
        details={"request_id": id},
    )
    return BookingCancelResponse(request_id=id, status="rejected", reason="Withdrawn by requester")


@router.post(
    "/api/bookings/decide",
    response_model=BookingDecideResponse,
    tags=["bookings"],
)
def decide_bookings(
    user: dict[str, Any] = Depends(require_role("admin")),
) -> BookingDecideResponse:
    """Run Spectra week priority booking decision engine (Admin only)."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)
    sched = get_active_schedule()
    if not sched:
        with open("exports/schedule.json", encoding="utf-8") as f:
            sched = json.load(f)

    engine = BookingEngine(data, sched)
    fest_week = engine.decide_all()
    sched["fest_week"] = fest_week

    commit_new_schedule(sched, dataset_id=data.get("dataset_id", "cit-public-v1"))

    for b in fest_week.get("bookings", []):
        db_save_booking(request_id=b["request_id"], request_data=b, status=b.get("status", "pending"), decision_data=b)

    log_audit(
        action="decide_bookings",
        user_id=user.get("email", "admin"),
        details={"booking_count": len(fest_week.get("bookings", []))},
    )

    ctx = KernelContext(data)
    assign, _ = to_assign(sched)
    bv, bw, bstats = check_bookings(ctx, assign, fest_week)

    decisions = [
        BookingDecision(
            request_id=b["request_id"],
            status=b.get("status", "rejected"),
            room_id=b.get("room_id"),
            day=b.get("day"),
            start_period=b.get("start_period"),
            end_period=b.get("end_period"),
            reason_codes=b.get("reason_codes", []),
            reason=b.get("reason", ""),
            conflicting_sessions=b.get("conflicting_sessions", []),
            conflicting_bookings=b.get("conflicting_bookings", []),
            alternative_offered=b.get("alternative_offered"),
        )
        for b in fest_week.get("bookings", [])
    ]

    return BookingDecideResponse(
        count=len(decisions),
        decisions=decisions,
        booking_score=float(bstats.get("score", 67.0)),
        booking_score_max=67.0,
        priority_inversions=[v.detail for v in bv if v.rule == "B1"],
    )


@router.get(
    "/api/bookings/{id}/decision",
    response_model=BookingDecision,
    tags=["bookings"],
)
def get_booking_decision(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> BookingDecision:
    """Get decision and counterfactual reasons for a specific booking request."""
    b = db_get_booking(id)
    if not b or "decision" not in b:
        sched = get_active_schedule() or {}
        dec_list = sched.get("fest_week", {}).get("bookings", [])
        dec = next((d for d in dec_list if d["request_id"] == id), None)
        if not dec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "NOT_FOUND", "message": f"Decision for booking {id} not found", "details": []},
            )
        b = dec

    dec_dict = b.get("decision", b)
    return BookingDecision(
        request_id=id,
        status=dec_dict.get("status", "rejected"),
        room_id=dec_dict.get("room_id") or dec_dict.get("assigned_room"),
        day=dec_dict.get("day") or dec_dict.get("assigned_day"),
        start_period=dec_dict.get("start_period") or dec_dict.get("assigned_start_period"),
        end_period=dec_dict.get("end_period") or dec_dict.get("assigned_end_period"),
        reason_codes=dec_dict.get("reason_codes", []),
        reason=dec_dict.get("reason", "Evaluation complete."),
        conflicting_sessions=dec_dict.get("conflicting_sessions", []),
        conflicting_bookings=dec_dict.get("conflicting_bookings", []),
        alternative_offered=dec_dict.get("alternative_offered"),
    )


# =============================================================================
# Disruptions and Proposals Endpoints
# =============================================================================

@router.post(
    "/api/disruptions/preview",
    response_model=Proposal,
    tags=["disruptions"],
)
def preview_disruptions(
    req: DisruptionsPreviewRequest,
    user: dict[str, Any] = Depends(get_optional_user),
) -> Proposal:
    """Preview disruption changes and compute minimal moves schedule proposal."""
    data_path = Path("data/cit_public.json")
    if not data_path.exists():
        data_path = Path(__file__).resolve().parents[3] / "data" / "cit_public.json"
    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)

    active = GLOBAL_PROPOSAL_STORE.get_active_schedule()
    if active is None:
        sched_path = Path("exports/schedule.json")
        if not sched_path.exists():
            sched_path = Path(__file__).resolve().parents[3] / "exports" / "schedule.json"
        if sched_path.exists():
            with open(sched_path, encoding="utf-8") as f:
                active = json.load(f)
        else:
            scratch_path = Path("backend/scratch/schedule_soft_3b.json")
            if not scratch_path.exists():
                scratch_path = Path(__file__).resolve().parents[3] / "backend" / "scratch" / "schedule_soft_3b.json"
            with open(scratch_path, encoding="utf-8") as f:
                active = json.load(f)

    changes = [ch.model_dump() for ch in req.changes]
    proposer_id = user.get("email") or user.get("sub") or "admin_user"
    proposer_role = user.get("role", "admin")
    if proposer_role in ("guest", None):
        proposer_role = "admin"
    return propose_reschedule(
        base_data=data,
        base_schedule=active,
        changes=changes,
        proposer_role=proposer_role,
        proposer_id=proposer_id,
    )


@router.get(
    "/api/proposals",
    response_model=ProposalListResponse,
    tags=["disruptions"],
)
def get_proposals(
    user: dict[str, Any] = Depends(get_current_user),
) -> ProposalListResponse:
    """List pending and historical schedule proposals."""
    proposals = GLOBAL_PROPOSAL_STORE.list_all()
    return ProposalListResponse(proposals=proposals, count=len(proposals))


@router.post(
    "/api/proposals/{id}/approve",
    response_model=ApproveProposalResponse,
    tags=["disruptions"],
)
def approve_proposal(
    id: str,
    user: dict[str, Any] = Depends(require_role("admin")),
) -> ApproveProposalResponse:
    """Approve a schedule proposal (Admin only, never the proposer)."""
    approver_id = user.get("sub", "admin")
    approver_role = user.get("role", "admin")
    ok, msg, codes = approve_proposal_pipeline(
        proposal_id=id,
        approver_role=approver_role,
        approver_id=approver_id,
    )
    if not ok:
        if "NOT_FOUND" in codes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "NOT_FOUND", "message": msg, "details": codes},
            )
        if "SELF_APPROVAL" in codes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "SELF_APPROVAL", "message": msg, "details": codes},
            )
        if "FORBIDDEN" in codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": msg, "details": codes},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": codes[0] if codes else "ERROR", "message": msg, "details": codes},
        )
    return ApproveProposalResponse(
        id=id,
        status="approved",
        reason_codes=codes,
        reason=msg,
    )


@router.post(
    "/api/proposals/{id}/reject",
    response_model=ApproveProposalResponse,
    tags=["disruptions"],
)
def reject_proposal(
    id: str,
    req: RejectProposalRequest,
    user: dict[str, Any] = Depends(require_role("admin")),
) -> ApproveProposalResponse:
    """Reject a schedule proposal (Admin only)."""
    ok, msg = reject_proposal_pipeline(proposal_id=id, reason=req.reason)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": msg, "details": []},
        )
    return ApproveProposalResponse(
        id=id,
        status="rejected",
        reason_codes=["REJECTED"],
        reason=msg,
    )


# =============================================================================
# Explain Endpoints
# =============================================================================

@router.get(
    "/api/explain/session/{id}",
    response_model=ExplainSessionResponse,
    tags=["explain"],
)
def explain_session(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> ExplainSessionResponse:
    """Explain placement constraints and alternative choices for a session."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)
    sched = get_active_schedule()
    if not sched:
        with open("exports/schedule.json", encoding="utf-8") as f:
            sched = json.load(f)

    explainer = ExplainEngine(data, sched)
    res = explainer.why_here(id)
    return ExplainSessionResponse(
        session_id=id,
        placed_slot=res.get("placed_slot", {}),
        reason_codes=res.get("reason_codes", ["VALID"]),
        reason=res.get("reason", ""),
        alternatives_considered=res.get("alternatives_considered", []),
        placed_reason=res.get("placed_reason"),
        alternative_periods=res.get("alternative_periods", []),
        plain_heading=res.get("plain_heading"),
        plain_body=res.get("plain_body"),
    )


@router.get(
    "/api/explain/booking/{id}",
    response_model=ExplainBookingResponse,
    tags=["explain"],
)
def explain_booking(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> ExplainBookingResponse:
    """Explain why a booking request was approved, rejected, or offered an alternative."""
    dec = get_booking_decision(id, user)
    return ExplainBookingResponse(
        booking_id=id,
        decision=dec,
        reason_codes=dec.reason_codes,
        reason=dec.reason,
    )


@router.post(
    "/api/assistant",
    response_model=AssistantResponse,
    tags=["explain"],
)
def ask_assistant(
    req: AssistantRequest,
    user: dict[str, Any] = Depends(get_optional_user),
) -> AssistantResponse:
    """Query scheduling assistant with grounding against current schedule and constraints."""
    res = llm_provider.ask_assistant(req.message, user.get("role", "guest"))
    return AssistantResponse(
        reply=res.get("reply", ""),
        reasoning_steps=res.get("reasoning_steps", []),
    )


# =============================================================================
# Dashboard Endpoints
# =============================================================================

@router.get(
    "/api/dashboard",
    response_model=DashboardResponse,
    tags=["dashboard"],
)
def get_dashboard(
    user: dict[str, Any] = Depends(get_current_user),
) -> DashboardResponse:
    """Return dashboard metrics: conflict count, pending approvals, room utilisation, bookings."""
    data = get_active_dataset()
    if not data:
        with open("data/cit_public.json", encoding="utf-8") as f:
            data = json.load(f)
    sched = get_active_schedule()
    if not sched:
        with open("exports/schedule.json", encoding="utf-8") as f:
            sched = json.load(f)

    rep = validate_schedule(data, sched)
    hard_count = rep.get("hard_violation_count", 0)
    soft_total = rep.get("soft_total", 0)

    proposals = GLOBAL_PROPOSAL_STORE.list_all()
    pending_approvals = sum(1 for p in proposals if getattr(p, "status", None) == "pending")

    days = data.get("calendar", {}).get("days", ["MON", "TUE", "WED", "THU", "FRI"])
    teaching_periods = [
        p["id"]
        for p in data.get("calendar", {}).get("periods", [])
        if p.get("teaching", True)
    ]
    if not teaching_periods:
        teaching_periods = list(range(1, 10))

    occupied_map: dict[tuple[str, str, int], str] = {}
    for s in sched.get("sessions", []):
        s_day = s["day"]
        s_start = s["start_period"]
        s_dur = s.get("duration", 1)
        s_room = s["room_id"]
        for p in range(s_start, s_start + s_dur):
            occupied_map[(s_room, s_day, p)] = s["session_id"]

    utilisation_items: list[RoomUtilisationItem] = []
    rooms = data.get("rooms", [])
    for r in rooms:
        rid = r["id"]
        for d in days:
            for p in teaching_periods:
                occ = (rid, d, p) in occupied_map
                sid = occupied_map.get((rid, d, p))
                utilisation_items.append(
                    RoomUtilisationItem(
                        room_id=rid,
                        day=d,
                        period=p,
                        occupied=occ,
                        session_id=sid,
                    )
                )

    total_slots = len(rooms) * len(days) * len(teaching_periods)
    occ_slots = len(occupied_map)
    utilization_pct = round((occ_slots / max(1, total_slots)) * 100.0, 1)

    booking_board = sched.get("fest_week", {}).get("bookings", [])
    if not booking_board:
        booking_board = data.get("booking_requests", [])

    sessions_cnt = len(sched.get("sessions", []))

    return DashboardResponse(
        conflict_count=hard_count,
        pending_approvals=pending_approvals,
        room_utilisation=utilisation_items,
        booking_board=booking_board,
        sessions_scheduled=sessions_cnt,
        sessions_count=sessions_cnt,
        hard_violations=hard_count,
        soft_penalty=soft_total,
        campus_utilization=utilization_pct,
    )


# =============================================================================
# Admin Endpoints
# =============================================================================

@router.post(
    "/api/admin/reset",
    response_model=AdminResetResponse,
    tags=["admin"],
)
def reset_database(
    user: dict[str, Any] = Depends(require_role("admin")),
) -> AdminResetResponse:
    """Reset database to initial dataset state and generated schedule (Admin only)."""
    db_reset_database()
    return AdminResetResponse(
        status="ok",
        message="Database reset to initial cit_public.json dataset and generated schedule.",
    )


@router.post(
    "/api/admin/dataset",
    response_model=AdminResetResponse,
    tags=["admin"],
)
async def upload_dataset(
    dataset_file: UploadFile,
    change_file: UploadFile | None = None,
    user: dict[str, Any] = Depends(require_role("admin")),
) -> AdminResetResponse:
    """Upload dataset and change files for evaluation (Admin only)."""
    dataset_bytes = await dataset_file.read()
    new_data = json.loads(dataset_bytes.decode("utf-8"))
    c = get_connection()
    now = datetime.now(UTC).isoformat()
    with c:
        c.execute("UPDATE dataset_state SET is_active = 0 WHERE is_active = 1")
        c.execute(
            """
            INSERT INTO dataset_state (id, dataset_id, dataset_json, is_active, created_at)
            VALUES (?, ?, ?, 1, ?)
            """,
            (
                f"ds-{uuid.uuid4().hex[:8]}",
                new_data.get("dataset_id", "uploaded-dataset"),
                json.dumps(new_data),
                now,
            ),
        )
    log_audit(
        action="upload_dataset",
        user_id=user.get("email", "admin"),
        details={"dataset_id": new_data.get("dataset_id")},
    )
    return AdminResetResponse(
        status="ok",
        message="Dataset uploaded and activated successfully.",
    )


@router.get(
    "/api/export/schedule.json",
    tags=["admin"],
)
def export_schedule(
    user: dict[str, Any] = Depends(require_role("admin")),
) -> dict[str, Any]:
    """Export schedule.json for official validator scoring (Admin only)."""
    sched = get_active_schedule()
    if sched is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "No active schedule found", "details": []},
        )
    return sched
