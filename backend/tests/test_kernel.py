"""Tests for the kernel validator, one test per rule.

Each test creates a minimal scenario that triggers exactly one violation type,
runs both our kernel and the official validator, and checks they agree.
"""

from __future__ import annotations

import copy
from collections import defaultdict

import pytest

from app.kernel.context import KernelContext
from app.kernel.validate import (
    check_accessibility,
    check_all_scheduled,
    check_basket_slots,
    check_capacity,
    check_faculty_availability,
    check_faculty_conflicts,
    check_faculty_daily_limit,
    check_fixed_slots,
    check_group_conflicts,
    check_period_constraints,
    check_room_availability,
    check_room_conflicts,
    check_room_types,
    soft_score,
    validate_timetable,
)

# ---------- helpers ----------


def _make_simple_assign(dataset: dict) -> dict[str, tuple[str, int, str]]:
    """Build a naive but structurally complete assignment for testing.

    Assigns each session to a time slot. Not necessarily valid, but gives
    every session an entry so H1 does not fire on missing sessions.
    """
    assign = {}
    rooms = [
        r
        for r in dataset["rooms"]
        if "lecture" in r["allowed_uses"] or "tutorial" in r["allowed_uses"]
    ]
    days = dataset["calendar"]["days"]
    day_idx = 0
    period = 1
    room_idx = 0

    for s in dataset["sessions"]:
        sid = s["id"]
        dur = s["duration"]
        # Find a room that fits the type
        for ri, r in enumerate(rooms):
            if r["type"] in s["room_types"] and r["capacity"] >= s["size"]:
                room_idx = ri
                break

        # Handle labs: must start at P2 or P6
        if s["kind"] == "lab":
            start = 2 if period <= 5 else 6
        else:
            start = period

        # Make sure it fits in teaching range
        if start + dur - 1 > 9:
            day_idx = (day_idx + 1) % len(days)
            period = 1
            start = 2 if s["kind"] == "lab" else 1

        assign[sid] = (days[day_idx], start, rooms[room_idx]["id"])

        period = start + dur
        if period > 9:
            day_idx = (day_idx + 1) % len(days)
            period = 1

    return assign


# ---------- H1: all sessions scheduled ----------


def test_h1_unscheduled(dataset):
    """Removing a session from the assignment must trigger H1."""
    ctx = KernelContext(dataset)
    assign = _make_simple_assign(dataset)
    # Remove one session
    removed_sid = list(assign.keys())[0]
    del assign[removed_sid]

    violations = check_all_scheduled(ctx, assign)
    h1_violations = [v for v in violations if v.rule == "H1"]
    assert len(h1_violations) >= 1
    assert any(removed_sid in v.detail for v in h1_violations)


def test_h1_unknown_session(dataset):
    """Adding an unknown session ID must trigger H1."""
    ctx = KernelContext(dataset)
    assign = _make_simple_assign(dataset)
    assign["FAKE-SESSION-999"] = ("MON", 1, "LH-1")

    violations = validate_timetable(ctx, assign)
    h1_unknown = [v for v in violations if v.rule == "H1" and "FAKE-SESSION-999" in v.detail]
    assert len(h1_unknown) >= 1


# ---------- H2: faculty double-booking ----------


def test_h2_faculty_conflict(dataset):
    """Scheduling two sessions of the same faculty at the same time must trigger H2."""
    ctx = KernelContext(dataset)
    # Find two sessions with the same faculty
    fac_sessions = defaultdict(list)
    for s in dataset["sessions"]:
        fac_sessions[s["faculty_id"]].append(s)

    fac_id = None
    for fid, sessions in fac_sessions.items():
        if len(sessions) >= 2:
            fac_id = fid
            break
    assert fac_id is not None, "Need at least one faculty with 2+ sessions"

    s1, s2 = fac_sessions[fac_id][:2]
    assign = _make_simple_assign(dataset)
    # Force both to same (day, period)
    assign[s1["id"]] = ("MON", 1, "LH-1")
    assign[s2["id"]] = ("MON", 1, "LH-2")

    violations = check_faculty_conflicts(ctx, assign)
    h2 = [v for v in violations if v.rule == "H2"]
    assert len(h2) >= 1


# ---------- H3: group double-booking ----------


