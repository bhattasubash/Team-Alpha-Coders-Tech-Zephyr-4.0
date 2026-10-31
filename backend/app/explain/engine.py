"""Counterfactual explanation engine: answers 'why is this class at this time?'

The engine tries every other (day, period, room) for a session and records
the first rule each one breaks. The result is structured reason codes that
the AI layer may rewrite in friendly words but cannot add facts to.
"""

from __future__ import annotations

from typing import Any


class ExplainEngine:
    """Produces structured explanations for scheduling decisions."""

    def __init__(self, data: dict[str, Any], schedule: dict[str, tuple[str, int, str]]) -> None:
        """Store dataset and current schedule for counterfactual checks."""
        self.data = data
        self.schedule = schedule

    def why_here(self, session_id: str) -> dict[str, Any]:
        """Explain why a session is at its current (day, period, room).

        Tries moving the session to every other legal slot. For each alternative,
        records the first constraint it violates. Groups results by blocking reason.
        """
        # TODO(subash): implement counterfactual search using the kernel validator
        raise NotImplementedError(
            "Explain engine not built yet. Listed in DECISIONS.md as pending."
        )

    def what_blocks(self, session_id: str, day: str, period: int, room_id: str) -> list[str]:
        """List all rules that prevent placing this session at a specific slot."""
        raise NotImplementedError(
            "Slot blocking check not built yet. Listed in DECISIONS.md as pending."
        )
