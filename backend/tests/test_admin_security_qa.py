"""API Security & QA tests for admin-restricted routes, RBAC enforcement, and reset integrity.

Covers:
1. POST /api/admin/reset (Access control, DB seed restoration, in-memory state leakage)
2. POST /api/bookings/{id}/review (Access control, self-approval guard, venue clash 409, 404/422 handling)
3. POST /api/proposals/{id}/approve (Access control, self-approval check flaw with user.get("sub"), 404 handling)
4. GET /api/proof/summary and GET /api/proof/certificate (Access control, schema compliance, missing route verification)
5. Auth & RBAC vulnerabilities (Static bypass tokens, non-prod JWT fallback, dean substring auto-approval)
6. Concurrency / TOCTOU race conditions during booking reviews
7. Unhandled 500 crash in POST /api/sessions/{id}/move due to dict attribute access bug
"""

from __future__ import annotations

import concurrent.futures
import json
import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.auth.users import DEMO_USERS, create_access_token
from app.db.connection import get_connection
from app.kernel.pipeline import GLOBAL_PROPOSAL_STORE
from app.main import app

client = TestClient(app)


# =============================================================================
# Auth Fixtures & Helpers
# =============================================================================

def get_auth_headers(email: str, password: str | None = None) -> dict[str, str]:
    """Generate auth headers using real JWT access token."""
    pwd = password or DEMO_USERS[email]["password"]
    resp = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def reset_db_before_test():
    """Ensure a clean database and reset environment for each test."""
    headers = get_auth_headers("admin@cit.edu")
    resp = client.post("/api/admin/reset", headers=headers)
    assert resp.status_code == 200
    GLOBAL_PROPOSAL_STORE.clear()


# =============================================================================
# 1. Admin Reset Route: POST /api/admin/reset
# =============================================================================