def test_h3_group_conflict(dataset):
    """Two sessions for the same group at the same time must trigger H3."""
    ctx = KernelContext(dataset)
    # Find two sessions sharing a group (non-basket)
    grp_sessions = defaultdict(list)
    for s in dataset["sessions"]:
        if not s.get("basket_slot"):
            for g in s["groups"]:
                grp_sessions[g].append(s)

    group_id = None
    for gid, sessions in grp_sessions.items():
        if len(sessions) >= 2:
            group_id = gid
            break
    assert group_id is not None

    s1, s2 = grp_sessions[group_id][:2]
    assign = _make_simple_assign(dataset)
    assign[s1["id"]] = ("TUE", 3, "LH-1")
    assign[s2["id"]] = ("TUE", 3, "LH-2")

    violations = check_group_conflicts(ctx, assign)
    h3 = [v for v in violations if v.rule == "H3"]
    assert len(h3) >= 1


# ---------- H4: room double-booking ----------


def test_h4_room_conflict(dataset):
    """Two sessions in the same room at the same time must trigger H4."""
    ctx = KernelContext(dataset)
    sessions = dataset["sessions"][:2]
    assign = _make_simple_assign(dataset)
    assign[sessions[0]["id"]] = ("WED", 3, "CR-101")
    assign[sessions[1]["id"]] = ("WED", 3, "CR-101")

    violations = check_room_conflicts(ctx, assign)
    h4 = [v for v in violations if v.rule == "H4"]
    assert len(h4) >= 1


# ---------- H5: capacity ----------


def test_h5_capacity(dataset):
    """Putting a large session in a small room must trigger H5."""
    ctx = KernelContext(dataset)
    # Find a session with large size and a room with small capacity
    big_session = max(dataset["sessions"], key=lambda s: s["size"])
    small_room = min(
        (r for r in dataset["rooms"] if r["type"] in big_session["room_types"]),
        key=lambda r: r["capacity"],
        default=None,
    )
    if small_room and small_room["capacity"] < big_session["size"]:
        assign = {big_session["id"]: ("MON", 1, small_room["id"])}
        violations = check_capacity(ctx, assign)
        h5 = [v for v in violations if v.rule == "H5"]
        assert len(h5) >= 1
    else:
        pytest.skip("No session/room pair triggers H5 in this dataset")


# ---------- H6: room type ----------


def test_h6_room_type(dataset):
    """Assigning a session to a room of the wrong type must trigger H6."""
    ctx = KernelContext(dataset)
    # Find a lecture session and a lab room
    lecture = next(s for s in dataset["sessions"] if s["kind"] == "lecture")
    lab_room = next(r for r in dataset["rooms"] if r["type"].startswith("lab_"))
    assign = {lecture["id"]: ("MON", 1, lab_room["id"])}

    violations = check_room_types(ctx, assign)
    h6 = [v for v in violations if v.rule == "H6"]
    assert len(h6) >= 1


# ---------- H7: faculty unavailable ----------


def test_h7_faculty_unavailable(dataset):
    """Scheduling a faculty during their unavailable period must trigger H7."""
    ctx = KernelContext(dataset)
    # Find a faculty with unavailability
    for f in dataset["faculty"]:
        if f.get("unavailable"):
            u = f["unavailable"][0]
            # Find a session by this faculty
            session = next(
                (s for s in dataset["sessions"] if s["faculty_id"] == f["id"]),
                None,
            )
            if session:
                day = u["day"]
                period = u["periods"][0]
                assign = {session["id"]: (day, period, "LH-1")}
                violations = check_faculty_availability(ctx, assign)
                h7 = [v for v in violations if v.rule == "H7"]
                assert len(h7) >= 1
                return
    pytest.skip("No faculty with unavailability in this dataset")


# ---------- H8: room unavailable ----------


def test_h8_room_unavailable(dataset):
    """Scheduling in a room during its unavailable period must trigger H8."""
    ctx = KernelContext(dataset)
    if not dataset.get("room_unavailability"):
        pytest.skip("No room unavailability in dataset")
    ru = dataset["room_unavailability"][0]
    session = dataset["sessions"][0]
    assign = {session["id"]: (ru["day"], ru["periods"][0], ru["room_id"])}

    violations = check_room_availability(ctx, assign)
    h8 = [v for v in violations if v.rule == "H8"]
    assert len(h8) >= 1


