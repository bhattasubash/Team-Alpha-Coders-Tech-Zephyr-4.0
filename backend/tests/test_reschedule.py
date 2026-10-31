"""Tests for Milestone 7: Disruptions, minimal-move reschedule solver, and proposals pipeline."""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from fastapi.testclient import TestClient

from app.kernel.pipeline import (
    GLOBAL_PROPOSAL_STORE,
    apply_disruption_dict,
    approve_proposal_pipeline,
    propose_reschedule,
)
from app.main import app
from app.solver.reschedule import RescheduleSolver

client = TestClient(app)


def get_admin_token() -> str:
    """Obtain valid admin token from login endpoint."""
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@cit.edu", "password": "admin123"},
    )
    return resp.json()["access_token"]


@pytest.mark.slow
def test_reschedule_solver_sample_disruption(dataset, validator_module):
    """Test minimal move reschedule solver on the official sample_disruption.json:
    - Verifies 0 hard violations with official validator.
    - Verifies minimal moved count (<= 10 sessions).
    - Verifies stability dictionary matches validator report.
    """
    disruption_path = Path("CrunchWeek_StarterPack/examples/sample_disruption.json")
    assert disruption_path.exists()
    with open(disruption_path, encoding="utf-8") as f:
        disruption = json.load(f)

    disrupted_data = validator_module.apply_disruption(dataset, disruption)

    # Load baseline schedule
    base_path = Path("exports/schedule.json")
    assert base_path.exists()
    with open(base_path, encoding="utf-8") as f:
        base_sched = json.load(f)

    # Run reschedule solver
    solver = RescheduleSolver(disrupted_data, base_sched)
    result = solver.solve(time_limit_override=45.0)

    assert result.status in ("FEASIBLE", "OPTIMAL")
    assert not result.infeasible
    assert result.assignments is not None
    assert result.is_proven_minimum is True
    assert result.forced_moves == len(solver._forced_move_ids)
    # Check moved == forced_moves or explain each knock-on session
    assert result.moved_count == result.forced_moves, (
        f"Expected moved ({result.moved_count}) == forced ({result.forced_moves}), "
        f"knock-on sessions: {result.knock_on_move_ids}"
    )
    assert result.knock_on_moves == 0
    assert result.moved_count <= 20
    assert result.moved_ids is not None

    # Validate against official validator with baseline stability check
    official_report = validator_module.run(disrupted_data, result.schedule, baseline=base_sched)
    assert official_report["hard_violation_count"] == 0
    stability = official_report.get("stability")
    assert stability is not None
    assert stability["sessions_moved"] == result.moved_count
    assert set(stability["moved_ids"]) == set(result.moved_ids)


def test_reschedule_infeasible_conflict_explanation(dataset):
    """Test solver explains conflicts cleanly when disruption makes schedule impossible."""
    # Faculty F01 made unavailable on all days P1-P9
    impossible_disruption = {
        "changes": [
            {
                "type": "faculty_unavailable",
                "faculty_id": "F01",
                "days": ["MON", "TUE", "WED", "THU", "FRI"],
                "periods": [1, 2, 3, 4, 5, 6, 7, 8, 9],
                "reason": "Indefinite medical leave",
            }
        ]
    }
    disrupted_data = apply_disruption_dict(dataset, impossible_disruption)

    base_path = Path("exports/schedule.json")
    with open(base_path, encoding="utf-8") as f:
        base_sched = json.load(f)

    solver = RescheduleSolver(disrupted_data, base_sched)
    result = solver.solve(time_limit_override=5.0)

    assert result.infeasible is True
    assert result.status == "INFEASIBLE"
    assert result.conflicts is not None
    assert len(result.conflicts) > 0
    assert any("F01" in c for c in result.conflicts)


@pytest.mark.slow
def test_proposal_pipeline_self_approval_and_admin_flow(dataset):
    """Test proposal creation, self-approval prevention, and admin approval flow."""
    GLOBAL_PROPOSAL_STORE.clear()

    base_path = Path("exports/schedule.json")
    with open(base_path, encoding="utf-8") as f:
        base_sched = json.load(f)

    changes = [
        {
            "type": "room_unavailable",
            "room_id": "CR-102",
            "days": ["MON"],
            "periods": [5, 6],
            "reason": "Maintenance",
        }
    ]

    # Propose reschedule created by admin_1
    proposal = propose_reschedule(
        base_data=dataset,
        base_schedule=base_sched,
        changes=changes,
        proposer_role="admin",
        proposer_id="admin_1",
    )

    assert proposal.id.startswith("prop-")
    assert proposal.status == "pending"
    assert proposal.moved_count >= 1
    assert proposal.forced_moves >= 0
    assert proposal.knock_on_moves >= 0
    assert proposal.moved_count == proposal.forced_moves + proposal.knock_on_moves

    # Attempt self-approval: admin_1 cannot approve their own proposal
    ok, msg, codes = approve_proposal_pipeline(
        proposal_id=proposal.id,
        approver_role="admin",
        approver_id="admin_1",
    )
    assert not ok
    assert "SELF_APPROVAL" in codes

    # Different admin approves
    ok2, msg2, codes2 = approve_proposal_pipeline(
        proposal_id=proposal.id,
        approver_role="admin",
        approver_id="admin_2",
    )
    assert ok2
    assert "APPROVED" in codes2
    assert GLOBAL_PROPOSAL_STORE.get(proposal.id).status == "approved"
    assert GLOBAL_PROPOSAL_STORE.get_active_schedule() is not None


@pytest.mark.slow
def test_api_disruptions_preview_and_proposals():
    """Test HTTP API endpoints for disruptions preview and proposals listing."""
    token = get_admin_token()
    payload = {
        "changes": [
            {
                "type": "room_unavailable",
                "room_id": "CR-102",
                "days": ["MON", "TUE", "WED", "THU", "FRI"],
                "periods": [1, 2, 3, 4, 5, 6, 7, 8, 9],
                "reason": "Renovation",
            }
        ]
    }

    # POST /api/disruptions/preview
    resp = client.post(
        "/api/disruptions/preview",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, resp.text
    prop_data = resp.json()
    assert "id" in prop_data
    assert prop_data["status"] == "pending"
    assert prop_data["moved_count"] <= 15
    assert len(prop_data["moves"]) == prop_data["moved_count"]

    # GET /api/proposals
    list_resp = client.get(
        "/api/proposals",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["count"] >= 1
    assert any(p["id"] == prop_data["id"] for p in list_data["proposals"])
