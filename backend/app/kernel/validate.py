"""Core validation logic mirroring the official validator check_timetable, check_bookings, check_exams, and soft_score exactly."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.kernel.context import LAST_TEACHING, MAX_PERIOD, KernelContext
from app.kernel.types import Violation

CAT_WEIGHT = {"institute_event": 5, "guest_lecture": 4, "department_event": 3, "club_event": 2}


def _block(start: int, duration: int) -> list[int]:
    """Return the list of periods occupied by a session."""
    return list(range(start, start + duration))


def effective_category(data: dict[str, Any], req: dict[str, Any]) -> str:
    """Return effective priority category after role cap."""
    order = data["priority_order"]
    cap = data["role_category_cap"].get(req["role"], "club_event")
    a = order.index(req["requested_category"]) if req["requested_category"] in order else len(order) - 1
    return order[max(a, order.index(cap))]


def outranks(data: dict[str, Any], r1: dict[str, Any], r2: dict[str, Any]) -> bool:
    """True if request r1 has priority over r2."""
    order = data["priority_order"]
    c1, c2 = order.index(effective_category(data, r1)), order.index(effective_category(data, r2))
    if c1 != c2:
        return c1 < c2
    return r1["submitted_at"] < r2["submitted_at"]


# ---------------------------------------------------------------- timetable checks


def check_all_scheduled(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H1: every session must be scheduled exactly once, no unknowns."""
    violations: list[Violation] = []
    for sid in ctx.sessions:
        if sid not in assign:
            violations.append(Violation(rule="H1", detail=f"Session {sid} is not scheduled"))
    for sid in assign:
        if sid not in ctx.sessions:
            violations.append(Violation(rule="H1", detail=f"Unknown session id {sid}"))
    return violations


