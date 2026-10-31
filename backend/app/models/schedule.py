"""Pydantic models for schedule export and API data transfer."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SessionEntry(BaseModel):
    """One row of the timetable export."""

    session_id: str
    day: str
    start_period: int
    room_id: str


class BookingDecision(BaseModel):
    """Decision on a single booking request for Spectra week."""

    request_id: str
    status: str = Field(description="approved, rejected, or alternative_offered")
    day: str | None = None
    start_period: int | None = None
    end_period: int | None = None
    room_id: str | None = None
    reason: str | None = None


class SessionOverride(BaseModel):
    """A session moved for fest week to make room for an approved booking."""

    session_id: str
    day: str
    start_period: int
    room_id: str
    displaced_by: str


class FestWeek(BaseModel):
    """Fest week (Spectra) section of the schedule export."""

    bookings: list[BookingDecision] = Field(default_factory=list)
    session_overrides: list[SessionOverride] = Field(default_factory=list)


class ExamEntry(BaseModel):
    """One exam assignment for exam week."""

    exam_id: str
    day: str
    session: str
    rooms: list[str]


class ScheduleExport(BaseModel):
    """Top-level export format matching the starter pack spec."""

    team: str = "CIT Schedule"
    dataset_id: str = "cit-public-v1"
    sessions: list[SessionEntry] = Field(default_factory=list)
    fest_week: FestWeek | None = None
    exams: list[ExamEntry] = Field(default_factory=list)
