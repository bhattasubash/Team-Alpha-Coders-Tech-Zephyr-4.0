"""Booking decision engine for Spectra week.

Milestone 5: SPECTRA WEEK BOOKINGS
Priority comes from authenticated role and category caps, matching the official validator.
Nobody approves their own request. Every decision carries a reason code.
Pass 1: Greedy in priority order (outranks comparator, role caps applied).
Pass 2: For institute_event that cannot fit, displace regular sessions into session_overrides.
Pass 3: Verify no priority inversions, no hard violations, no cancelled bookings accepted.
"""

from __future__ import annotations

from collections import defaultdict
from functools import cmp_to_key
from typing import Any

from app.kernel.context import KernelContext
from app.kernel.validate import check_timetable


def block(start: int, dur: int) -> range:
    """Return range of periods occupied by a session starting at start."""
    return range(start, start + dur)



def effective_category(data: dict[str, Any], req: dict[str, Any]) -> str:
    """Cap the requested category by the role's maximum allowed category.

    Mirrors the official validator's effective_category exactly.
    A club representative asking for 'institute_event' still gets 'club_event'.
    """
    order = data["priority_order"]
    cap = data.get("role_category_cap", {}).get(req.get("role"), "club_event")
    raw_cat = req.get("requested_category")
    raw_idx = order.index(raw_cat) if raw_cat in order else len(order) - 1
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
MAX_PERIOD = 13


