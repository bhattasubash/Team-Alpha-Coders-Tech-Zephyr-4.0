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
import time
from typing import Any, Literal

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
    ExamsResponse,
    ExplainBookingResponse,
    ExplainSessionResponse,
    FreeRoomsResponse,
    FuzzRunSummary,
    GenerateExamsRequest,
    GenerateTimetableRequest,
    HealthResponse,
    JobStatusResponse,
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
    SessionMoveRequest,
    TimetableAllResponse,
    TimetableViewResponse,
    TokenResponse,
    UserProfileResponse,
    ValidationReportResponse,
    ValidatorRunSummary,
)
from app.auth.users import authenticate_user, create_access_token, get_current_user, require_role
from app.kernel.pipeline import (
    GLOBAL_PROPOSAL_STORE,
    approve_proposal_pipeline,
    propose_reschedule,
    reject_proposal_pipeline,
)

router = APIRouter()

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
    has_llm = bool(os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))
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
    responses=RESPONSES_501,
    tags=["meta"],
)
def get_meta() -> MetaResponse:
    """Return calendar, rooms, faculty, groups, courses, session kinds, and period times."""
    raise NotImplementedError("Meta endpoint pending dataset integration.")


# =============================================================================
# Timetable Endpoints
# =============================================================================

@router.get(
    "/api/timetable",
    response_model=TimetableViewResponse,
    responses=RESPONSES_501,
    tags=["timetable"],
)
def get_timetable(
    view: Literal["group", "faculty", "room"] = Query("group"),
    id: str = Query(..., description="ID of the group, faculty, or room to filter"),
    user: dict[str, Any] = Depends(get_current_user),
) -> TimetableViewResponse:
    """Return timetable filtered by group, faculty, or room view."""
    raise NotImplementedError("Timetable view endpoint pending solver output.")


@router.get(
    "/api/timetable/all",
    response_model=TimetableAllResponse,
    responses=RESPONSES_501,
    tags=["timetable"],
)
def get_timetable_all(
    user: dict[str, Any] = Depends(get_current_user),
) -> TimetableAllResponse:
    """Return full timetable across all groups and rooms."""
    raise NotImplementedError("Full timetable endpoint pending solver output.")


@router.post(
    "/api/timetable/generate",
    response_model=JobStatusResponse,
    responses=RESPONSES_501,
    tags=["timetable"],
)
def generate_timetable(
    req: GenerateTimetableRequest = GenerateTimetableRequest(),
    user: dict[str, Any] = Depends(require_role("admin")),
) -> JobStatusResponse:
    """Trigger background timetable generation solver (Admin only)."""
    raise NotImplementedError("Timetable generator solver pending Milestone 3.")


@router.post(
    "/api/timetable/optimise",
    response_model=JobStatusResponse,
    responses=RESPONSES_501,
    tags=["timetable"],
)
def optimise_timetable(
    req: OptimiseTimetableRequest = OptimiseTimetableRequest(),
    user: dict[str, Any] = Depends(require_role("admin")),
) -> JobStatusResponse:
    """Continue optimizing timetable from best known solution (Admin only)."""
    raise NotImplementedError("Timetable optimization solver pending Milestone 3.")