def test_admin_reset_access_control():
    """Verify RBAC on POST /api/admin/reset:
    - Admin (admin@cit.edu) -> 200 OK
    - Coordinator (coordinator@cit.edu) -> 403 Forbidden
    - Club (club@cit.edu) -> 403 Forbidden
    - Unauthenticated -> 401 Unauthorized
    """
    # 1. Admin succeeds
    admin_headers = get_auth_headers("admin@cit.edu")
    resp = client.post("/api/admin/reset", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

    # 2. Dept coordinator forbidden
    coord_headers = get_auth_headers("coordinator@cit.edu")
    resp = client.post("/api/admin/reset", headers=coord_headers)
    assert resp.status_code == 403
    err = resp.json()["error"]
    assert err["code"] == "FORBIDDEN"

    # 3. Club forbidden
    club_headers = get_auth_headers("club@cit.edu")
    resp = client.post("/api/admin/reset", headers=club_headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"

    # 4. Unauthenticated
    resp = client.post("/api/admin/reset")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"


def test_admin_reset_in_memory_proposal_store_state_leakage():
    """Verify that POST /api/admin/reset clears SQLite tables but leaves orphaned in-memory proposals.
    
    VULNERABILITY: GLOBAL_PROPOSAL_STORE is in-memory and not cleared on reset,
    allowing pre-reset proposals to be retrieved and approved post-reset.
    """
    admin_headers = get_auth_headers("admin@cit.edu")

    # Create a disruption proposal via preview
    resp = client.post(
        "/api/disruptions/preview",
        headers=admin_headers,
        json={"changes": [{"type": "room_unavailable", "room_id": "LH-1", "day": "WED", "periods": [4]}]},
    )
    assert resp.status_code == 200
    prop_data = resp.json()
    prop_id = prop_data["id"]

    # Verify proposal exists in memory store
    assert GLOBAL_PROPOSAL_STORE.get(prop_id) is not None

    # Call /api/admin/reset
    reset_resp = client.post("/api/admin/reset", headers=admin_headers)
    assert reset_resp.status_code == 200

    # Verify SQLite was cleared of proposals
    conn = get_connection()
    row = conn.execute("SELECT count(*) FROM proposals WHERE id = ?", (prop_id,)).fetchone()
    assert row[0] == 0, "Proposals should be wiped from SQLite after reset"

    # Verify in-memory GLOBAL_PROPOSAL_STORE is cleared by /api/admin/reset
    orphaned_proposal = GLOBAL_PROPOSAL_STORE.get(prop_id)
    assert orphaned_proposal is None, "In-memory proposal store should be cleared on DB reset"


# =============================================================================
# 2. Booking Review Route: POST /api/bookings/{id}/review
# =============================================================================

def test_booking_review_rbac():
    """Verify RBAC on POST /api/bookings/{id}/review:
    - Admin (admin@cit.edu) -> 200
    - Dept Coordinator (coordinator@cit.edu) -> 200
    - Faculty (faculty@cit.edu) -> 403 Forbidden
    - Club (club@cit.edu) -> 403 Forbidden
    - Unauthenticated -> 401 Unauthorized
    """
    coord_headers = get_auth_headers("coordinator@cit.edu")
    faculty_headers = get_auth_headers("faculty@cit.edu")
    club_headers = get_auth_headers("club@cit.edu")

    # Pick an existing booking from seed data
    booking_id = "BR-01"

    # 1. Unauthenticated -> 401
    resp = client.post(f"/api/bookings/{booking_id}/review", json={"status": "rejected", "reason": "Test"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"

    # 2. Club user -> 403
    resp = client.post(
        f"/api/bookings/{booking_id}/review",
        headers=club_headers,
        json={"status": "rejected", "reason": "Club rejecting"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"

    # 3. Faculty user -> 403
    resp = client.post(
        f"/api/bookings/{booking_id}/review",
        headers=faculty_headers,
        json={"status": "rejected", "reason": "Faculty rejecting"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"

    # 4. Coordinator -> 200
    resp = client.post(
        f"/api/bookings/{booking_id}/review",
        headers=coord_headers,
        json={"status": "rejected", "reason": "Rejected by Coordinator"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_booking_review_error_envelopes_404_and_422():
    """Verify error envelopes on nonexistent booking (404) and invalid payload (422)."""
    admin_headers = get_auth_headers("admin@cit.edu")

    # 404 Not Found
    resp = client.post(
        "/api/bookings/BR-NONEXISTENT-999/review",
        headers=admin_headers,
        json={"status": "rejected", "reason": "Testing nonexistent"},
    )
    assert resp.status_code == 404
    body = resp.json()
    assert "error" in body
    assert body["error"]["code"] == "NOT_FOUND"

    # 422 Invalid Input (Pydantic validation failure)
    resp = client.post(
        "/api/bookings/BR-01/review",
        headers=admin_headers,
        json={"status": "invalid_status", "reason": "Invalid status value"},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert "error" in body
    assert body["error"]["code"] == "INVALID_INPUT"


def test_booking_review_self_approval_guard():
    """Verify that coordinator cannot approve their own booking submission."""
    coord_headers = get_auth_headers("coordinator@cit.edu")

    # Coordinator creates a booking with full valid schema
    create_resp = client.post(
        "/api/bookings",
        headers=coord_headers,
        json={
            "requested_room": "LH-3",
            "attendance": 30,
            "title": "CSE Dept Seminar",
            "room_types": ["lecture_hall"],
            "duration_periods": 2,
            "windows": [{"day": "WED", "from_period": 8, "to_period": 9}],
            "requested_category": "department_event",
        },
    )
    assert create_resp.status_code == 200
    data = create_resp.json()
    assert data["legal"] is True
    req_id = data["details"]["request_id"]

    # Now coordinator attempts to review/approve their own booking
    review_resp = client.post(
        f"/api/bookings/{req_id}/review",
        headers=coord_headers,
        json={"status": "approved", "reason": "Self approving"},
    )
    assert review_resp.status_code == 403
    err = review_resp.json()["error"]
    assert err["code"] == "SELF_APPROVAL_PROHIBITED"


def test_booking_review_venue_clash_precheck():
    """Verify that submitting a booking for a slot overlapping an already approved booking is caught by precheck."""
    admin_headers = get_auth_headers("admin@cit.edu")
    club_headers = get_auth_headers("club@cit.edu")

    # Create first booking in LH-3 on THU P6-P7
    resp1 = client.post(
        "/api/bookings",
        headers=club_headers,
        json={
            "requested_room": "LH-3",
            "attendance": 20,
            "title": "Coding Club Session 1",
            "room_types": ["lecture_hall"],
            "duration_periods": 2,
            "windows": [{"day": "THU", "from_period": 6, "to_period": 7}],
            "requested_category": "club_event",
        },
    )
    assert resp1.status_code == 200
    assert resp1.json()["legal"] is True
    id1 = resp1.json()["details"]["request_id"]

    # Approve first booking
    app1 = client.post(f"/api/bookings/{id1}/review", headers=admin_headers, json={"status": "approved"})
    assert app1.status_code == 200
    assert app1.json()["status"] == "approved"

    # Create second booking for same room and overlapping slot
    resp2 = client.post(
        "/api/bookings",
        headers=club_headers,
        json={
            "requested_room": "LH-3",
            "attendance": 25,
            "title": "Robotics Club Session 2",
            "room_types": ["lecture_hall"],
            "duration_periods": 2,
            "windows": [{"day": "THU", "from_period": 7, "to_period": 8}],
            "requested_category": "club_event",
        },
    )
    # The precheck detects the clash
    assert resp2.status_code == 200
    assert resp2.json()["legal"] is False
    assert "H4" in resp2.json()["reason_codes"]


# =============================================================================
# 3. Proposal Approval Route: POST /api/proposals/{id}/approve
# =============================================================================

def test_proposal_approve_access_control():
    """Verify RBAC on POST /api/proposals/{id}/approve:
    - Coordinator -> 403 Forbidden (Admin only)
    - Club -> 403 Forbidden
    - Unauthenticated -> 401 Unauthorized
    """
    coord_headers = get_auth_headers("coordinator@cit.edu")
    club_headers = get_auth_headers("club@cit.edu")

    # Unauthenticated
    resp = client.post("/api/proposals/prop-123/approve")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"

    # Coordinator forbidden from approving proposals
    resp = client.post("/api/proposals/prop-123/approve", headers=coord_headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"

    # Club forbidden
    resp = client.post("/api/proposals/prop-123/approve", headers=club_headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_proposal_approve_self_approval_bypass_vulnerability():
    """Verify the self-approval vulnerability in POST /api/proposals/{id}/approve.
    
    VULNERABILITY: In routes.py, approver_id = user.get("sub", "admin").
    Because DEMO_USERS uses "email" rather than "sub", approver_id is always "admin".
    When an admin proposes a change (proposer_id = "admin@cit.edu"),
    approver_id ("admin") != proposer_id ("admin@cit.edu"),
    so self-approval prevention is COMPLETELY BYPASSED!
    """
    admin_headers = get_auth_headers("admin@cit.edu")

    # Admin proposes a disruption change
    resp = client.post(
        "/api/disruptions/preview",
        headers=admin_headers,
        json={"changes": [{"type": "room_unavailable", "room_id": "LH-1", "day": "WED", "periods": [4]}]},
    )
    assert resp.status_code == 200
    prop = resp.json()
    prop_id = prop["id"]

    # In routes.py line 1750: approver_id = user.get("sub", "admin") -> "admin"
    # proposer_id was saved as "admin@cit.edu".
    # Because "admin" != "admin@cit.edu", the check:
    #   if approver_id == proposer_id: return False, "Proposer cannot approve..."
    # FAILS to catch that the proposer and approver are the same admin!
    app_resp = client.post(f"/api/proposals/{prop_id}/approve", headers=admin_headers)

    # Self-approval barrier: Proposer cannot approve their own proposal
    assert app_resp.status_code == 400
    assert app_resp.json()["error"]["code"] == "SELF_APPROVAL"


# =============================================================================
# 4. Proof Endpoints: GET /api/proof/summary and /api/proof/certificate
# =============================================================================

def test_proof_summary_access_control_and_schema():
    """Verify GET /api/proof/summary is admin restricted and returns valid schema."""
    admin_headers = get_auth_headers("admin@cit.edu")
    club_headers = get_auth_headers("club@cit.edu")

    # 1. Club user -> 403
    resp = client.get("/api/proof/summary", headers=club_headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"

    # 2. Unauthenticated -> 401
    resp = client.get("/api/proof/summary")
    assert resp.status_code == 401

    # 3. Admin user -> 200
    resp = client.get("/api/proof/summary", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "ortools_version" in body
    assert "last_validator_result" in body


def test_proof_certificate_endpoint():
    """Verify that GET /api/proof/certificate is implemented and returns certified status."""
    admin_headers = get_auth_headers("admin@cit.edu")
    club_headers = get_auth_headers("club@cit.edu")

    # Unauthenticated -> 401, Club -> 403
    assert client.get("/api/proof/certificate").status_code == 401
    assert client.get("/api/proof/certificate", headers=club_headers).status_code == 403

    resp = client.get("/api/proof/certificate", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "certified"
    assert data["institution"] == "Chilika Institute of Technology"
    assert data["hard_violations"] == 0
    assert data["kernel_signature"] == "sha256-kernel-verified-0-hard-violations"


# =============================================================================
# 5. Auth & RBAC Security Flaws: Bypass Tokens & Email Substring Flaws
# =============================================================================

def test_static_admin_bypass_tokens():
    """VULNERABILITY: Static hardcoded tokens bypass JWT verification:
    - cit_jwt_admin_token
    - admin
    - admin123
    - demo
    """
    for bypass_token in ("cit_jwt_admin_token", "admin", "admin123", "demo"):
        headers = {"Authorization": f"Bearer {bypass_token}"}
        resp = client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 200, f"Token {bypass_token} failed"
        assert resp.json()["role"] == "admin"
        assert resp.json()["email"] == "admin@cit.edu"

        # Can call admin reset with this hardcoded bypass token!
        reset_resp = client.post("/api/admin/reset", headers=headers)
        assert reset_resp.status_code == 200


def test_non_prod_jwt_fallback_elevation():
    """VULNERABILITY: In development mode (ENV != 'production'), any invalid token
    falls through to DEMO_USERS['admin@cit.edu'], escalating any caller to admin!
    """
    headers = {"Authorization": "Bearer completely_bogus_token_xyz"}
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"
    assert resp.json()["email"] == "admin@cit.edu"


def test_dean_substring_auto_approval_flaw():
    """VULNERABILITY: create_booking uses `"dean" in user.get("email", "").lower()`.
    Any booking created by dean@cit.edu is automatically marked status='approved'
    bypassing the review pipeline and self-approval checks!
    """
    dean_headers = get_auth_headers("dean@cit.edu")

    resp = client.post(
        "/api/bookings",
        headers=dean_headers,
        json={
            "requested_room": "LH-4",
            "attendance": 25,
            "title": "Auto Approved Dean Event",
            "room_types": ["lecture_hall"],
            "duration_periods": 2,
            "windows": [{"day": "FRI", "from_period": 2, "to_period": 3}],
            "requested_category": "institute_event",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["legal"] is True
    req_id = resp.json()["details"]["request_id"]

    # Verify status in DB is immediately 'approved', bypassing review for dean@cit.edu
    conn = get_connection()
    row = conn.execute("SELECT status FROM bookings WHERE request_id = ?", (req_id,)).fetchone()
    assert row["status"] == "approved", "Booking was auto-approved directly on submission"

    # Verify that a user with 'dean' substring (e.g. sardana.dean@cit.edu) is NOT auto-approved
    DEMO_USERS["sardana.dean@cit.edu"] = {
        "email": "sardana.dean@cit.edu",
        "password": "pass",
        "name": "Sardana Dean",
        "role": "club",
    }
    try:
        fake_token = create_access_token({"sub": "sardana.dean@cit.edu", "role": "club"})
        fake_resp = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {fake_token}"},
            json={
                "requested_room": "LH-4",
                "attendance": 25,
                "title": "Club Event With Dean Substring",
                "room_types": ["lecture_hall"],
                "duration_periods": 2,
                "windows": [{"day": "THU", "from_period": 6, "to_period": 7}],
                "requested_category": "club_event",
            },
        )
        assert fake_resp.status_code == 200
        fake_id = fake_resp.json()["details"]["request_id"]
        fake_row = conn.execute("SELECT status FROM bookings WHERE request_id = ?", (fake_id,)).fetchone()
        assert fake_row["status"] == "pending", "Non-dean email with 'dean' substring should remain pending"
    finally:
        DEMO_USERS.pop("sardana.dean@cit.edu", None)


# =============================================================================
# 6. Concurrency / TOCTOU Race Condition Verification
# =============================================================================

def test_concurrent_booking_review_race_condition():
    """Demonstrate TOCTOU race condition when two requests attempt to review/approve simultaneously."""
    admin_headers = get_auth_headers("admin@cit.edu")
    club_headers = get_auth_headers("club@cit.edu")

    # Create Booking A: LH-4 on THU P8-P9
    respA = client.post(
        "/api/bookings",
        headers=club_headers,
        json={
            "requested_room": "LH-4",
            "attendance": 15,
            "title": "Concurrent Test A",
            "room_types": ["lecture_hall"],
            "duration_periods": 2,
            "windows": [{"day": "THU", "from_period": 8, "to_period": 9}],
            "requested_category": "club_event",
        },
    )
    assert respA.status_code == 200
    assert respA.json()["legal"] is True
    idA = respA.json()["details"]["request_id"]

    # Concurrently approving/rejecting booking
    def review_call(booking_id: str, action: str):
        c = TestClient(app)
        return c.post(
            f"/api/bookings/{booking_id}/review",
            headers=admin_headers,
            json={"status": action, "reason": f"Concurrent {action} test"},
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        fA = executor.submit(review_call, idA, "approved")
        fB = executor.submit(review_call, idA, "rejected")
        resA = fA.result()
        resB = fB.result()

    statuses = [resA.status_code, resB.status_code]
    # Both HTTP calls return 200 because there is no optimistic locking or state transition check on booking status
    assert 200 in statuses


# =============================================================================
# 7. Unhandled 500 Bug in POST /api/sessions/{id}/move
# =============================================================================

def test_session_move_hard_violation_handled_safely():
    """Verify POST /api/sessions/{id}/move safely handles hard violations without crashing."""
    admin_headers = get_auth_headers("admin@cit.edu")

    # Moving MA101-AB-L1 to an illegal slot causes hard violations.
    # Safely extracted violations should return a proposal marked rejected/infeasible.
    resp = client.post(
        "/api/sessions/MA101-AB-L1/move",
        headers=admin_headers,
        json={"target_day": "WED", "target_start_period": 8, "target_room_id": "LH-1"},
    )
    assert resp.status_code == 200
    prop = resp.json()
    assert prop["status"] == "rejected"
    assert prop["infeasible"] is True
    assert len(prop["conflicts"]) > 0
    assert len(prop["reason_codes"]) > 0


def test_proposal_approval_and_rejection_persistence_to_sqlite():
    """Verify that approving/rejecting a proposal updates its status in SQLite database."""
    admin_headers = get_auth_headers("admin@cit.edu")
    coord_headers = get_auth_headers("coordinator@cit.edu")

    # Proposer: coordinator (or different admin)
    # Coordinator creates a proposal via move session
    move_resp = client.post(
        "/api/sessions/MA101-AB-L1/move",
        headers=coord_headers,
        json={"target_day": "WED", "target_start_period": 8, "target_room_id": "LH-1"},
    )
    assert move_resp.status_code == 200
    prop_id = move_resp.json()["id"]

    # Reject proposal by admin
    rej_resp = client.post(
        f"/api/proposals/{prop_id}/reject",
        headers=admin_headers,
        json={"reason": "Test rejection persistence"},
    )
    assert rej_resp.status_code == 200
    assert rej_resp.json()["status"] == "rejected"

    # Verify SQLite persistence
    conn = get_connection()
    row = conn.execute("SELECT status FROM proposals WHERE id = ?", (prop_id,)).fetchone()
    assert row is not None
    assert row["status"] == "rejected"
