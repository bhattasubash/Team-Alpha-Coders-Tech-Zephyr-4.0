"""Typed dataclasses for the scheduling pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SessionAssignment:
    """Where a single session is placed in the timetable."""

    session_id: str
    day: str
    start_period: int
    room_id: str


@dataclass
class Violation:
    """One constraint violation found by the validator."""

    rule: str
    detail: str
    where: str = "timetable"


@dataclass
class ScheduleProposal:
    """A proposed full timetable, before validation."""

    assignments: dict[str, tuple[str, int, str]]
    source: str = "manual"
    violations: list[Violation] = field(default_factory=list)
    is_valid: bool = False


@dataclass
class SlotChange:
    """One session that moved between two schedules."""

    session_id: str
    old: tuple[str, int, str] | None
    new: tuple[str, int, str] | None


@dataclass
class Diff:
    """Delta between the current and proposed schedule."""

    added: list[SlotChange] = field(default_factory=list)
    removed: list[SlotChange] = field(default_factory=list)
    moved: list[SlotChange] = field(default_factory=list)
    time_changed: int = 0
    room_only_changed: int = 0


@dataclass
class ApprovalResult:
    """Outcome of the approval step."""

    approved: bool
    violations: list[Violation] = field(default_factory=list)
    approved_by: str | None = None


@dataclass
class CommitResult:
    """Outcome of committing a schedule change."""

    success: bool
    schedule_version: int = 0
    diff: Diff | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