def check_faculty_conflicts(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H2: no faculty double-booking at the same (day, period)."""
    violations: list[Violation] = []
    fac_occ: dict[tuple[str, str, int], list[str]] = defaultdict(list)
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None or day not in ctx.days:
            continue
        if not isinstance(start, int) or start < 1 or start + s["duration"] - 1 > LAST_TEACHING:
            continue
        for p in _block(start, s["duration"]):
            fac_occ[(s["faculty_id"], day, p)].append(sid)
    for (f, day, p), sids in fac_occ.items():
        if len(sids) > 1:
            violations.append(
                Violation(
                    rule="H2",
                    detail=f"{f} double-booked {day} P{p}: {', '.join(sorted(sids))}",
                )
            )
    return violations


def check_group_conflicts(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H3: no student group double-booking. Basket slots share one key."""
    violations: list[Violation] = []
    grp_occ: dict[tuple[str, str, int], set[str]] = defaultdict(set)
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None or day not in ctx.days:
            continue
        if not isinstance(start, int) or start < 1 or start + s["duration"] - 1 > LAST_TEACHING:
            continue
        key = s.get("basket_slot") or sid
        for p in _block(start, s["duration"]):
            for g in s["groups"]:
                grp_occ[(g, day, p)].add(key)
    for (g, day, p), keys in grp_occ.items():
        if len(keys) > 1:
            violations.append(
                Violation(
                    rule="H3",
                    detail=f"Group {g} double-booked {day} P{p}: {', '.join(sorted(keys))}",
                )
            )
    return violations


def check_room_conflicts(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H4: no room double-booking at the same (day, period)."""
    violations: list[Violation] = []
    room_occ: dict[tuple[str, str, int], list[str]] = defaultdict(list)
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None or day not in ctx.days:
            continue
        if not isinstance(start, int) or start < 1 or start + s["duration"] - 1 > LAST_TEACHING:
            continue
        r = ctx.rooms.get(rid)
        if r is None:
            continue
        for p in _block(start, s["duration"]):
            room_occ[(rid, day, p)].append(sid)
    for (rid, day, p), sids in room_occ.items():
        if len(sids) > 1:
            violations.append(
                Violation(
                    rule="H4",
                    detail=f"{rid} double-booked {day} P{p}: {', '.join(sorted(sids))}",
                )
            )
    return violations


def check_capacity(ctx: KernelContext, assign: dict[str, tuple[str, int, str]]) -> list[Violation]:
    """H5: room capacity must be >= session size."""
    violations: list[Violation] = []
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None:
            continue
        r = ctx.rooms.get(rid)
        if r is None:
            continue
        if r["capacity"] < s["size"]:
            violations.append(
                Violation(
                    rule="H5",
                    detail=f"{sid}: size {s['size']} > {rid} capacity {r['capacity']}",
                )
            )
    return violations


def check_room_types(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H6: room type must be in session's allowed room_types list."""
    violations: list[Violation] = []
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None:
            continue
        r = ctx.rooms.get(rid)
        if r is None:
            continue
        if r["type"] not in s["room_types"]:
            violations.append(
                Violation(
                    rule="H6",
                    detail=f"{sid}: needs {s['room_types']}, {rid} is {r['type']}",
                )
            )
    return violations


def check_faculty_availability(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H7: faculty must not be scheduled during their unavailable slots."""
    violations: list[Violation] = []
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None or day not in ctx.days:
            continue
        if not isinstance(start, int) or start < 1 or start + s["duration"] - 1 > LAST_TEACHING:
            continue
        r = ctx.rooms.get(rid)
        if r is None:
            continue
        f = s["faculty_id"]
        for p in _block(start, s["duration"]):
            if (day, p) in ctx.fac_un[f]:
                violations.append(
                    Violation(
                        rule="H7",
                        detail=f"{sid}: {f} unavailable {day} P{p}",
                    )
                )
    return violations


def check_room_availability(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H8: room must not be scheduled during its unavailable slots."""
    violations: list[Violation] = []
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None or day not in ctx.days:
            continue
        if not isinstance(start, int) or start < 1 or start + s["duration"] - 1 > LAST_TEACHING:
            continue
        r = ctx.rooms.get(rid)
        if r is None:
            continue
        for p in _block(start, s["duration"]):
            if (day, p) in ctx.room_un[rid]:
                violations.append(
                    Violation(
                        rule="H8",
                        detail=f"{sid}: {rid} unavailable {day} P{p}",
                    )
                )
    return violations


def check_period_constraints(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H9: sessions must fit P1-P9, not cross lunch, labs at P2/P6 only."""
    violations: list[Violation] = []
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None:
            continue
        if day not in ctx.days:
            continue
        if not isinstance(start, int) or start < 1 or start + s["duration"] - 1 > LAST_TEACHING:
            violations.append(
                Violation(
                    rule="H9",
                    detail=f"{sid}: start period {start} with duration {s['duration']} runs outside P1-P9",
                )
            )
            continue
        per = _block(start, s["duration"])
        if per[0] <= ctx.lunch < per[-1]:
            violations.append(
                Violation(
                    rule="H9",
                    detail=f"{sid}: crosses lunch ({day} P{per[0]}-P{per[-1]})",
                )
            )
        if s["kind"] == "lab" and start not in ctx.lab_starts:
            violations.append(
                Violation(
                    rule="H9",
                    detail=f"{sid}: lab must start at P2 or P6, starts at P{start}",
                )
            )
    return violations


def check_accessibility(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H10: sessions needing accessibility must use accessible rooms."""
    violations: list[Violation] = []
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None:
            continue
        r = ctx.rooms.get(rid)
        if r is None:
            continue
        if s.get("needs_accessible") and not r["accessible"]:
            violations.append(
                Violation(
                    rule="H10",
                    detail=f"{sid}: needs an accessible room, {rid} is not",
                )
            )
    return violations


def check_basket_slots(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H11: all sessions in the same basket_slot must share (day, start_period)."""
    violations: list[Violation] = []
    basket_time: dict[str, set[tuple[str, int]]] = defaultdict(set)
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None:
            continue
        if s.get("basket_slot"):
            basket_time[s["basket_slot"]].add((day, start))
    for b, times in basket_time.items():
        if len(times) > 1:
            violations.append(
                Violation(
                    rule="H11",
                    detail=f"Basket {b} sessions are not at the same time: {sorted(times)}",
                )
            )
    return violations


def check_faculty_daily_limit(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H12: faculty daily teaching hours must not exceed max_hours_per_day."""
    violations: list[Violation] = []
    fac_day: dict[tuple[str, str], int] = defaultdict(int)
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None or day not in ctx.days:
            continue
        if not isinstance(start, int) or start < 1 or start + s["duration"] - 1 > LAST_TEACHING:
            continue
        r = ctx.rooms.get(rid)
        if r is None:
            continue
        fac_day[(s["faculty_id"], day)] += s["duration"]
    for (f, day), hours in fac_day.items():
        mx = ctx.fac[f].get("max_hours_per_day", 4)
        if hours > mx:
            violations.append(
                Violation(
                    rule="H12",
                    detail=f"{f} teaches {hours} hours on {day} (max {mx})",
                )
            )
    return violations


def check_fixed_slots(
    ctx: KernelContext, assign: dict[str, tuple[str, int, str]]
) -> list[Violation]:
    """H14: sessions with a fixed_slot must be placed at that exact (day, start)."""
    violations: list[Violation] = []
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None:
            continue
        fx = s.get("fixed_slot")
        if fx and (fx["day"] != day or fx["start_period"] != start):
            violations.append(
                Violation(
                    rule="H14",
                    detail=f"{sid}: fixed at {fx['day']} P{fx['start_period']}, placed at {day} P{start}",
                )
            )
    return violations


# ---------------------------------------------------------------- timetable runner


def check_timetable(
    ctx: KernelContext,
    assign: dict[str, tuple[str, int, str]],
    label: str = "timetable",
) -> tuple[list[Violation], dict[tuple[str, str, int], set[str]]]:
    """Mirror check_timetable from validator.py exactly. Returns (violations, grp_occ)."""
    V: list[Violation] = []

    def v(rule: str, msg: str) -> None:
        V.append(Violation(rule=rule, where=label, detail=msg))

    room_occ: dict[tuple[str, str, int], list[str]] = defaultdict(list)
    fac_occ: dict[tuple[str, str, int], list[str]] = defaultdict(list)
    grp_occ: dict[tuple[str, str, int], set[str]] = defaultdict(set)
    fac_day: dict[tuple[str, str], int] = defaultdict(int)
    basket_time: dict[str, set[tuple[str, int]]] = defaultdict(set)

    for sid in ctx.sessions:
        if sid not in assign:
            v("H1", f"Session {sid} is not scheduled")
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s is None:
            v("H1", f"Unknown session id {sid}")
            continue
        if day not in ctx.days:
            v("H1", f"{sid}: invalid day {day}")
            continue
        if not isinstance(start, int) or start < 1 or start + s["duration"] - 1 > LAST_TEACHING:
            v("H9", f"{sid}: start period {start} with duration {s['duration']} runs outside P1-P9")
            continue
        r = ctx.rooms.get(rid)
        if r is None:
            v("H1", f"{sid}: unknown room {rid}")
            continue
        per = _block(start, s["duration"])
        if per[0] <= ctx.lunch < per[-1]:
            v("H9", f"{sid}: crosses lunch ({day} P{per[0]}-P{per[-1]})")
        if s["kind"] == "lab" and start not in ctx.lab_starts:
            v("H9", f"{sid}: lab must start at P2 or P6, starts at P{start}")
        fx = s.get("fixed_slot")
        if fx and (fx["day"] != day or fx["start_period"] != start):
            v("H14", f"{sid}: fixed at {fx['day']} P{fx['start_period']}, placed at {day} P{start}")
        if r["capacity"] < s["size"]:
            v("H5", f"{sid}: size {s['size']} > {rid} capacity {r['capacity']}")
        if r["type"] not in s["room_types"]:
            v("H6", f"{sid}: needs {s['room_types']}, {rid} is {r['type']}")
        if s.get("needs_accessible") and not r["accessible"]:
            v("H10", f"{sid}: needs an accessible room, {rid} is not")
        f = s["faculty_id"]
        for p in per:
            room_occ[(rid, day, p)].append(sid)
            fac_occ[(f, day, p)].append(sid)
            key = s.get("basket_slot") or sid
            for g in s["groups"]:
                grp_occ[(g, day, p)].add(key)
            if (day, p) in ctx.fac_un[f]:
                v("H7", f"{sid}: {f} unavailable {day} P{p}")
            if (day, p) in ctx.room_un[rid]:
                v("H8", f"{sid}: {rid} unavailable {day} P{p}")
        fac_day[(f, day)] += s["duration"]
        if s.get("basket_slot"):
            basket_time[s["basket_slot"]].add((day, start))

    for (rid, day, p), sids in room_occ.items():
        if len(sids) > 1:
            v("H4", f"{rid} double-booked {day} P{p}: {', '.join(sorted(sids))}")
    for (f, day, p), sids in fac_occ.items():
        if len(sids) > 1:
            v("H2", f"{f} double-booked {day} P{p}: {', '.join(sorted(sids))}")
    for (g, day, p), keys in grp_occ.items():
        if len(keys) > 1:
            v("H3", f"Group {g} double-booked {day} P{p}: {', '.join(sorted(keys))}")
    for b, times in basket_time.items():
        if len(times) > 1:
            v("H11", f"Basket {b} sessions are not at the same time: {sorted(times)}")
    for (f, day), h in fac_day.items():
        mx = ctx.fac[f].get("max_hours_per_day", 4)
        if h > mx:
            v("H12", f"{f} teaches {h} hours on {day} (max {mx})")
    return V, grp_occ


def validate_timetable(
    ctx: KernelContext,
    assign: dict[str, tuple[str, int, str]],
    label: str = "timetable",
) -> list[Violation]:
    """Backward-compatible wrapper returning only list of violations."""
    v, _ = check_timetable(ctx, assign, label)
    return v


# ---------------------------------------------------------------- soft scoring


def soft_score(
    ctx: KernelContext,
    assign: dict[str, tuple[str, int, str]],
) -> tuple[dict[str, int], int]:
    """Compute soft penalty scores, mirroring the official soft_score exactly."""
    pen: dict[str, int] = defaultdict(int)
    grp_day: dict[tuple[str, str], set[int]] = defaultdict(set)
    grp_hours: dict[tuple[str, str], int] = defaultdict(int)
    grp_course: dict[tuple[str, str, str], int] = defaultdict(int)
    seen_basket: set[tuple[str, str]] = set()

    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        r = ctx.rooms.get(rid)
        if s is None or r is None:
            continue
        per = _block(start, s["duration"])

        # S1: faculty preference avoidance
        for pref in ctx.fac.get(s["faculty_id"], {}).get("preferences", []):
            if pref.get("type") == "avoid" and day in pref.get("days", ctx.days):
                pen["S1"] += 2 * sum(1 for p in per if p in pref["periods"])

        # S5: room underutilization
        if r["capacity"] and s["size"] / r["capacity"] < 0.4:
            pen["S5"] += 1

        # S6: last teaching period
        if LAST_TEACHING in per:
            pen["S6"] += 1

        # Group-level tracking
        for g in s["groups"]:
            for p in per:
                grp_day[(g, day)].add(p)
            # Basket deduplication for group hours and course counting
            if s.get("basket_slot"):
                if (g, s["basket_slot"]) in seen_basket:
                    continue
                seen_basket.add((g, s["basket_slot"]))
            grp_hours[(g, day)] += s["duration"]
            if s["kind"] == "lecture" and not s.get("basket_slot"):
                grp_course[(g, day, s["course_id"])] += 1

    # S2: group gaps (idle periods between first and last class)
    for (g, day), ps in grp_day.items():
        pen["S2"] += sum(1 for p in range(min(ps), max(ps) + 1) if p not in ps)

    # S3: group overload (>6 hours)
    for k, h in grp_hours.items():
        if h > 6:
            pen["S3"] += 3 * (h - 6)

    # S4: same non-basket course twice in a day
    for k, c in grp_course.items():
        if c > 1:
            pen["S4"] += 3 * (c - 1)

    # S4 (continued): basket lectures of the same course twice in a day
    bc: dict[tuple[str, str], int] = defaultdict(int)
    for sid, (day, start, rid) in assign.items():
        s = ctx.sessions.get(sid)
        if s and s.get("basket_slot"):
            bc[(s["course_id"], day)] += 1
    for k, c in bc.items():
        if c > 1:
            pen["S4"] += 3 * (c - 1)

    # Ensure all keys present
    for k in ("S1", "S2", "S3", "S4", "S5", "S6"):
        pen.setdefault(k, 0)

    return dict(sorted(pen.items())), sum(pen.values())


# ---------------------------------------------------------------- booking checks (B1, B2, B3, H13, Inversions)


def check_booking_b1(decisions: list[dict[str, Any]]) -> list[Violation]:
    """B1: exactly one valid decision per request, valid status value."""
    violations: list[Violation] = []
    seen: set[str] = set()
    for d in decisions:
        req_id = d.get("request_id")
        if req_id in seen:
            violations.append(Violation(rule="B1", where="fest_week", detail=f"Two decisions for {req_id}"))
        seen.add(req_id)
        st = d.get("status")
        if st not in ("approved", "rejected", "alternative_offered"):
            violations.append(Violation(rule="B1", where="fest_week", detail=f"{req_id}: unknown status {st}"))
    return violations


def check_booking_b2(
    ctx: KernelContext,
    base: dict[str, tuple[str, int, str]],
    fest: dict[str, Any],
) -> tuple[list[Violation], dict[str, tuple[str, int, str]]]:
    """B2: validate session overrides in fest_week and produce the week-7 view."""
    violations: list[Violation] = []
    overrides = fest.get("session_overrides", [])
    decisions = fest.get("bookings", [])
    dec_by = {d.get("request_id"): d for d in decisions}
    data = ctx.data

    week = dict(base)
    for o in overrides:
        sid = o.get("session_id")
        if sid not in ctx.sessions:
            violations.append(Violation(rule="B2", where="fest_week", detail=f"Override for unknown session {sid}"))
            continue
        disp = dec_by.get(o.get("displaced_by"))
        req = ctx.req.get(o.get("displaced_by"))
        if not req or not disp or disp.get("status") != "approved":
            violations.append(
                Violation(
                    rule="B2",
                    where="fest_week",
                    detail=f"Override of {sid} names {o.get('displaced_by')}, which is not an approved booking",
                )
            )
        elif data["priority_order"].index(effective_category(data, req)) > data["priority_order"].index("institute_event"):
            violations.append(
                Violation(
                    rule="B2",
                    where="fest_week",
                    detail=f"{o['displaced_by']} ({effective_category(data, req)}) is not allowed to displace a regular session",
                )
            )
        week[sid] = (o["day"], o["start_period"], o["room_id"])

    return violations, week


def check_booking_b3(ctx: KernelContext, decisions: list[dict[str, Any]]) -> list[Violation]:
    """B3: cancelled request must not be approved or offered alternative."""
    violations: list[Violation] = []
    for d in decisions:
        req_id = d.get("request_id")
        st = d.get("status")
        if req_id in ctx.cancelled and st in ("approved", "alternative_offered"):
            violations.append(Violation(rule="B3", where="fest_week", detail=f"{req_id} was cancelled but is {st}"))
    return violations


def check_booking_h13(
    ctx: KernelContext,
    req_id: str,
    req: dict[str, Any],
    decision: dict[str, Any],
    room_busy: dict[tuple[str, str, int], list[str]],
    wgrp: dict[tuple[str, str, int], set[str]],
) -> list[Violation]:
    """H13: full placement check for approved or alternative booking request."""
    violations: list[Violation] = []

    def bad(msg: str) -> None:
        violations.append(Violation(rule="H13", where="fest_week", detail=f"{req_id}: {msg}"))

    room = ctx.rooms.get(decision.get("room_id"))
    day, a, b = decision.get("day"), decision.get("start_period"), decision.get("end_period")
    if room is None:
        bad(f"unknown room {decision.get('room_id')}")
        return violations
    if day not in ctx.days or not isinstance(a, int) or not isinstance(b, int) or a < 1 or b > MAX_PERIOD or b < a:
        bad(f"invalid time {day} P{a}-P{b}")
        return violations
    if b - a + 1 != req["duration_periods"]:
        bad(f"booked {b-a+1} periods, request needs {req['duration_periods']}")
    if "event" not in room["allowed_uses"]:
        bad(f"{room['id']} cannot host events")
    if room["type"] not in req["room_types"]:
        bad(f"{room['id']} ({room['type']}) is not one of {req['room_types']}")
    if room["capacity"] < req["attendance"]:
        bad(f"{room['id']} seats {room['capacity']}, request needs {req['attendance']}")
    feats = set(room["features"]) | ({"accessible"} if room["accessible"] else set())
    miss = set(req["needs"]) - feats
    if miss:
        bad(f"{room['id']} lacks {sorted(miss)}")
    st = decision.get("status")
    if st == "approved":
        inside = any(w["day"] == day and w["from_period"] <= a and b <= w["to_period"] for w in req["windows"])
        if not inside:
            bad(f"approved at {day} P{a}-P{b}, outside the requested windows (use alternative_offered)")
    for p in range(a, b + 1):
        if (day, p) in ctx.room_un[room["id"]]:
            bad(f"{room['id']} unavailable {day} P{p}")
        if room_busy[(room["id"], day, p)]:
            bad(f"{room['id']} {day} P{p} already used by {', '.join(room_busy[(room['id'], day, p)])}")
        for g in req["mandatory_for_groups"]:
            if wgrp.get((g, day, p)):
                bad(f"mandatory for {g}, who have class {day} P{p}")
    return violations


def check_priority_inversions(
    ctx: KernelContext,
    fest: dict[str, Any],
    placed: dict[str, tuple[str, str, int, int]],
    room_busy: dict[tuple[str, str, int], list[str]],
    wgrp: dict[tuple[str, str, int], set[str]],
) -> list[str]:
    """Detect priority inversions: a rejected request that could have taken a slot given to a lower priority request."""
    inversions: list[str] = []
    data = ctx.data
    dec_by = {d.get("request_id"): d for d in fest.get("bookings", [])}

    for req_id, req in ctx.req.items():
        d = dec_by.get(req_id)
        if req_id in ctx.cancelled or not d or d.get("status") != "rejected":
            continue
        for other_id, (rid, day, a, b) in placed.items():
            other = ctx.req[other_id]
            if dec_by[other_id].get("status") != "approved" or not outranks(data, req, other):
                continue
            room = ctx.rooms[rid]
            feats = set(room["features"]) | ({"accessible"} if room["accessible"] else set())
            if room["type"] not in req["room_types"] or room["capacity"] < req["attendance"] or set(req["needs"]) - feats:
                continue
            for w in req["windows"]:
                if w["day"] != day:
                    continue
                for s0 in range(w["from_period"], w["to_period"] - req["duration_periods"] + 2):
                    per = range(s0, s0 + req["duration_periods"])
                    if per[-1] > MAX_PERIOD or not any(a <= p <= b for p in per):
                        continue
                    clash = False
                    for p in per:
                        if (day, p) in ctx.room_un[rid]:
                            clash = True
                        if [x for x in room_busy[(rid, day, p)] if x != other_id]:
                            clash = True
                        for g in req["mandatory_for_groups"]:
                            if wgrp.get((g, day, p)):
                                clash = True
                    if not clash:
                        inversions.append(
                            f"{req_id} rejected, but {other_id} (lower priority) holds {rid} {day} P{a}-P{b} that {req_id} could use"
                        )
                        break
                else:
                    continue
                break
    return inversions


def check_bookings(
    ctx: KernelContext,
    base: dict[str, tuple[str, int, str]],
    fest: dict[str, Any],
) -> tuple[list[Violation], list[str], dict[str, Any]]:
    """Complete check_bookings mirroring validator.py exactly."""
    V: list[Violation] = []
    W: list[str] = []
    data = ctx.data
    overrides = fest.get("session_overrides", [])
    decisions = fest.get("bookings", [])

    # Check B1 for duplicate decisions
    dec_by: dict[str, dict[str, Any]] = {}
    for d in decisions:
        if d.get("request_id") in dec_by:
            V.append(Violation(rule="B1", where="fest_week", detail=f"Two decisions for {d['request_id']}"))
        dec_by[d.get("request_id")] = d

    # Check B2 and construct week-7 view
    b2_violations, week = check_booking_b2(ctx, base, fest)
    V += b2_violations

    # Validate week-7 timetable
    wv, wgrp = check_timetable(ctx, week, "fest_week")
    V += wv

    room_busy: dict[tuple[str, str, int], list[str]] = defaultdict(list)
    for sid, (day, start, rid) in week.items():
        s = ctx.sessions.get(sid)
        if s:
            for p in _block(start, s["duration"]):
                room_busy[(rid, day, p)].append(sid)

    score, max_score = 0.0, 0
    placed: dict[str, tuple[str, str, int, int]] = {}
    for rid_, req in ctx.req.items():
        if rid_ not in ctx.cancelled:
            max_score += CAT_WEIGHT[effective_category(data, req)]

    for req_id, req in ctx.req.items():
        d = dec_by.get(req_id)
        if d is None:
            W.append(f"No decision for {req_id}")
            continue
        st = d.get("status")
        if req_id in ctx.cancelled:
            if st in ("approved", "alternative_offered"):
                V.append(Violation(rule="B3", where="fest_week", detail=f"{req_id} was cancelled but is {st}"))
            continue
        if st not in ("approved", "rejected", "alternative_offered"):
            V.append(Violation(rule="B1", where="fest_week", detail=f"{req_id}: unknown status {st}"))
            continue
        if st in ("rejected", "alternative_offered") and not str(d.get("reason", "")).strip():
            W.append(f"{req_id}: {st} without a reason")
        if st == "rejected":
            continue

        h13_errs = check_booking_h13(ctx, req_id, req, d, room_busy, wgrp)
        if h13_errs:
            V += h13_errs
        else:
            day, a, b = d.get("day"), d.get("start_period"), d.get("end_period")
            rid = d.get("room_id")
            for p in range(a, b + 1):
                room_busy[(rid, day, p)].append(req_id)
            placed[req_id] = (rid, day, a, b)
            score += CAT_WEIGHT[effective_category(data, req)] * (1 if st == "approved" else 0.5)

    inversions = check_priority_inversions(ctx, fest, placed, room_busy, wgrp)

    stats = {
        "booking_score": score,
        "booking_score_max_if_all_approved": max_score,
        "approved": sum(1 for x in decisions if x.get("status") == "approved"),
        "alternatives": sum(1 for x in decisions if x.get("status") == "alternative_offered"),
        "rejected": sum(1 for x in decisions if x.get("status") == "rejected"),
        "session_overrides": len(overrides),
        "priority_inversions": inversions,
    }
    return V, W, stats


# ---------------------------------------------------------------- exam checks (E1, E2, H3, H4, H5, soft penalty)


def check_exam_e1(ctx: KernelContext, exams_out: list[dict[str, Any]]) -> list[Violation]:
    """E1: all exams scheduled once in valid slot, no unknown exam IDs."""
    violations: list[Violation] = []
    ex = {e["id"]: e for e in ctx.data.get("exams", [])}
    cal = ctx.data["calendar"]["exam_week"]
    sess_ids = {s["id"] for s in cal["sessions"]}
    seen: set[str] = set()

    for e in exams_out:
        eid = e.get("exam_id")
        if eid not in ex:
            violations.append(Violation(rule="E1", where="exams", detail=f"Unknown exam {eid}"))
            continue
        if eid in seen:
            violations.append(Violation(rule="E1", where="exams", detail=f"{eid} scheduled twice"))
        seen.add(eid)
        if e.get("day") not in cal["days"] or e.get("session") not in sess_ids:
            violations.append(Violation(rule="E1", where="exams", detail=f"{eid}: invalid slot"))

    for eid in ex:
        if eid not in seen:
            violations.append(Violation(rule="E1", where="exams", detail=f"{eid} not scheduled"))

    return violations


def check_exam_e2(ctx: KernelContext, exams_out: list[dict[str, Any]]) -> list[Violation]:
    """E2: exam room must have exam in allowed_uses."""
    violations: list[Violation] = []
    ex = {e["id"]: e for e in ctx.data.get("exams", [])}
    cal = ctx.data["calendar"]["exam_week"]
    sess_ids = {s["id"] for s in cal["sessions"]}
    seen: set[str] = set()
    for e in exams_out:
        eid = e.get("exam_id")
        if eid not in ex or eid in seen:
            continue
        seen.add(eid)
        if e.get("day") not in cal["days"] or e.get("session") not in sess_ids:
            continue
        for rid in e.get("rooms", []):
            r = ctx.rooms.get(rid)
            if r is None or "exam" not in r["allowed_uses"]:
                violations.append(Violation(rule="E2", where="exams", detail=f"{eid}: {rid} cannot host exams"))
    return violations


def check_exam_h5(ctx: KernelContext, exams_out: list[dict[str, Any]]) -> list[Violation]:
    """H5 (exams): total half-capacity seats (capacity // 2) must be >= exam size."""
    violations: list[Violation] = []
    ex = {e["id"]: e for e in ctx.data.get("exams", [])}
    cal = ctx.data["calendar"]["exam_week"]
    sess_ids = {s["id"] for s in cal["sessions"]}
    seen: set[str] = set()
    for e in exams_out:
        eid = e.get("exam_id")
        if eid not in ex or eid in seen:
            continue
        seen.add(eid)
        if e.get("day") not in cal["days"] or e.get("session") not in sess_ids:
            continue
        seats = 0
        for rid in e.get("rooms", []):
            r = ctx.rooms.get(rid)
            if r is not None and "exam" in r["allowed_uses"]:
                seats += r["capacity"] // 2
        if seats < ex[eid]["size"]:
            violations.append(
                Violation(
                    rule="H5",
                    where="exams",
                    detail=f"{eid}: {seats} seats at half capacity for {ex[eid]['size']} students",
                )
            )
    return violations


def check_exam_h4(ctx: KernelContext, exams_out: list[dict[str, Any]]) -> list[Violation]:
    """H4 (exams): no room double-booked in the same exam slot."""
    violations: list[Violation] = []
    ex = {e["id"]: e for e in ctx.data.get("exams", [])}
    cal = ctx.data["calendar"]["exam_week"]
    sess_ids = {s["id"] for s in cal["sessions"]}
    room_use: dict[tuple[str, str, str], list[str]] = defaultdict(list)
    seen: set[str] = set()
    for e in exams_out:
        eid = e.get("exam_id")
        if eid not in ex or eid in seen:
            continue
        seen.add(eid)
        if e.get("day") not in cal["days"] or e.get("session") not in sess_ids:
            continue
        day, sess = e.get("day"), e.get("session")
        for rid in e.get("rooms", []):
            r = ctx.rooms.get(rid)
            if r is not None and "exam" in r["allowed_uses"]:
                room_use[(rid, day, sess)].append(eid)
    for k, v in room_use.items():
        if len(v) > 1:
            violations.append(Violation(rule="H4", where="exams", detail=f"{k[0]} has {v} in {k[1]} {k[2]}"))
    return violations


def check_exam_h3(ctx: KernelContext, exams_out: list[dict[str, Any]]) -> list[Violation]:
    """H3 (exams): no student group has two exams in the same slot."""
    violations: list[Violation] = []
    ex = {e["id"]: e for e in ctx.data.get("exams", [])}
    cal = ctx.data["calendar"]["exam_week"]
    sess_ids = {s["id"] for s in cal["sessions"]}
    grp_use: dict[tuple[str, str, str], list[str]] = defaultdict(list)
    seen: set[str] = set()
    for e in exams_out:
        eid = e.get("exam_id")
        if eid not in ex or eid in seen:
            continue
        seen.add(eid)
        if e.get("day") not in cal["days"] or e.get("session") not in sess_ids:
            continue
        day, sess = e.get("day"), e.get("session")
        for g in ex[eid]["groups"]:
            grp_use[(g, day, sess)].append(eid)
    for k, v in grp_use.items():
        if len(v) > 1:
            violations.append(Violation(rule="H3", where="exams", detail=f"Group {k[0]} has {v} in {k[1]} {k[2]}"))
    return violations


def check_exam_soft(ctx: KernelContext, exams_out: list[dict[str, Any]]) -> int:
    """Soft penalty for exams: 5 pts per extra same-day exam for a student group."""
    pen = 0
    ex = {e["id"]: e for e in ctx.data.get("exams", [])}
    cal = ctx.data["calendar"]["exam_week"]
    sess_ids = {s["id"] for s in cal["sessions"]}
    grp_day: dict[tuple[str, str], set[str]] = defaultdict(set)
    seen: set[str] = set()
    for e in exams_out:
        eid = e.get("exam_id")
        if eid not in ex or eid in seen:
            continue
        seen.add(eid)
        if e.get("day") not in cal["days"] or e.get("session") not in sess_ids:
            continue
        day = e.get("day")
        for g in ex[eid]["groups"]:
            grp_day[(g, day)].add(eid)
    for k, v in grp_day.items():
        if len(v) > 1:
            pen += 5 * (len(v) - 1)
    return pen


def check_exams(ctx: KernelContext, exams_out: list[dict[str, Any]]) -> tuple[list[Violation], int]:
    """Complete check_exams mirroring validator.py exactly."""
    data = ctx.data
    V: list[Violation] = []
    pen = 0
    ex = {e["id"]: e for e in data.get("exams", [])}
    cal = data["calendar"]["exam_week"]
    sess_ids = {s["id"] for s in cal["sessions"]}
    room_use: dict[tuple[str, str, str], list[str]] = defaultdict(list)
    grp_use: dict[tuple[str, str, str], list[str]] = defaultdict(list)
    grp_day: dict[tuple[str, str], set[str]] = defaultdict(set)
    seen: set[str] = set()

    for e in exams_out:
        eid = e.get("exam_id")
        if eid not in ex:
            V.append(Violation(rule="E1", where="exams", detail=f"Unknown exam {eid}"))
            continue
        if eid in seen:
            V.append(Violation(rule="E1", where="exams", detail=f"{eid} scheduled twice"))
        seen.add(eid)
        if e.get("day") not in cal["days"] or e.get("session") not in sess_ids:
            V.append(Violation(rule="E1", where="exams", detail=f"{eid}: invalid slot"))
            continue
        seats = 0
        for rid in e.get("rooms", []):
            r = ctx.rooms.get(rid)
            if r is None or "exam" not in r["allowed_uses"]:
                V.append(Violation(rule="E2", where="exams", detail=f"{eid}: {rid} cannot host exams"))
                continue
            seats += r["capacity"] // 2
            room_use[(rid, e["day"], e["session"])].append(eid)
        if seats < ex[eid]["size"]:
            V.append(Violation(rule="H5", where="exams", detail=f"{eid}: {seats} seats at half capacity for {ex[eid]['size']} students"))
        for g in ex[eid]["groups"]:
            grp_use[(g, e["day"], e["session"])].append(eid)
            grp_day[(g, e["day"])].add(eid)

    for eid in ex:
        if eid not in seen:
            V.append(Violation(rule="E1", where="exams", detail=f"{eid} not scheduled"))
    for k, v in room_use.items():
        if len(v) > 1:
            V.append(Violation(rule="H4", where="exams", detail=f"{k[0]} has {v} in {k[1]} {k[2]}"))
    for k, v in grp_use.items():
        if len(v) > 1:
            V.append(Violation(rule="H3", where="exams", detail=f"Group {k[0]} has {v} in {k[1]} {k[2]}"))
    for k, v in grp_day.items():
        if len(v) > 1:
            pen += 5 * (len(v) - 1)

    return V, pen


# ---------------------------------------------------------------- full schedule validation


def to_assign(sched: dict[str, Any]) -> tuple[dict[str, tuple[str, int, str]], list[str]]:
    """Convert schedule sessions list to assignment dictionary and duplicate list."""
    out: dict[str, tuple[str, int, str]] = {}
    dup: list[str] = []
    for e in sched.get("sessions", []):
        sid = e.get("session_id")
        if sid in out:
            dup.append(sid)
        out[sid] = (e.get("day"), e.get("start_period"), e.get("room_id"))
    return out, dup


def validate_schedule(
    data: dict[str, Any],
    sched: dict[str, Any],
    baseline: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Top-level schedule validator producing identical output to validator.run."""
    ctx = KernelContext(data)
    report: dict[str, Any] = {
        "dataset_id": data.get("dataset_id"),
        "schedule_dataset_id": sched.get("dataset_id"),
        "team": sched.get("team"),
    }
    assign, dup = to_assign(sched)
    V, _ = check_timetable(ctx, assign, "timetable")
    for d in dup:
        V.append(Violation(rule="H1", where="timetable", detail=f"Session {d} appears more than once"))
    soft, total = soft_score(ctx, assign)
    report["soft_penalties"] = soft
    report["soft_total"] = total
    W: list[str] = []
    if "fest_week" in sched:
        bv, bw, bstats = check_bookings(ctx, assign, sched["fest_week"])
        V += bv
        W += bw
        report["bookings"] = bstats

    if data.get("exams") and (baseline is None or sched.get("exams")):
        ev, epen = check_exams(ctx, sched.get("exams") or [])
        V += ev
        report["exam_soft_penalty"] = epen

    if baseline is not None:
        b, _ = to_assign(baseline)
        moved = [sid for sid in assign if sid in b and sid in ctx.sessions and tuple(assign[sid]) != tuple(b[sid])]
        report["stability"] = {
            "sessions_moved": len(moved),
            "time_changed": sum(1 for s in moved if assign[s][:2] != b[s][:2]),
            "room_only_changed": sum(1 for s in moved if assign[s][:2] == b[s][:2]),
            "moved_ids": sorted(moved),
        }

    seen: set[tuple[str, str]] = set()
    uniq: list[Violation] = []
    for x in V:
        k = (x.rule, x.detail)
        if k not in seen:
            seen.add(k)
            uniq.append(x)
    V = uniq

    report["hard_violations"] = [{"rule": x.rule, "where": x.where, "detail": x.detail} for x in V]
    report["hard_violation_count"] = len(V)
    hard_by_rule: dict[str, int] = defaultdict(int)
    for x in V:
        hard_by_rule[x.rule] += 1
    report["hard_by_rule"] = dict(sorted(hard_by_rule.items()))
    report["warnings"] = W
    return report
