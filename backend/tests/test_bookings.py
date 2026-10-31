"""Tests for Milestone 5: Spectra week booking decision engine and validator parity."""

from __future__ import annotations

import json
from pathlib import Path

from app.bookings.engine import BookingEngine, effective_category, outranks


def test_effective_category_and_outranks(dataset):
    """Verify effective_category caps by role and outranks comparator matches priority order."""
    # Club requesting institute_event must be capped to club_event
    req_club_inst = {"role": "club", "requested_category": "institute_event", "submitted_at": "2027-01-20T10:00:00"}
    assert effective_category(dataset, req_club_inst) == "club_event"

    # Faculty requesting institute_event must be capped to guest_lecture
    req_fac_inst = {"role": "faculty", "requested_category": "institute_event", "submitted_at": "2027-01-20T10:00:00"}
    assert effective_category(dataset, req_fac_inst) == "guest_lecture"

    # Admin requesting institute_event stays institute_event
    req_admin_inst = {"role": "admin", "requested_category": "institute_event", "submitted_at": "2027-01-20T10:00:00"}
    assert effective_category(dataset, req_admin_inst) == "institute_event"

    # Priority comparison: institute_event outranks guest_lecture
    assert outranks(dataset, req_admin_inst, req_fac_inst)
    assert not outranks(dataset, req_fac_inst, req_admin_inst)

    # Tie-breaking by submitted_at
    req_admin_early = {"role": "admin", "requested_category": "institute_event", "submitted_at": "2027-01-19T10:00:00"}
    assert outranks(dataset, req_admin_early, req_admin_inst)


def test_booking_engine_decide_all(dataset, validator_module):
    """Test BookingEngine against all Milestone 5 requirements:
    - 0 hard violations from official validator (B1, B2, B3, H13).
    - 0 priority inversions.
    - Cancelled bookings must be rejected (no cancelled booking accepted).
    - Reason provided for every rejected and alternative decision.
    - Verified against official validator check_bookings.
    """
    # Load baseline schedule from scratch
    scratch_path = Path("backend/scratch/schedule_soft_3b.json")
    assert scratch_path.exists(), "scratch/schedule_soft_3b.json must exist from Milestone 3"
    with open(scratch_path, encoding="utf-8") as f:
        base_sched = json.load(f)

    engine = BookingEngine(dataset, base_sched)
    fest_week = engine.decide_all()

    # Structure checks
    assert "bookings" in fest_week
    assert "session_overrides" in fest_week
    decisions = fest_week["bookings"]
    assert len(decisions) == len(dataset.get("booking_requests", []))

    # Check reason is present for rejected or alternative
    for d in decisions:
        assert d["status"] in ("approved", "alternative_offered", "rejected")
        if d["status"] in ("rejected", "alternative_offered"):
            assert d.get("reason"), f"Decision {d['request_id']} has no reason"

    # Validate with official validator
    official_ctx = validator_module.Ctx(dataset)
    base_assign, _ = validator_module.to_assign(base_sched)
    hard_violations, warnings, bstats = validator_module.check_bookings(
        official_ctx,
        base_assign,
        fest_week,
    )

    # Exit conditions:
    # 1. 0 hard violations
    assert len(hard_violations) == 0, f"Validator found hard violations: {hard_violations}"

    # 2. 0 priority inversions
    assert len(bstats["priority_inversions"]) == 0, (
        f"Priority inversions found: {bstats['priority_inversions']}"
    )

    # 3. Cancelled bookings must be rejected
    for c in dataset.get("cancellations", []):
        c_id = c["request_id"]
        c_dec = next((d for d in decisions if d["request_id"] == c_id), None)
        assert c_dec is not None
        assert c_dec["status"] == "rejected", f"Cancelled booking {c_id} was {c_dec['status']}"

    # Verify score
    assert bstats["approved"] > 0
    assert bstats["booking_score"] > 0


def test_booking_find_alternative(dataset):
    """Test find_alternative helper returns legal slot."""
    scratch_path = Path("backend/scratch/schedule_soft_3b.json")
    with open(scratch_path, encoding="utf-8") as f:
        base_sched = json.load(f)

    engine = BookingEngine(dataset, base_sched)
    sample_req = dataset["booking_requests"][0]
    alt = engine.find_alternative(sample_req)

    assert alt is not None
    assert "room_id" in alt
    assert "day" in alt
    assert "start_period" in alt
    assert "end_period" in alt
    assert alt["end_period"] >= alt["start_period"]
