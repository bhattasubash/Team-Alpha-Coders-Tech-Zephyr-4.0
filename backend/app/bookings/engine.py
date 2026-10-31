"""Booking decision engine for Spectra week.

Priority comes from the authenticated role and event type, never from text
in a request. Nobody approves their own request. Every decision carries
a reason code.
"""

from __future__ import annotations

from typing import Any


def effective_category(data: dict[str, Any], req: dict[str, Any]) -> str:
    """Cap the requested category by the role's maximum allowed category.

    Mirrors the official validator's effective_category exactly.
    A club representative asking for 'institute_event' still gets 'club_event'.
    """
    order = data["priority_order"]
    cap = data["role_category_cap"].get(req["role"], "club_event")
    raw_idx = (
        order.index(req["requested_category"])
        if req["requested_category"] in order
        else len(order) - 1
    )
    capped_idx = max(raw_idx, order.index(cap))
    return order[capped_idx]


def outranks(data: dict[str, Any], r1: dict[str, Any], r2: dict[str, Any]) -> bool:
    """True if request r1 has priority over r2. Mirrors the validator."""
    order = data["priority_order"]
    c1 = order.index(effective_category(data, r1))
    c2 = order.index(effective_category(data, r2))
    if c1 != c2:
        return c1 < c2
    return r1["submitted_at"] < r2["submitted_at"]


# Category weights used by the validator for scoring
CAT_WEIGHT = {"institute_event": 5, "guest_lecture": 4, "department_event": 3, "club_event": 2}


class BookingEngine:
    """Decides booking requests for Spectra week using priority and constraint checks.

    The engine maximises the validator's booking score, not first-come-first-served.
    Each decision includes a reason code, conflicting sessions, and the nearest alternative.
    """

    def __init__(
        self, data: dict[str, Any], base_schedule: dict[str, tuple[str, int, str]]
    ) -> None:
        """Store dataset and the baseline timetable for conflict checking."""
        self.data = data
        self.base_schedule = base_schedule

    def decide_all(self) -> dict[str, Any]:
        """Process all non-cancelled booking requests and return decisions with reasons.

        Returns a dict matching the fest_week export format: bookings list and session_overrides.
        """
        # TODO(subash): implement booking decisions with priority ordering and conflict detection
        raise NotImplementedError(
            "Booking engine not built yet. Listed in DECISIONS.md as pending."
        )

    def find_alternative(self, request: dict[str, Any]) -> dict[str, Any] | None:
        """Find the nearest legal alternative slot for a request that cannot get its first choice.

        Search order: same time different room, adjacent time same room, adjacent time different room.
        """
        raise NotImplementedError(
            "Alternative finder not built yet. Listed in DECISIONS.md as pending."
        )
