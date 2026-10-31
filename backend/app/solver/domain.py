"""Domain pruning for the CP-SAT timetable solver.

Generates the set of legal (day, start_period, room_id) triples for each session
using exact validator constraint definitions as reference.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.kernel.context import LAST_TEACHING, KernelContext


def prune_session_domains(
    data: dict[str, Any],
    ctx: KernelContext | None = None,
) -> dict[str, list[tuple[str, int, str]]]:
    """Compute all legal (day, start_period, room_id) assignments per session.

    A triple is legal if and only if it satisfies all individual session-level constraints:
    - Within periods P1 to P9 (LAST_TEACHING)
    - Does not cross the lunch break (lunch.after_period)
    - Labs start only at calendar.lab_start_periods
    - Room type is in session.room_types
    - Room capacity >= session.size
    - Room is accessible if session.needs_accessible is True
    - Room is not unavailable for any period of the block
    - Faculty is not unavailable for any period of the block
    - Fixed slot (day and start_period) is respected if present
    """
    if ctx is None:
        ctx = KernelContext(data)

    days = ctx.days
    lunch_after = ctx.lunch
    lab_starts = ctx.lab_starts
    rooms = ctx.rooms

    domains: dict[str, list[tuple[str, int, str]]] = defaultdict(list)

    for sid, s in ctx.sessions.items():
        dur = s["duration"]
        kind = s.get("kind", "lecture")
        size = s.get("size", 0)
        allowed_room_types = set(s.get("room_types", []))
        needs_acc = bool(s.get("needs_accessible", False))
        fx = s.get("fixed_slot")
        fid = s["faculty_id"]

        for day in days:
            if fx and fx["day"] != day:
                continue

            for start in range(1, LAST_TEACHING - dur + 2):
                if fx and fx["start_period"] != start:
                    continue

                if kind == "lab" and start not in lab_starts:
                    continue

                end = start + dur - 1
                # Lunch check: block must not contain both lunch_after and lunch_after + 1
                if start <= lunch_after < end:
                    continue

                # Faculty unavailability check
                block_periods = range(start, end + 1)
                if any((day, p) in ctx.fac_un[fid] for p in block_periods):
                    continue

                for rid, r in rooms.items():
                    if r["type"] not in allowed_room_types:
                        continue
                    if r["capacity"] < size:
                        continue
                    if needs_acc and not r["accessible"]:
                        continue
                    if any((day, p) in ctx.room_un[rid] for p in block_periods):
                        continue

                    domains[sid].append((day, start, rid))

    return dict(domains)
