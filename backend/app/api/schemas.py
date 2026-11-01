"""Pydantic schemas for the complete CIT Campus Scheduling API contract.

Every list response includes counts.
Every Proposal and Decision carries reason codes plus a plain text reason built from templates.
All error responses adhere to {"error": {"code": "...", "message": "...", "details": [...]}}.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Common and Error Types
# -----------------------------------------------------------------------------

ErrorCode = Literal[
    # Validator rules
    "H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9", "H10",
    "H11", "H12", "H13", "H14",
    "B1", "B2", "B3",
    "E1", "E2",
    "S1", "S2", "S3", "S4", "S5", "S6",
    # System and domain codes
    "NOT_FOUND",
    "FORBIDDEN",
    "UNAUTHENTICATED",
    "NOT_IMPLEMENTED",
    "INVALID_INPUT",
    "SELF_APPROVAL",
    "INFEASIBLE",
]

Role = Literal["admin", "department_coordinator", "faculty", "club"]


class ErrorContent(BaseModel):
    code: str = Field(..., description="Error code from validator rules or system error set")
    message: str = Field(..., description="Human readable description of the error")
    details: list[Any] = Field(default_factory=list, description="Structured error details or trace info")


class ErrorEnvelope(BaseModel):
    error: ErrorContent


# -----------------------------------------------------------------------------
# Auth Schemas
# -----------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    email: str


class UserProfileResponse(BaseModel):
    email: str
    name: str
    role: Role
    faculty_id: str | None = None
    department: str | None = None
    club_name: str | None = None
    profile: dict[str, Any] | None = None


# -----------------------------------------------------------------------------
# Meta Schemas
# -----------------------------------------------------------------------------

class MetaResponse(BaseModel):
    calendar: dict[str, Any]
    rooms: list[dict[str, Any]]
    faculty: list[dict[str, Any]]
    student_groups: list[dict[str, Any]]
    courses: list[dict[str, Any]]
    session_kinds: list[str]
    period_times: list[dict[str, Any]]
    room_count: int
    faculty_count: int
    group_count: int
    course_count: int


# -----------------------------------------------------------------------------
# Timetable and Job Schemas
# -----------------------------------------------------------------------------

class SessionAssignment(BaseModel):
    session_id: str
    day: str
    start_period: int
    duration: int
    room_id: str
    faculty_id: str
    course_id: str
    groups: list[str]
    kind: str
    basket_slot: str | None = None


class TimetableViewResponse(BaseModel):
    view: Literal["group", "faculty", "room", "all"]
    view_id: str | None = None
    count: int
    sessions: list[SessionAssignment]


class TimetableAllResponse(BaseModel):
    dataset_id: str
    team: str
    count: int
    sessions: list[SessionAssignment]
    soft_total: int
    soft_penalties: dict[str, int]


class GenerateTimetableRequest(BaseModel):
    time_limit_seconds: int = 30
    random_seed: int = 42


class OptimiseTimetableRequest(BaseModel):
    time_limit_seconds: int = 30
    random_seed: int = 42


class JobStatusResponse(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed", "stopped"]
    progress: float
    phase: str | None = None
    best_soft_penalty: int | None = None
    solver_status: str
    seconds: float
    error_message: str | None = None


# -----------------------------------------------------------------------------
# Validation Schemas
# -----------------------------------------------------------------------------

class ViolationItem(BaseModel):
    rule: str
    where: str
    detail: str


class ValidationReportResponse(BaseModel):
    dataset_id: str
    schedule_dataset_id: str
    team: str
    hard_violation_count: int
    hard_by_rule: dict[str, int]
    hard_violations: list[ViolationItem]
    soft_total: int
    soft_penalties: dict[str, int]
    bookings: dict[str, Any] | None = None
    exam_soft_penalty: int | None = None
    warnings: list[str] = Field(default_factory=list)
    count: int


class OfficialValidationResponse(BaseModel):
    report: dict[str, Any]
    raw_output: str


# -----------------------------------------------------------------------------
# Manual Scheduling and Proposal Schemas
# -----------------------------------------------------------------------------

class LegalSlot(BaseModel):
    day: str
    start_period: int
    room_id: str
    legal: bool
    reason_codes: list[str] = Field(default_factory=list)
    reason: str


class LegalSlotsResponse(BaseModel):
    session_id: str
    count: int
    slots: list[LegalSlot]


class SessionMoveRequest(BaseModel):
    target_day: str
    target_start_period: int
    target_room_id: str


class SlotMove(BaseModel):
    session_id: str
    from_slot: dict[str, Any] | None = None
    to_slot: dict[str, Any] | None = None
    kind: Literal["time", "room_only"]
    course_id: str | None = None
    course_title: str | None = None
    faculty_id: str | None = None
    faculty_name: str | None = None
    reason: str | None = None


class Proposal(BaseModel):
    id: str
    status: Literal["draft", "pending", "approved", "rejected"]
    moves: list[SlotMove]
    moved_count: int
    forced_moves: int = 0
    knock_on_moves: int = 0
    proven_minimum: bool
    infeasible: bool
    conflicts: list[str] = Field(default_factory=list)
    reason_codes: list[str] = Field(default_factory=list)
    reason: str
    disruption_summary: list[str] = Field(default_factory=list)


class ProposalListResponse(BaseModel):
    count: int
    proposals: list[Proposal]


class ApproveProposalResponse(BaseModel):
    id: str
    status: Literal["approved", "rejected"]
    reason_codes: list[str] = Field(default_factory=list)
    reason: str


class RejectProposalRequest(BaseModel):
    reason: str


# -----------------------------------------------------------------------------
# Room Schemas
# -----------------------------------------------------------------------------

class FreeRoom(BaseModel):
    room_id: str
    capacity: int
    type: str
    accessible: bool
    allowed_uses: list[str]


class FreeRoomsResponse(BaseModel):
    day: str
    period: int
    duration: int
    count: int
    rooms: list[FreeRoom]


# -----------------------------------------------------------------------------
# Exam Schemas
# -----------------------------------------------------------------------------

class ExamAssignment(BaseModel):
    exam_id: str
    course_id: str
    day: str
    session: str
    rooms: list[str]
    size: int
    seats_provided: int
    groups: list[str]


class ExamsResponse(BaseModel):
    count: int
    exams: list[ExamAssignment]
    exam_soft_penalty: int = 0


class GenerateExamsRequest(BaseModel):
    time_limit_seconds: int = 20


# -----------------------------------------------------------------------------
# Booking Schemas
# -----------------------------------------------------------------------------

class ParseBookingTextRequest(BaseModel):
    text: str


class FieldProvenance(BaseModel):
    value: Any = None
    confidence: float = 1.0
    source_snippet: str = ""


class ParseBookingResponse(BaseModel):
    draft: dict[str, Any]
    provenance: dict[str, FieldProvenance]
    follow_up_questions: list[str] = Field(default_factory=list)
    source: Literal["llm", "fallback"]


class BookingWindow(BaseModel):
    day: str
    from_period: int
    to_period: int


class CreateBookingRequest(BaseModel):
    requested_room: str | None = None
    attendance: int
    room_types: list[str]
    needs: list[str] = Field(default_factory=list)
    duration_periods: int
    windows: list[BookingWindow]
    mandatory_for_groups: list[str] = Field(default_factory=list)
    requested_category: str
    series_id: str | None = None


class BookingPrecheckResult(BaseModel):
    legal: bool
    reason_codes: list[str]
    reason: str
    details: dict[str, Any] = Field(default_factory=dict)


class BookingReviewRequest(BaseModel):
    status: Literal["approved", "rejected"]
    reason: str | None = None


class BookingDecision(BaseModel):
    request_id: str
    status: Literal["approved", "rejected", "alternative_offered"]
    room_id: str | None = None
    day: str | None = None
    start_period: int | None = None
    end_period: int | None = None
    reason_codes: list[str]
    reason: str
    conflicting_sessions: list[str] = Field(default_factory=list)
    conflicting_bookings: list[str] = Field(default_factory=list)
    rule_applied: str | None = None
    alternative_offered: dict[str, Any] | None = None


class BookingsListResponse(BaseModel):
    count: int
    bookings: list[dict[str, Any]]


class BookingDecideResponse(BaseModel):
    count: int
    decisions: list[BookingDecision]
    booking_score: float
    booking_score_max: float
    priority_inversions: list[str]


class BookingCancelResponse(BaseModel):
    request_id: str
    status: Literal["rejected"] = "rejected"
    reason: str = "Withdrawn by requester"


# -----------------------------------------------------------------------------
# Disruptions Schemas
# -----------------------------------------------------------------------------

class DisruptionChange(BaseModel):
    type: Literal["faculty_unavailable", "faculty_leave", "room_unavailable", "add_faculty", "add_session", "remove_session"]
    day: str | None = None
    days: list[str] | None = None
    periods: list[int] | None = None
    faculty_id: str | None = None
    room_id: str | None = None
    session_id: str | None = None
    faculty: dict[str, Any] | None = None
    session: dict[str, Any] | None = None
    reason: str | None = None


class DisruptionsPreviewRequest(BaseModel):
    changes: list[DisruptionChange]


# -----------------------------------------------------------------------------
# Explain and Assistant Schemas
# -----------------------------------------------------------------------------

class ExplainSessionResponse(BaseModel):
    session_id: str
    placed_slot: dict[str, Any]
    reason_codes: list[str]
    reason: str
    alternatives_considered: list[dict[str, Any]] = Field(default_factory=list)
    placed_reason: str | None = None
    alternative_periods: list[dict[str, Any]] = Field(default_factory=list)
    plain_heading: str | None = None
    plain_body: str | None = None


class ExplainBookingResponse(BaseModel):
    booking_id: str
    decision: BookingDecision
    reason_codes: list[str]
    reason: str


class AssistantRequest(BaseModel):
    message: str = ""
    query: str = ""
    prompt: str = ""

    def get_message(self) -> str:
        return (self.message or self.query or self.prompt or "").strip()


class AssistantResponse(BaseModel):
    reply: str
    reasoning_steps: list[str] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Dashboard Schemas
# -----------------------------------------------------------------------------

class RoomUtilisationItem(BaseModel):
    room_id: str
    day: str
    period: int
    occupied: bool
    session_id: str | None = None


class DashboardResponse(BaseModel):
    conflict_count: int
    pending_approvals: int
    room_utilisation: list[RoomUtilisationItem]
    booking_board: list[dict[str, Any]]
    pending_bookings: list[dict[str, Any]] = Field(default_factory=list)
    sessions_scheduled: int | None = None
    sessions_count: int | None = None
    hard_violations: int | None = None
    soft_penalty: int | None = None
    campus_utilization: float | None = None


# -----------------------------------------------------------------------------
# Admin and Health Schemas
# -----------------------------------------------------------------------------

class AdminResetResponse(BaseModel):
    status: str
    message: str


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    git_commit: str | None = None
    solver_available: bool = True
    llm_configured: bool = False
    dataset_id: str | None = None
    uptime: float = 0.0


# -----------------------------------------------------------------------------
# Proof Summary Schema (N2)
# -----------------------------------------------------------------------------

class FuzzRunSummary(BaseModel):
    cases: int
    mismatches: int
    seed: int | None = None
    date: str | None = None


class ValidatorRunSummary(BaseModel):
    hard_violations: int
    soft_penalty: int
    booking_score: float
    time_run: str


class ProofSummaryResponse(BaseModel):
    latest_fuzz_run: FuzzRunSummary | None = None
    latest_red_team_pass_rate: float | str | None = None
    ortools_version: str | None = None
    last_generate_status: str | None = None
    last_validator_result: ValidatorRunSummary | None = None
