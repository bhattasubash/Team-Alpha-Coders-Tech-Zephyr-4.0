"""Milestone 8 Persistence and Jobs verification tests.

Verifies:
- SQLite persistence (users, dataset_state, schedule_state, exams_state, bookings, proposals, audit_log, jobs).
- POST /api/timetable/generate returns 202 Accepted and starts background CP-SAT solve.
- Concurrency control: only one solve at a time (HTTP 409 Conflict if one is running).
- GET /api/jobs/{id} reports progress (phase, elapsed seconds, solver status, best soft score).
- Upon job completion, kernel commits new schedule_state (version bumped, 0 hard violations with official validator).
- POST /api/admin/reset resets state back to initial cit_public.json and seed schedule.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.db.connection import get_connection
from app.db.repository import get_active_schedule, get_job, reset_database
from app.main import app

client = TestClient(app)
ROOT_DIR = Path(__file__).resolve().parents[2]


def get_admin_headers() -> dict[str, str]:
    """Helper to generate auth headers by logging in as admin@cit.edu."""
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@cit.edu", "password": "admin123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_reset_seeds_database():
    """Verify POST /api/admin/reset primes all tables with seed dataset and schedule."""
    headers = get_admin_headers()
    resp = client.post("/api/admin/reset", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"

    # Verify database state
    conn = get_connection()
    user_cnt = conn.execute("SELECT count(*) FROM users").fetchone()[0]
    assert user_cnt >= 5

    sched_cnt = conn.execute("SELECT count(*) FROM schedule_state WHERE is_active = 1").fetchone()[0]
    assert sched_cnt == 1

    audit_cnt = conn.execute("SELECT count(*) FROM audit_log").fetchone()[0]
    assert audit_cnt >= 1

    # Verify API view endpoints read from persistent schedule
    all_resp = client.get("/api/timetable/all", headers=headers)
    assert all_resp.status_code == 200
    sched = all_resp.json()
    assert len(sched["sessions"]) == 189

    room_resp = client.get("/api/timetable?view=room&id=AUD", headers=headers)
    assert room_resp.status_code == 200
    room_data = room_resp.json()
    assert room_data["view"] == "room"
    assert room_data["view_id"] == "AUD"
    assert len(room_data["sessions"]) > 0


def test_get_nonexistent_job_returns_404():
    """Verify querying an unknown job ID returns HTTP 404."""
    headers = get_admin_headers()
    resp = client.get("/api/jobs/job-nonexistent-123", headers=headers)
    assert resp.status_code == 404
    body = resp.json()
    assert "error" in body
    assert body["error"]["code"] == "NOT_FOUND"


def test_job_concurrency_control_409():
    """Verify only one solve can run at a time; secondary attempt returns 409 Conflict."""
    headers = get_admin_headers()
    client.post("/api/admin/reset", headers=headers)

    resp1 = client.post(
        "/api/timetable/generate",
        headers=headers,
        json={"time_limit_seconds": 15, "random_seed": 42},
    )
    assert resp1.status_code == 202
    job1 = resp1.json()
    assert "job_id" in job1
    assert job1["status"] in ("queued", "running")

    resp2 = client.post(
        "/api/timetable/generate",
        headers=headers,
        json={"time_limit_seconds": 15, "random_seed": 42},
    )
    assert resp2.status_code == 409
    body2 = resp2.json()
    assert "error" in body2
    assert body2["error"]["code"] == "JOB_RUNNING"

    stat_resp = client.get(f"/api/jobs/{job1['job_id']}", headers=headers)
    assert stat_resp.status_code == 200
    assert stat_resp.json()["job_id"] == job1["job_id"]


@pytest.mark.slow
def test_job_lifecycle_concurrency_and_commit(validator_module):
    """Verify solve job creation, 409 concurrency lock, progress polling, schedule commit, and reset."""
    headers = get_admin_headers()
    # Reset to known seed state (version 1)
    client.post("/api/admin/reset", headers=headers)

    conn = get_connection()
    init_ver = conn.execute("SELECT version FROM schedule_state WHERE is_active = 1").fetchone()[0]
    assert init_ver == 1

    # Trigger first generate job
    resp1 = client.post(
        "/api/timetable/generate",
        headers=headers,
        json={"time_limit_seconds": 30, "random_seed": 42},
    )
    assert resp1.status_code == 202
    job1 = resp1.json()
    job_id = job1["job_id"]
    assert job1["status"] in ("queued", "running")

    # Attempt second solve immediately -> must return 409 Conflict
    resp2 = client.post(
        "/api/timetable/generate",
        headers=headers,
        json={"time_limit_seconds": 30, "random_seed": 42},
    )
    assert resp2.status_code == 409
    body2 = resp2.json()
    assert "error" in body2
    assert body2["error"]["code"] == "JOB_RUNNING"

    # Poll until completed (timeout at 120s to allow full CP-SAT timetable + exam solve)
    start_poll = time.time()
    final_job: dict[str, Any] = {}
    while time.time() - start_poll < 120.0:
        poll_resp = client.get(f"/api/jobs/{job_id}", headers=headers)
        assert poll_resp.status_code == 200
        final_job = poll_resp.json()
        if final_job["status"] in ("completed", "failed"):
            break
        time.sleep(1.0)

    assert final_job.get("status") == "completed", f"Job failed or timed out: {final_job}"
    assert final_job["progress"] == 1.0
    assert final_job["phase"] == "Completed"
    assert final_job["solver_status"] in ("FEASIBLE", "OPTIMAL")
    assert final_job["best_soft_penalty"] is not None

    # Verify database schedule_state version bumped
    new_ver = conn.execute("SELECT version FROM schedule_state WHERE is_active = 1").fetchone()[0]
    assert new_ver > init_ver

    # Retrieve committed schedule via API
    export_resp = client.get("/api/export/schedule.json", headers=headers)
    assert export_resp.status_code == 200
    committed_schedule = export_resp.json()
    assert len(committed_schedule["sessions"]) == 189

    # Verify official validator reports 0 hard violations on newly generated and committed schedule
    data_path = ROOT_DIR / "data" / "cit_public.json"
    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)

    report = validator_module.run(data, committed_schedule)
    hard_violations = report.get("hard_violations", [])
    assert len(hard_violations) == 0, f"Validator found hard violations: {hard_violations}"

    # Reset again and verify version back to seed
    reset_resp = client.post("/api/admin/reset", headers=headers)
    assert reset_resp.status_code == 200
    reset_ver = conn.execute("SELECT version FROM schedule_state WHERE is_active = 1").fetchone()[0]
    assert reset_ver == 1
