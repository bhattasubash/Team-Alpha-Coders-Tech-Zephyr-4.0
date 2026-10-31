"""Configuration loaded from the official dataset. No hardcoded scheduling constants."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

DEFAULT_DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "cit_public.json"


@dataclass(frozen=True)
class PeriodInfo:
    """One teaching or event period in the daily calendar."""

    id: int
    start: str
    end: str
    teaching: bool


@dataclass(frozen=True)
class LunchInfo:
    """Lunch break boundary used by period-crossing checks."""

    after_period: int
    start: str
    end: str


@dataclass(frozen=True)
class ExamSession:
    """One exam session slot (AM or PM)."""

    id: str
    start: str
    end: str


@dataclass(frozen=True)
class ExamWeekInfo:
    """Exam week calendar metadata."""

    days: list[str]
    sessions: list[ExamSession]


@dataclass
class DatasetConfig:
    """Exposes all calendar settings, period info, and global constants from the dataset."""

    dataset_id: str
    institute: str
    days: list[str]
    periods: list[PeriodInfo]
    lunch: LunchInfo
    lab_start_periods: list[int]
    event_only_periods: list[int]
    fest_week: str
    exam_week: ExamWeekInfo
    priority_order: list[str]
    role_category_cap: dict[str, str]
    max_period: int = field(init=False)
    last_teaching: int = field(init=False)
    raw: dict[str, Any] = field(repr=False)

    def __post_init__(self) -> None:
        """Derive computed constants from raw period data."""
        self.max_period = max(p.id for p in self.periods)
        self.last_teaching = max(p.id for p in self.periods if p.teaching)

    @classmethod
    def from_json(cls, path: Path | str = DEFAULT_DATA_PATH) -> DatasetConfig:
        """Load config from the official dataset JSON."""
        path = Path(path)
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)

        cal = data["calendar"]
        periods = [PeriodInfo(**p) for p in cal["periods"]]
        lunch = LunchInfo(**cal["lunch"])
        ew = cal["exam_week"]
        exam_week = ExamWeekInfo(
            days=ew["days"],
            sessions=[ExamSession(**s) for s in ew["sessions"]],
        )

        return cls(
            dataset_id=data["dataset_id"],
            institute=data["institute"],
            days=cal["days"],
            periods=periods,
            lunch=lunch,
            lab_start_periods=cal["lab_start_periods"],
            event_only_periods=cal["event_only_periods"],
            fest_week=cal["fest_week"],
            exam_week=exam_week,
            priority_order=data["priority_order"],
            role_category_cap=data["role_category_cap"],
            raw=data,
        )