@router.get(
    "/api/jobs/{id}",
    response_model=JobStatusResponse,
    responses=RESPONSES_501,
    tags=["timetable"],
)
def get_job_status(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> JobStatusResponse:
    """Get solver background job progress and metrics."""
    raise NotImplementedError("Solver job monitoring pending Milestone 3.")


# =============================================================================
# Validation Endpoints
# =============================================================================

@router.get(
    "/api/validation",
    response_model=ValidationReportResponse,
    responses=RESPONSES_501,
    tags=["validation"],
)
def get_validation_report(
    user: dict[str, Any] = Depends(get_current_user),
) -> ValidationReportResponse:
    """Return internal kernel validation report."""
    raise NotImplementedError("Validation report endpoint pending kernel pipeline wiring.")


@router.get(
    "/api/validation/official",
    response_model=OfficialValidationResponse,
    responses=RESPONSES_501,
    tags=["validation"],
)
def get_official_validation(
    user: dict[str, Any] = Depends(require_role("admin")),
) -> OfficialValidationResponse:
    """Run official validator as subprocess and return ground-truth report (Admin only)."""
    raise NotImplementedError("Official validator runner pending Milestone 2.")


# =============================================================================
# Manual Scheduling Endpoints
# =============================================================================

@router.get(
    "/api/sessions/{id}/legal-slots",
    response_model=LegalSlotsResponse,
    responses=RESPONSES_501,
    tags=["manual-scheduling"],
)
def get_legal_slots(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> LegalSlotsResponse:
    """Return every day, start period, room triple with legal true/false and reason codes."""
    raise NotImplementedError("Legal slots calculation pending solver domain pruner.")


@router.post(
    "/api/sessions/{id}/move",
    response_model=Proposal,
    responses=RESPONSES_501,
    tags=["manual-scheduling"],
)
def move_session(
    id: str,
    req: SessionMoveRequest,
    user: dict[str, Any] = Depends(require_role("admin", "department_coordinator")),
) -> Proposal:
    """Propose a single session move; returns proposal with diff or validation error."""
    raise NotImplementedError("Session move proposal pending kernel pipeline.")


# =============================================================================
# Rooms Endpoints
# =============================================================================

@router.get(
    "/api/rooms/free",
    response_model=FreeRoomsResponse,
    responses=RESPONSES_501,
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
    raise NotImplementedError("Free rooms search pending timetable integration.")


# =============================================================================
# Exams Endpoints
# =============================================================================

@router.get(
    "/api/exams",
    response_model=ExamsResponse,
    responses=RESPONSES_501,
    tags=["exams"],
)
def get_exams(
    user: dict[str, Any] = Depends(get_current_user),
) -> ExamsResponse:
    """Return scheduled midsem exams with room allocations."""
    raise NotImplementedError("Exam schedule retrieval pending Milestone 4.")


@router.post(
    "/api/exams/generate",
    response_model=ExamsResponse,
    responses=RESPONSES_501,
    tags=["exams"],
)
def generate_exams(
    req: GenerateExamsRequest = GenerateExamsRequest(),
    user: dict[str, Any] = Depends(require_role("admin")),
) -> ExamsResponse:
    """Generate exam schedule via CP-SAT solver (Admin only)."""
    raise NotImplementedError("Exam solver pending Milestone 4.")


# =============================================================================
# Bookings Endpoints
# =============================================================================

@router.get(
    "/api/bookings",
    response_model=BookingsListResponse,
    responses=RESPONSES_501,
    tags=["bookings"],
)
def get_bookings(
    user: dict[str, Any] = Depends(get_current_user),
) -> BookingsListResponse:
    """List all booking requests and their current statuses."""
    raise NotImplementedError("Bookings listing pending database integration.")


@router.post(
    "/api/bookings/parse",
    response_model=ParseBookingResponse,
    responses=RESPONSES_501,
    tags=["bookings"],
)
def parse_booking(
    req: ParseBookingTextRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> ParseBookingResponse:
    """Parse natural language booking text into structured draft with provenance."""
    raise NotImplementedError("Booking parsing pending LLM/regex provider integration.")


@router.post(
    "/api/bookings",
    response_model=BookingPrecheckResult,
    responses=RESPONSES_501,
    tags=["bookings"],
)
def create_booking(
    req: CreateBookingRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> BookingPrecheckResult:
    """Submit structured booking request and run kernel pre-check."""
    raise NotImplementedError("Booking submission pending kernel pre-check implementation.")


@router.post(
    "/api/bookings/{id}/cancel",
    response_model=BookingCancelResponse,
    responses=RESPONSES_501,
    tags=["bookings"],
)
def cancel_booking(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> BookingCancelResponse:
    """Cancel a booking request; sets status to rejected."""
    raise NotImplementedError("Booking cancellation pending database integration.")


@router.post(
    "/api/bookings/decide",
    response_model=BookingDecideResponse,
    responses=RESPONSES_501,
    tags=["bookings"],
)
def decide_bookings(
    user: dict[str, Any] = Depends(require_role("admin")),
) -> BookingDecideResponse:
    """Run Spectra week priority booking decision engine (Admin only)."""
    raise NotImplementedError("Booking decision engine pending Milestone 5.")


@router.get(
    "/api/bookings/{id}/decision",
    response_model=BookingDecision,
    responses=RESPONSES_501,
    tags=["bookings"],
)
def get_booking_decision(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> BookingDecision:
    """Get decision and counterfactual reasons for a specific booking request."""
    raise NotImplementedError("Booking decision retrieval pending Milestone 5.")


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
    user: dict[str, Any] = Depends(require_role("admin")),
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
    proposer_id = user.get("sub", "admin")
    return propose_reschedule(
        base_data=data,
        base_schedule=active,
        changes=changes,
        proposer_role=user.get("role", "admin"),
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
    responses=RESPONSES_501,
    tags=["explain"],
)
def explain_session(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> ExplainSessionResponse:
    """Explain placement constraints and alternative choices for a session."""
    raise NotImplementedError("Session placement explainer pending.")


@router.get(
    "/api/explain/booking/{id}",
    response_model=ExplainBookingResponse,
    responses=RESPONSES_501,
    tags=["explain"],
)
def explain_booking(
    id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> ExplainBookingResponse:
    """Explain why a booking request was approved, rejected, or offered an alternative."""
    raise NotImplementedError("Booking explainer pending.")


@router.post(
    "/api/assistant",
    response_model=AssistantResponse,
    responses=RESPONSES_501,
    tags=["explain"],
)
def ask_assistant(
    req: AssistantRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> AssistantResponse:
    """Query scheduling assistant with grounding against current schedule and constraints."""
    raise NotImplementedError("Assistant grounding pending.")


# =============================================================================
# Dashboard Endpoints
# =============================================================================

@router.get(
    "/api/dashboard",
    response_model=DashboardResponse,
    responses=RESPONSES_501,
    tags=["dashboard"],
)
def get_dashboard(
    user: dict[str, Any] = Depends(get_current_user),
) -> DashboardResponse:
    """Return dashboard metrics: conflict count, pending approvals, room utilisation, bookings."""
    raise NotImplementedError("Dashboard aggregation pending.")


# =============================================================================
# Admin Endpoints
# =============================================================================

@router.post(
    "/api/admin/reset",
    response_model=AdminResetResponse,
    responses=RESPONSES_501,
    tags=["admin"],
)
def reset_database(
    user: dict[str, Any] = Depends(require_role("admin")),
) -> AdminResetResponse:
    """Reset database to initial dataset state (Admin only)."""
    raise NotImplementedError("Admin database reset pending.")


@router.post(
    "/api/admin/dataset",
    response_model=AdminResetResponse,
    responses=RESPONSES_501,
    tags=["admin"],
)
def upload_dataset(
    dataset_file: UploadFile,
    change_file: UploadFile | None = None,
    user: dict[str, Any] = Depends(require_role("admin")),
) -> AdminResetResponse:
    """Upload dataset and change files for evaluation (Admin only)."""
    raise NotImplementedError("Dataset upload handler pending.")


@router.get(
    "/api/export/schedule.json",
    responses=RESPONSES_501,
    tags=["admin"],
)
def export_schedule(
    user: dict[str, Any] = Depends(require_role("admin")),
) -> dict[str, Any]:
    """Export schedule.json for official validator scoring (Admin only)."""
    raise NotImplementedError("Schedule export pending solver completion.")