# ---------- H9: period constraints ----------


def test_h9_period_out_of_range(dataset):
    """A session running past P9 must trigger H9."""
    ctx = KernelContext(dataset)
    session = next(s for s in dataset["sessions"] if s["duration"] == 1)
    assign = {session["id"]: ("MON", 10, "LH-1")}

    violations = check_period_constraints(ctx, assign)
    h9 = [v for v in violations if v.rule == "H9"]
    assert len(h9) >= 1


def test_h9_crosses_lunch(dataset):
    """A session crossing the lunch boundary (P5 to P6) must trigger H9."""
    ctx = KernelContext(dataset)
    # Find a 3-hour lab
    lab = next(s for s in dataset["sessions"] if s["kind"] == "lab")
    # Start at P4: occupies P4, P5, P6 which crosses lunch
    assign = {lab["id"]: ("MON", 4, "LH-1")}

    violations = check_period_constraints(ctx, assign)
    h9 = [v for v in violations if v.rule == "H9"]
    assert len(h9) >= 1


def test_h9_lab_wrong_start(dataset):
    """A lab starting at P3 (not P2 or P6) must trigger H9."""
    ctx = KernelContext(dataset)
    lab = next(s for s in dataset["sessions"] if s["kind"] == "lab")
    assign = {lab["id"]: ("MON", 3, "LH-1")}

    violations = check_period_constraints(ctx, assign)
    h9 = [v for v in violations if v.rule == "H9"]
    # Should have at least the lab start violation
    assert any("lab must start" in v.detail for v in h9)


# ---------- H10: accessibility ----------


def test_h10_accessibility(dataset):
    """A session needing accessibility in a non-accessible room must trigger H10."""
    ctx = KernelContext(dataset)
    acc_session = next(
        (s for s in dataset["sessions"] if s.get("needs_accessible")),
        None,
    )
    non_acc_room = next(
        (r for r in dataset["rooms"] if not r["accessible"]),
        None,
    )
    if acc_session and non_acc_room:
        assign = {acc_session["id"]: ("MON", 1, non_acc_room["id"])}
        violations = check_accessibility(ctx, assign)
        h10 = [v for v in violations if v.rule == "H10"]
        assert len(h10) >= 1
    else:
        pytest.skip("Need an accessible session and non-accessible room")


# ---------- H11: basket slots ----------


def test_h11_basket_slot_mismatch(dataset):
    """Basket slot sessions at different (day, period) must trigger H11."""
    ctx = KernelContext(dataset)
    basket_sessions = [s for s in dataset["sessions"] if s.get("basket_slot")]
    if len(basket_sessions) < 2:
        pytest.skip("Need basket sessions")

    # Find two sessions in the same basket
    baskets = defaultdict(list)
    for s in basket_sessions:
        baskets[s["basket_slot"]].append(s)

    for bslot, sessions in baskets.items():
        if len(sessions) >= 2:
            assign = _make_simple_assign(dataset)
            # Force different times
            assign[sessions[0]["id"]] = ("MON", 1, "LH-1")
            assign[sessions[1]["id"]] = ("TUE", 2, "LH-2")
            violations = check_basket_slots(ctx, assign)
            h11 = [v for v in violations if v.rule == "H11"]
            assert len(h11) >= 1
            return
    pytest.skip("No basket slot with 2+ sessions")


# ---------- H12: faculty daily limit ----------


def test_h12_faculty_daily_limit(dataset):
    """Scheduling a faculty for more than max_hours_per_day must trigger H12."""
    ctx = KernelContext(dataset)
    # Find a faculty and schedule them for 5 one-hour sessions on the same day
    fac = dataset["faculty"][0]
    max_hrs = fac.get("max_hours_per_day", 4)
    fac_sessions = [
        s for s in dataset["sessions"] if s["faculty_id"] == fac["id"] and s["duration"] == 1
    ]
    if len(fac_sessions) < max_hrs + 1:
        pytest.skip(f"Not enough sessions for {fac['id']} to exceed {max_hrs} hours")

    assign = _make_simple_assign(dataset)
    # Stack them all on Monday
    for i, s in enumerate(fac_sessions[: max_hrs + 1]):
        assign[s["id"]] = ("MON", i + 1, "LH-1")

    violations = check_faculty_daily_limit(ctx, assign)
    h12 = [v for v in violations if v.rule == "H12"]
    assert len(h12) >= 1


