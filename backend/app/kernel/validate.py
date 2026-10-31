"""Core validation logic mirroring the official validator check_timetable and soft_score exactly."""

from __future__ import annotations

from collections import defaultdict

from app.kernel.context import LAST_TEACHING, KernelContext
from app.kernel.types import Violation


def _block(start: int, duration: int) -> list[int]:
    """Return the list of periods occupied by a session."""
    return list(range(start, start + duration))


# ---------------------------------------------------------------- hard checks


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


# ---------------------------------------------------------------- combined check


def validate_timetable(
    ctx: KernelContext,
    assign: dict[str, tuple[str, int, str]],
    label: str = "timetable",
) -> list[Violation]:
    """Run all hard constraint checks, mirroring the official check_timetable exactly.

    The official validator does a single-pass loop with inline checks plus
    post-loop aggregation. We replicate the same logic in one pass to ensure
    identical violation output (order and detail strings).
    """
    violations: list[Violation] = []

    def v(rule: str, msg: str) -> None:
        violations.append(Violation(rule=rule, detail=msg, where=label))

    room_occ: dict[tuple[str, str, int], list[str]] = defaultdict(list)
    fac_occ: dict[tuple[str, str, int], list[str]] = defaultdict(list)
    grp_occ: dict[tuple[str, str, int], set[str]] = defaultdict(set)
    fac_day: dict[tuple[str, str], int] = defaultdict(int)
    basket_time: dict[str, set[tuple[str, int]]] = defaultdict(set)

    # Check unscheduled sessions
    for sid in ctx.sessions:
        if sid not in assign:
            v("H1", f"Session {sid} is not scheduled")

    # Main per-assignment loop, mirrors validator line by line
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

    # Post-loop aggregation checks
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

    return violations


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
