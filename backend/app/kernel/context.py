"""KernelContext: our own Ctx equivalent, loaded from the dataset JSON."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

DEFAULT_DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "cit_public.json"

# These mirror the validator constants. Loaded from data where possible,
# but the validator also hardcodes them as fallback.
MAX_PERIOD = 13
LAST_TEACHING = 9


class KernelContext:
    """Holds all lookup tables the validator needs, built from dataset JSON."""

    def __init__(self, data: dict[str, Any]) -> None:
        """Build index dicts exactly like the official Ctx."""
        self.data = data
        self.days: list[str] = data["calendar"]["days"]
        self.lab_starts: set[int] = set(data["calendar"]["lab_start_periods"])
        self.lunch: int = data["calendar"]["lunch"]["after_period"]
        self.rooms: dict[str, dict] = {r["id"]: r for r in data["rooms"]}
        self.fac: dict[str, dict] = {f["id"]: f for f in data["faculty"]}
        self.groups: dict[str, dict] = {g["id"]: g for g in data["student_groups"]}
        self.sessions: dict[str, dict] = {s["id"]: s for s in data["sessions"]}
        self.req: dict[str, dict] = {b["id"]: b for b in data["booking_requests"]}
        self.cancelled: set[str] = {c["request_id"] for c in data.get("cancellations", [])}

        # Faculty unavailability: (day, period) pairs per faculty id
        self.fac_un: dict[str, set[tuple[str, int]]] = defaultdict(set)
        for f in data["faculty"]:
            for u in f.get("unavailable", []):
                for p in u["periods"]:
                    self.fac_un[f["id"]].add((u["day"], p))

        # Room unavailability: (day, period) pairs per room id
        self.room_un: dict[str, set[tuple[str, int]]] = defaultdict(set)
        for u in data.get("room_unavailability", []):
            for p in u["periods"]:
                self.room_un[u["room_id"]].add((u["day"], p))

    @classmethod
    def from_json(cls, path: Path | str = DEFAULT_DATA_PATH) -> KernelContext:
        """Load context from the official dataset file."""
        with open(Path(path), encoding="utf-8") as fh:
            return cls(json.load(fh))