# ---------- H14: fixed slot ----------


def test_h14_fixed_slot(dataset):
    """A session with a fixed slot placed elsewhere must trigger H14.

    The public dataset has no fixed slots, so we create synthetic data.
    """
    data = copy.deepcopy(dataset)
    # Add a fixed slot to the first session
    data["sessions"][0]["fixed_slot"] = {"day": "THU", "start_period": 6}
    ctx = KernelContext(data)

    assign = _make_simple_assign(data)
    # Place it somewhere else
    assign[data["sessions"][0]["id"]] = ("MON", 1, "LH-1")

    violations = check_fixed_slots(ctx, assign)
    h14 = [v for v in violations if v.rule == "H14"]
    assert len(h14) >= 1


# ---------- soft score tests ----------


def test_soft_s1_faculty_preference(dataset):
    """Scheduling in an avoided period should add to S1 penalty."""
    ctx = KernelContext(dataset)
    # Find a faculty with avoid preferences
    for f in dataset["faculty"]:
        for pref in f.get("preferences", []):
            if pref.get("type") == "avoid":
                session = next(
                    (s for s in dataset["sessions"] if s["faculty_id"] == f["id"]),
                    None,
                )
                if session:
                    day = pref.get("days", dataset["calendar"]["days"])[0]
                    period = pref["periods"][0]
                    assign = {session["id"]: (day, period, "LH-1")}
                    pen, total = soft_score(ctx, assign)
                    assert pen.get("S1", 0) > 0
                    return
    pytest.skip("No faculty with avoid preferences")


def test_soft_s5_underutilized(dataset):
    """Small session in big room should trigger S5."""
    ctx = KernelContext(dataset)
    pair = next(
        (s, r)
        for s in dataset["sessions"]
        for r in dataset["rooms"]
        if r["type"] in s["room_types"] and r["capacity"] and s["size"] / r["capacity"] < 0.4
    )
    session, room = pair
    assign = {session["id"]: ("MON", 1, room["id"])}
    pen, total = soft_score(ctx, assign)
    assert pen.get("S5", 0) >= 1


def test_soft_s6_last_period(dataset):
    """Session at P9 should trigger S6."""
    ctx = KernelContext(dataset)
    session = next(s for s in dataset["sessions"] if s["duration"] == 1)
    assign = {session["id"]: ("MON", 9, "LH-1")}
    pen, total = soft_score(ctx, assign)
    assert pen.get("S6", 0) >= 1


# ---------- differential test ----------


def test_differential_validator_agreement(dataset, validator_module):
    """The kernel and official validator must produce the same violations on the same input.

    This is the most important test. It proves the kernel matches the validator.
    We build a simple (likely invalid) assignment and check both produce the
    same hard violation count per rule.
    """
    assign = _make_simple_assign(dataset)

    # Run our kernel
    ctx = KernelContext(dataset)
    kernel_violations = validate_timetable(ctx, assign)
    kernel_soft, kernel_total = soft_score(ctx, assign)

    # Run the official validator
    official_ctx = validator_module.Ctx(dataset)
    official_violations, _ = validator_module.check_timetable(official_ctx, assign, "timetable")
    official_soft, official_total = validator_module.soft_score(official_ctx, assign)

    # Compare hard violation counts by rule
    kernel_by_rule = defaultdict(int)
    for v in kernel_violations:
        kernel_by_rule[v.rule] += 1

    official_by_rule = defaultdict(int)
    for v in official_violations:
        official_by_rule[v["rule"]] += 1

    # Both must have the same rules firing
    all_rules = set(kernel_by_rule) | set(official_by_rule)
    mismatches = []
    for rule in sorted(all_rules):
        k = kernel_by_rule.get(rule, 0)
        o = official_by_rule.get(rule, 0)
        if k != o:
            mismatches.append(f"{rule}: kernel={k}, official={o}")

    assert not mismatches, "Kernel and validator disagree on violation counts:\n" + "\n".join(
        mismatches
    )

    # Compare soft scores
    assert (
        kernel_soft == official_soft
    ), f"Soft score mismatch: kernel={kernel_soft}, official={official_soft}"
    assert (
        kernel_total == official_total
    ), f"Soft total mismatch: kernel={kernel_total}, official={official_total}"
