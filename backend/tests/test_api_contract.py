"""Tests verifying the complete API contract, openapi.json, and error envelopes."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_openapi_loads_successfully():
    """Verify /openapi.json loads with HTTP 200 and documents core paths."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert spec["openapi"].startswith("3.")
    paths = spec["paths"]

    # Verify key endpoints exist in the OpenAPI schema
    required_paths = [
        "/api/health",
        "/api/auth/login",
        "/api/auth/me",
        "/api/meta",
        "/api/timetable",
        "/api/timetable/all",
        "/api/timetable/generate",
        "/api/timetable/optimise",
        "/api/jobs/{id}",
        "/api/validation",
        "/api/validation/official",
        "/api/sessions/{id}/legal-slots",
        "/api/sessions/{id}/move",
        "/api/rooms/free",
        "/api/exams",
        "/api/exams/generate",
        "/api/bookings",
        "/api/bookings/parse",
        "/api/bookings/{id}/cancel",
        "/api/bookings/decide",
        "/api/bookings/{id}/decision",
        "/api/disruptions/preview",
        "/api/proposals",
        "/api/proposals/{id}/approve",
        "/api/proposals/{id}/reject",
        "/api/explain/session/{id}",
        "/api/explain/booking/{id}",
        "/api/assistant",
        "/api/dashboard",
        "/api/admin/reset",
        "/api/admin/dataset",
        "/api/export/schedule.json",
    ]
    for p in required_paths:
        assert p in paths, f"Path {p} is missing from OpenAPI schema"


def test_health_endpoint():
    """Verify health endpoint returns 200."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"


def test_login_demo_user():
    """Verify login with demo credentials returns valid token."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@cit.edu", "password": "admin123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["email"] == "admin@cit.edu"


def test_login_invalid_credentials_returns_401_with_error_envelope():
    """Verify invalid login credentials return 401 with standard error envelope."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@cit.edu", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] == "UNAUTHENTICATED"
    assert "Invalid email or password" in body["error"]["message"]
    assert isinstance(body["error"]["details"], list)


def test_unauthenticated_protected_endpoint():
    """Verify accessing protected endpoint without token returns 401 error envelope."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] == "UNAUTHENTICATED"
    assert isinstance(body["error"]["details"], list)


def test_forbidden_role_access():
    """Verify non-admin user accessing admin-only endpoint returns 403."""
    # Login as club
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "club@cit.edu", "password": "club123"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Access admin-only endpoint
    response = client.post("/api/timetable/generate", headers=headers, json={})
    assert response.status_code == 403
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] == "FORBIDDEN"
    assert isinstance(body["error"]["details"], list)


def test_unimplemented_endpoints_return_501_with_error_envelope():
    """Verify newly wired endpoints return 200 and healthy contracts."""
    # Login as admin
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "admin@cit.edu", "password": "admin123"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Meta endpoint
    meta_resp = client.get("/api/meta")
    assert meta_resp.status_code == 200
    meta_body = meta_resp.json()
    assert meta_body["room_count"] > 0
    assert meta_body["faculty_count"] > 0

    # Dashboard endpoint
    dash_resp = client.get("/api/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash_body = dash_resp.json()
    assert "conflict_count" in dash_body
    assert "room_utilisation" in dash_body

    # Validation endpoint
    val_resp = client.get("/api/validation", headers=headers)
    assert val_resp.status_code == 200
    val_body = val_resp.json()
    assert val_body["hard_violation_count"] == 0

    # Rooms free endpoint
    rooms_resp = client.get("/api/rooms/free?day=MON&period=1&duration=1", headers=headers)
    assert rooms_resp.status_code == 200
    rooms_body = rooms_resp.json()
    assert "rooms" in rooms_body

    # Bookings endpoint
    bookings_resp = client.get("/api/bookings", headers=headers)
    assert bookings_resp.status_code == 200

    # Exams endpoint
    exams_resp = client.get("/api/exams", headers=headers)
    assert exams_resp.status_code == 200

    # Explain session endpoint
    explain_resp = client.get("/api/explain/session/MA101-AB-L1", headers=headers)
    assert explain_resp.status_code == 200
    explain_body = explain_resp.json()
    assert explain_body["session_id"] == "MA101-AB-L1"
    assert len(explain_body["alternative_periods"]) > 0


def test_not_found_returns_404_with_error_envelope():
    """Verify 404 response uses standard error envelope."""
    response = client.get("/api/nonexistent/endpoint")
    assert response.status_code == 404
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] == "NOT_FOUND"
    assert isinstance(body["error"]["details"], list)


def test_validation_error_returns_422_with_invalid_input_envelope():
    """Verify validation errors use INVALID_INPUT code with structured details."""
    response = client.post("/api/auth/login", json={"invalid_field": 123})
    assert response.status_code == 422
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] == "INVALID_INPUT"
    assert isinstance(body["error"]["details"], list)
