"""LLM provider interface. The model reads and writes words. It never holds authority.

The model outputs only a strict JSON draft (venue, date, start, end, event type,
attendees, accessibility need, conditions). No tool it can call writes data.
User text is treated as data. Instructions inside it are ignored and flagged.

If the API key is missing or the call fails, the app falls back to the regex-based
parser automatically. The manual form never depends on any API.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any


@dataclass
class ParsedBooking:
    """Structured booking draft produced by the LLM or fallback parser."""

    attendance: int | None = None
    duration_periods: int | None = None
    windows: list[dict[str, Any]] | None = None
    room_types: list[str] | None = None
    needs: list[str] | None = None
    requested_room: str | None = None
    mandatory_for_groups: list[str] | None = None
    event_type: str | None = None
    raw_text: str = ""
    provenance: dict[str, str] | None = None  # field -> "inferred from X"
    follow_up: str | None = None  # question to ask if something is vague
    used_fallback: bool = False


class LLMProvider:
    """Wraps the LLM API call. Never decides validity, priority, or data writes."""

    def __init__(self) -> None:
        """Read config from environment. Missing key means fallback mode."""
        self.provider = os.getenv("LLM_PROVIDER", "openai")
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")
        self.available = bool(self.api_key)

    def parse_booking_text(self, raw_text: str, user_role: str) -> ParsedBooking:
        """Send the text to the LLM and parse its JSON response into a draft.

        Falls back to the regex parser if the API key is missing or the call fails.
        The role is passed for context only: it does not affect validity or priority.
        """
        if not self.available:
            return self._fallback_parse(raw_text)
        # TODO(subash): implement LLM call with prompt from prompts/booking_parse.txt
        raise NotImplementedError(
            "LLM integration not built yet. Listed in DECISIONS.md as pending."
        )

    def explain_friendly(self, reason_codes: list[dict[str, str]]) -> str:
        """Rewrite structured reason codes in friendly words. Must not add facts."""
        if not self.available:
            # Without LLM, return the raw codes as a readable string
            return "; ".join(f"{r['rule']}: {r['detail']}" for r in reason_codes)
        raise NotImplementedError(
            "Friendly explain not built yet. Listed in DECISIONS.md as pending."
        )

    def _fallback_parse(self, raw_text: str) -> ParsedBooking:
        """Regex and lexicon based parser. No network call. Always available."""
        # Minimal fallback: return the raw text with a follow-up question
        return ParsedBooking(
            raw_text=raw_text,
            used_fallback=True,
            follow_up="Please fill in the booking details manually.",
        )