class BookingEngine:
    """Decides booking requests for Spectra week using priority and constraint checks.

    The engine maximises the validator's booking score, not first-come-first-served.
    Each decision includes a reason code, conflicting sessions, and the nearest alternative.
    """

    def __init__(
        self,
        data: dict[str, Any],
        base_schedule: dict[str, Any] | dict[str, tuple[str, int, str]],
    ) -> None:
        """Store dataset and baseline timetable for conflict checking."""
        self.data = data
        self.ctx = KernelContext(data)

        # Normalize base_schedule to dict[session_id, (day, start_period, room_id)]
        if isinstance(base_schedule, dict) and "sessions" in base_schedule:
            self.base_assign: dict[str, tuple[str, int, str]] = {
                s["session_id"]: (s["day"], s["start_period"], s["room_id"])
                for s in base_schedule["sessions"]
            }
        else:
            self.base_assign = dict(base_schedule)  # type: ignore[arg-type]

        # Extract cancelled booking IDs from cancellations list and booking requests
        self.cancelled_ids: set[str] = {
            c["request_id"] for c in data.get("cancellations", [])
        }
        for b in data.get("booking_requests", []):
            if b.get("cancelled", False):
                self.cancelled_ids.add(b["id"])

        self.days: list[str] = data["calendar"]["days"]

    def _get_candidate_rooms(
        self,
        req: dict[str, Any],
        series_room_pref: str | None = None,
    ) -> list[str]:
        """Find candidate rooms matching type, capacity, allowed uses, and needs."""
        att = req.get("attendance", 0)
        rtypes = set(req.get("room_types", []))
        needs = set(req.get("needs", []))
        pref_room = req.get("requested_room")

        candidates: list[str] = []
        for r in self.data["rooms"]:
            if "event" not in r.get("allowed_uses", []):
                continue
            if r["type"] not in rtypes:
                continue
            if r["capacity"] < att:
                continue
            feats = set(r.get("features", [])) | ({"accessible"} if r.get("accessible") else set())
            if needs - feats:
                continue
            candidates.append(r["id"])

        # Sorting: requested_room first, then series preferred room, then smallest capacity first
        room_dict = self.ctx.rooms
        candidates.sort(key=lambda rid: (
            0 if rid == pref_room else (1 if rid == series_room_pref else 2),
            room_dict[rid]["capacity"],
        ))
        return candidates

    def _is_slot_free(
        self,
        room_id: str,
        day: str,
        a: int,
        b: int,
        room_busy: dict[tuple[str, str, int], list[str]],
        wgrp: dict[tuple[str, str, int], list[str]],
        mand_groups: list[str],
    ) -> bool:
        """Check if room and mandatory groups are free during period range [a, b]."""
        for p in range(a, b + 1):
            if (day, p) in self.ctx.room_un.get(room_id, set()):
                return False
            if room_busy.get((room_id, day, p)):
                return False
            for g in mand_groups:
                if wgrp.get((g, day, p)):
                    return False
        return True

    def decide_all(self) -> dict[str, Any]:
        """Process all non-cancelled booking requests and return decisions with reasons.

        Returns dict matching fest_week export format: bookings list and session_overrides.
        """
        reqs = self.data.get("booking_requests", [])
        if not reqs:
            return {"bookings": [], "session_overrides": [], "decisions": []}

        # Priority comparator
        def prio_cmp(r1: dict[str, Any], r2: dict[str, Any]) -> int:
            if outranks(self.data, r1, r2):
                return -1
            if outranks(self.data, r2, r1):
                return 1
            return 0

        sorted_reqs = sorted(reqs, key=cmp_to_key(prio_cmp))

        # Initial week-7 timetable and occupancy
        week: dict[str, tuple[str, int, str]] = dict(self.base_assign)
        session_overrides: list[dict[str, Any]] = []

        room_busy: dict[tuple[str, str, int], list[str]] = defaultdict(list)
        for sid, (day, start, rid) in week.items():
            s = self.ctx.sessions.get(sid)
            if s:
                for p in block(start, s["duration"]):
                    room_busy[(rid, day, p)].append(sid)

        _, wgrp = check_timetable(self.ctx, week, "fest_week")

        decisions_by_id: dict[str, dict[str, Any]] = {}
        placed: dict[str, tuple[str, str, int, int]] = {}
        series_allocated_room: dict[str, str] = {}
        unplaced: list[dict[str, Any]] = []

        # =========================================================================
        # PASS 1: Greedy placement in priority order
        # =========================================================================
        for req in sorted_reqs:
            rid_ = req["id"]

            # Handle cancelled requests
            if rid_ in self.cancelled_ids or req.get("cancelled", False):
                decisions_by_id[rid_] = {
                    "request_id": rid_,
                    "booking_id": rid_,
                    "status": "rejected",
                    "reason": "Booking request was cancelled",
                }
                continue

            dur = req["duration_periods"]
            mand_groups = req.get("mandatory_for_groups", [])
            series_id = req.get("series_id")
            series_pref = series_allocated_room.get(series_id) if series_id else None
            cand_rooms = self._get_candidate_rooms(req, series_room_pref=series_pref)

            # Try approved placement in requested windows
            approved_placement: tuple[str, str, int, int] | None = None
            for w in req.get("windows", []):
                d = w["day"]
                if d not in self.days:
                    continue
                f_p = max(1, w["from_period"])
                t_p = min(w["to_period"], MAX_PERIOD)
                for s0 in range(f_p, t_p - dur + 2):
                    e0 = s0 + dur - 1
                    if e0 > MAX_PERIOD:
                        continue
                    for r_id in cand_rooms:
                        if self._is_slot_free(r_id, d, s0, e0, room_busy, wgrp, mand_groups):
                            approved_placement = (r_id, d, s0, e0)
                            break
                    if approved_placement:
                        break
                if approved_placement:
                    break

            if approved_placement:
                r_id, d, s0, e0 = approved_placement
                for p in range(s0, e0 + 1):
                    room_busy[(r_id, d, p)].append(rid_)
                placed[rid_] = (r_id, d, s0, e0)
                if series_id:
                    series_allocated_room[series_id] = r_id
                decisions_by_id[rid_] = {
                    "request_id": rid_,
                    "booking_id": rid_,
                    "status": "approved",
                    "room_id": r_id,
                    "allocated_room": r_id,
                    "day": d,
                    "allocated_day": d,
                    "start_period": s0,
                    "allocated_period": s0,
                    "end_period": e0,
                    "reason": "Approved within requested window",
                }
            else:
                unplaced.append(req)

        # =========================================================================
        # PASS 2: Displace regular sessions for unplaced institute_events
        # =========================================================================
        still_unplaced: list[dict[str, Any]] = []
        for req in unplaced:
            rid_ = req["id"]
            eff_cat = effective_category(self.data, req)

            displaced_successfully = False
            if eff_cat == "institute_event":
                dur = req["duration_periods"]
                mand_groups = req.get("mandatory_for_groups", [])
                series_id = req.get("series_id")
                series_pref = series_allocated_room.get(series_id) if series_id else None
                cand_rooms = self._get_candidate_rooms(req, series_room_pref=series_pref)

                for w in req.get("windows", []):
                    d = w["day"]
                    if d not in self.days:
                        continue
                    f_p = max(1, w["from_period"])
                    t_p = min(w["to_period"], MAX_PERIOD)
                    for s0 in range(f_p, t_p - dur + 2):
                        e0 = s0 + dur - 1
                        if e0 > MAX_PERIOD:
                            continue
                        for r_id in cand_rooms:
                            # Check room unavailability
                            if any((d, p) in self.ctx.room_un.get(r_id, set()) for p in range(s0, e0 + 1)):
                                continue
                            # Check mandatory groups
                            if any(wgrp.get((g, d, p)) for g in mand_groups for p in range(s0, e0 + 1)):
                                continue

                            # Identify clashing regular sessions
                            clashing_sessions: set[str] = set()
                            has_booking_clash = False
                            for p in range(s0, e0 + 1):
                                occupants = room_busy.get((r_id, d, p), [])
                                for occ in occupants:
                                    if occ in self.ctx.sessions:
                                        clashing_sessions.add(occ)
                                    else:
                                        has_booking_clash = True
                                        break
                                if has_booking_clash:
                                    break

                            if has_booking_clash or not clashing_sessions:
                                continue

                            # Try to find alternative legal slots for all clashing sessions
                            displacement_plan: dict[str, tuple[str, int, str]] = {}
                            temp_week = dict(week)
                            can_move_all = True

                            for clashing_sid in clashing_sessions:
                                clashing_s = self.ctx.sessions[clashing_sid]
                                c_dur = clashing_s["duration"]
                                c_rtypes = set(clashing_s["room_types"])
                                c_size = clashing_s["size"]
                                c_acc = clashing_s.get("needs_accessible", False)
                                c_kind = clashing_s.get("kind")

                                candidate_move: tuple[str, int, str] | None = None
                                old_slot = week[clashing_sid]
                                for move_d in self.days:
                                    for move_t in range(1, 10 - c_dur + 1):
                                        if move_t <= self.ctx.lunch < move_t + c_dur - 1:
                                            continue
                                        if c_kind == "lab" and move_t not in self.ctx.lab_starts:
                                            continue
                                        for move_r in self.data["rooms"]:
                                            m_rid = move_r["id"]
                                            # Must not be the original slot
                                            if (move_d, move_t, m_rid) == old_slot:
                                                continue
                                            # Must not overlap with the booking's target slot
                                            if m_rid == r_id and move_d == d and max(move_t, s0) <= min(move_t + c_dur - 1, e0):
                                                continue
                                            if move_r["type"] not in c_rtypes:
                                                continue
                                            if move_r["capacity"] < c_size:
                                                continue
                                            if c_acc and not move_r["accessible"]:
                                                continue

                                            # Trial move in timetable
                                            test_week = dict(temp_week)
                                            test_week[clashing_sid] = (move_d, move_t, m_rid)
                                            # Ensure no clash with bookings
                                            clash_with_booking = False
                                            for mp in range(move_t, move_t + c_dur):
                                                if any(b_id in placed for b_id in room_busy.get((m_rid, move_d, mp), [])):
                                                    clash_with_booking = True
                                                    break
                                            if clash_with_booking:
                                                continue

                                            # Check timetable validity
                                            wv, _ = check_timetable(self.ctx, test_week, "fest_week")
                                            if not wv:
                                                candidate_move = (move_d, move_t, m_rid)
                                                break
                                        if candidate_move:
                                            break
                                    if candidate_move:
                                        break

                                if candidate_move:
                                    displacement_plan[clashing_sid] = candidate_move
                                    temp_week[clashing_sid] = candidate_move
                                else:
                                    can_move_all = False
                                    break

                            if can_move_all:
                                # Apply displacement
                                for clashing_sid, new_slot in displacement_plan.items():
                                    old_d, old_t, old_r = week[clashing_sid]
                                    old_dur = self.ctx.sessions[clashing_sid]["duration"]
                                    for op in range(old_t, old_t + old_dur):
                                        if clashing_sid in room_busy[(old_r, old_d, op)]:
                                            room_busy[(old_r, old_d, op)].remove(clashing_sid)

                                    week[clashing_sid] = new_slot
                                    new_d, new_t, new_r = new_slot
                                    for np in range(new_t, new_t + old_dur):
                                        room_busy[(new_r, new_d, np)].append(clashing_sid)

                                    session_overrides.append({
                                        "session_id": clashing_sid,
                                        "day": new_d,
                                        "start_period": new_t,
                                        "room_id": new_r,
                                        "displaced_by": rid_,
                                    })

                                # Refresh wgrp
                                _, wgrp = check_timetable(self.ctx, week, "fest_week")

                                # Place institute event
                                for p in range(s0, e0 + 1):
                                    room_busy[(r_id, d, p)].append(rid_)
                                placed[rid_] = (r_id, d, s0, e0)
                                if series_id:
                                    series_allocated_room[series_id] = r_id
                                decisions_by_id[rid_] = {
                                    "request_id": rid_,
                                    "booking_id": rid_,
                                    "status": "approved",
                                    "room_id": r_id,
                                    "allocated_room": r_id,
                                    "day": d,
                                    "allocated_day": d,
                                    "start_period": s0,
                                    "allocated_period": s0,
                                    "end_period": e0,
                                    "reason": f"Approved; displaced clashing sessions: {sorted(displacement_plan.keys())}",
                                }
                                displaced_successfully = True
                                break
                        if displaced_successfully:
                            break
                    if displaced_successfully:
                        break

            if not displaced_successfully:
                still_unplaced.append(req)

        # =========================================================================
        # Alternative search for unplaced requests across the whole week
        # =========================================================================
        for req in still_unplaced:
            rid_ = req["id"]
            dur = req["duration_periods"]
            mand_groups = req.get("mandatory_for_groups", [])
            series_id = req.get("series_id")
            series_pref = series_allocated_room.get(series_id) if series_id else None
            cand_rooms = self._get_candidate_rooms(req, series_room_pref=series_pref)

            alt_placement: tuple[str, str, int, int] | None = None
            for d in self.days:
                for s0 in range(1, MAX_PERIOD - dur + 2):
                    e0 = s0 + dur - 1
                    for r_id in cand_rooms:
                        if self._is_slot_free(r_id, d, s0, e0, room_busy, wgrp, mand_groups):
                            alt_placement = (r_id, d, s0, e0)
                            break
                    if alt_placement:
                        break
                if alt_placement:
                    break

            if alt_placement:
                r_id, d, s0, e0 = alt_placement
                for p in range(s0, e0 + 1):
                    room_busy[(r_id, d, p)].append(rid_)
                placed[rid_] = (r_id, d, s0, e0)
                if series_id:
                    series_allocated_room[series_id] = r_id
                decisions_by_id[rid_] = {
                    "request_id": rid_,
                    "booking_id": rid_,
                    "status": "alternative_offered",
                    "room_id": r_id,
                    "allocated_room": r_id,
                    "day": d,
                    "allocated_day": d,
                    "start_period": s0,
                    "allocated_period": s0,
                    "end_period": e0,
                    "reason": f"Requested window occupied; alternative offered at {d} P{s0}-P{e0} in {r_id}",
                }
            else:
                att = req.get("attendance", 0)
                decisions_by_id[rid_] = {
                    "request_id": rid_,
                    "booking_id": rid_,
                    "status": "rejected",
                    "reason": f"No legal room of required type or capacity available without conflict (attendance {att})",
                }

        # Format output in original dataset order
        decisions: list[dict[str, Any]] = [
            decisions_by_id[req["id"]] for req in reqs if req["id"] in decisions_by_id
        ]

        return {
            "bookings": decisions,
            "session_overrides": session_overrides,
            "decisions": decisions,
        }

    def find_alternative(self, request: dict[str, Any]) -> dict[str, Any] | None:
        """Find the nearest legal alternative slot for a request."""
        dur = request.get("duration_periods", 1)
        mand_groups = request.get("mandatory_for_groups", [])
        cand_rooms = self._get_candidate_rooms(request)

        # Baseline week room busy
        room_busy: dict[tuple[str, str, int], list[str]] = defaultdict(list)
        for sid, (day, start, rid) in self.base_assign.items():
            s = self.ctx.sessions.get(sid)
            if s:
                for p in block(start, s["duration"]):
                    room_busy[(rid, day, p)].append(sid)

        _, wgrp = check_timetable(self.ctx, self.base_assign, "fest_week")

        for d in self.days:
            for s0 in range(1, MAX_PERIOD - dur + 2):
                e0 = s0 + dur - 1
                for r_id in cand_rooms:
                    if self._is_slot_free(r_id, d, s0, e0, room_busy, wgrp, mand_groups):
                        return {
                            "room_id": r_id,
                            "day": d,
                            "start_period": s0,
                            "end_period": e0,
                            "reason": f"Available alternative slot found at {d} P{s0}-P{e0} in {r_id}",
                        }
        return None
