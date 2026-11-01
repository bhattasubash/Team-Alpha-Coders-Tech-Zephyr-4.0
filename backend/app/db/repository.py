"""Data access repository for SQLite persistence (Milestone 8)."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.auth.users import DEMO_USERS
from app.db.connection import get_connection
from app.db.schema import init_db

ROOT_DIR = Path(__file__).resolve().parents[3]


def get_db(conn: sqlite3.Connection | None = None) -> sqlite3.Connection:
    """Return provided connection or a new connection with tables initialized."""
    if conn is not None:
        return conn
    c = get_connection()
    init_db(c)
    return c


# =============================================================================
# Database Reset & Seeding
# =============================================================================

def reset_database(conn: sqlite3.Connection | None = None) -> None:
    """Reset database to initial seed data from cit_public.json and exports/schedule.json."""
    c = get_db(conn)
    now = datetime.now(UTC).isoformat()

    with c:
        # 1. Clear all existing tables
        c.execute("DELETE FROM jobs;")
        c.execute("DELETE FROM proposals;")
        c.execute("DELETE FROM audit_log;")
        c.execute("DELETE FROM bookings;")
        c.execute("DELETE FROM exams_state;")
        c.execute("DELETE FROM schedule_state;")
        c.execute("DELETE FROM dataset_state;")
        c.execute("DELETE FROM users;")

        # 2. Seed Users
        for email, u in DEMO_USERS.items():
            user_id = f"user-{uuid.uuid4().hex[:8]}"
            profile_data = u.get("profile", {})
            if "faculty_id" in u:
                profile_data["faculty_id"] = u["faculty_id"]
            if "department" in u:
                profile_data["department"] = u["department"]
            if "club_name" in u:
                profile_data["club_name"] = u["club_name"]

            c.execute(
                """
                INSERT INTO users (id, email, password, name, role, profile_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    email,
                    u["password"],
                    u["name"],
                    u["role"],
                    json.dumps(profile_data),
                    now,
                ),
            )

        # 3. Seed Dataset State from data/cit_public.json
        data_path = ROOT_DIR / "data" / "cit_public.json"
        if not data_path.exists():
            data_path = Path("data/cit_public.json")
        with open(data_path, encoding="utf-8") as f:
            data_dict = json.load(f)

        dataset_id = data_dict.get("dataset_id", "cit-public-v1")
        c.execute(
            """
            INSERT INTO dataset_state (id, dataset_id, data_json, version, updated_at)
            VALUES (?, ?, ?, 1, ?)
            """,
            (f"ds-{uuid.uuid4().hex[:8]}", dataset_id, json.dumps(data_dict), now),
        )

        # 4. Seed Schedule State & Exams & Bookings from exports/schedule.json
        sched_path = ROOT_DIR / "exports" / "schedule.json"
        if not sched_path.exists():
            sched_path = Path("exports/schedule.json")
        with open(sched_path, encoding="utf-8") as f:
            sched_dict = json.load(f)

        c.execute(
            """
            INSERT INTO schedule_state (id, dataset_id, version, schedule_json, is_active, created_at)
            VALUES (?, ?, 1, ?, 1, ?)
            """,
            (f"sched-{uuid.uuid4().hex[:8]}", dataset_id, json.dumps(sched_dict), now),
        )

        # Exams
        exams_list = sched_dict.get("exams", [])
        c.execute(
            """
            INSERT INTO exams_state (id, dataset_id, version, exams_json, created_at)
            VALUES (?, ?, 1, ?, ?)
            """,
            (f"exams-{uuid.uuid4().hex[:8]}", dataset_id, json.dumps(exams_list), now),
        )

        # Bookings & Decisions
        booking_decisions = {
            b["request_id"]: b
            for b in sched_dict.get("fest_week", {}).get("bookings", [])
        }
        for req in data_dict.get("booking_requests", []):
            rid = req["id"]
            dec = booking_decisions.get(rid)
            status = dec.get("status", "pending") if dec else "pending"
            c.execute(
                """
                INSERT INTO bookings (id, request_id, status, request_json, decision_json, version, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
                """,
                (
                    f"book-{uuid.uuid4().hex[:8]}",
                    rid,
                    status,
                    json.dumps(req),
                    json.dumps(dec) if dec else None,
                    now,
                ),
            )

        # Audit log initial seed
        c.execute(
            """
            INSERT INTO audit_log (id, action, proposal_id, proposer_id, approver_id, detail_json, timestamp)
            VALUES (?, 'seed_database', NULL, 'system', 'system', ?, ?)
            """,
            (f"audit-{uuid.uuid4().hex[:8]}", json.dumps({"dataset_id": dataset_id}), now),
        )


# =============================================================================
# Users
# =============================================================================

def get_user_by_email(email: str, conn: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    """Retrieve user by email address."""
    c = get_db(conn)
    row = c.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row:
        return None
    d = dict(row)
    if d.get("profile_json"):
        try:
            d["profile"] = json.loads(d["profile_json"])
            # Unpack flat fields for compatibility
            for k, v in d["profile"].items():
                d[k] = v
        except Exception:
            d["profile"] = {}
    return d


# =============================================================================
# Dataset State
# =============================================================================

def get_active_dataset(conn: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    """Get the active dataset JSON."""
    c = get_db(conn)
    row = c.execute("SELECT data_json FROM dataset_state ORDER BY version DESC LIMIT 1").fetchone()
    if not row:
        return None
    return json.loads(row["data_json"])


# =============================================================================
# Schedule State & Kernel Commits
# =============================================================================

def get_active_schedule(conn: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    """Retrieve the currently active schedule JSON."""
    c = get_db(conn)
    row = c.execute(
        "SELECT schedule_json FROM schedule_state WHERE is_active = 1 ORDER BY version DESC LIMIT 1"
    ).fetchone()
    if not row:
        return None
    return json.loads(row["schedule_json"])


def commit_new_schedule(
    schedule: dict[str, Any],
    dataset_id: str = "cit-public-v1",
    conn: sqlite3.Connection | None = None,
) -> int:
    """Commit a new schedule version as active, deactivating previous versions."""
    c = get_db(conn)
    now = datetime.now(UTC).isoformat()
    with c:
        row = c.execute("SELECT MAX(version) as max_v FROM schedule_state").fetchone()
        next_v = (row["max_v"] or 0) + 1
        c.execute("UPDATE schedule_state SET is_active = 0 WHERE is_active = 1")
        c.execute(
            """
            INSERT INTO schedule_state (id, dataset_id, version, schedule_json, is_active, created_at)
            VALUES (?, ?, ?, ?, 1, ?)
            """,
            (f"sched-{uuid.uuid4().hex[:8]}", dataset_id, next_v, json.dumps(schedule), now),
        )
    return next_v


# =============================================================================
# Proposals & Audit Log
# =============================================================================

def save_proposal(
    prop: dict[str, Any],
    schedule_data: dict[str, Any] | None = None,
    proposer_id: str = "system",
    conn: sqlite3.Connection | None = None,
) -> None:
    """Persist a rescheduling proposal and its schedule diff."""
    c = get_db(conn)
    now = datetime.now(UTC).isoformat()
    moves_json = json.dumps(prop.get("moves", []))
    conflicts_json = json.dumps(prop.get("conflicts", []))
    reason_codes_json = json.dumps(prop.get("reason_codes", []))
    sched_json = json.dumps(schedule_data) if schedule_data else None

    with c:
        c.execute(
            """
            INSERT OR REPLACE INTO proposals (
                id, status, moves_json, moved_count, forced_moves, knock_on_moves,
                proven_minimum, infeasible, conflicts_json, reason_codes_json, reason,
                proposer_id, approver_id, schedule_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                prop["id"],
                prop.get("status", "pending"),
                moves_json,
                prop.get("moved_count", 0),
                prop.get("forced_moves", 0),
                prop.get("knock_on_moves", 0),
                1 if prop.get("proven_minimum") else 0,
                1 if prop.get("infeasible") else 0,
                conflicts_json,
                reason_codes_json,
                prop.get("reason", ""),
                proposer_id,
                prop.get("approver_id"),
                sched_json,
                now,
                now,
            ),
        )


def get_proposal(prop_id: str, conn: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    """Retrieve proposal record by ID."""
    c = get_db(conn)
    row = c.execute("SELECT * FROM proposals WHERE id = ?", (prop_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d["moves"] = json.loads(d["moves_json"]) if d.get("moves_json") else []
    d["conflicts"] = json.loads(d["conflicts_json"]) if d.get("conflicts_json") else []
    d["reason_codes"] = json.loads(d["reason_codes_json"]) if d.get("reason_codes_json") else []
    d["proven_minimum"] = bool(d.get("proven_minimum"))
    d["infeasible"] = bool(d.get("infeasible"))
    d["schedule"] = json.loads(d["schedule_json"]) if d.get("schedule_json") else None
    return d


def list_proposals(status: str | None = None, conn: sqlite3.Connection | None = None) -> list[dict[str, Any]]:
    """List all proposals, optionally filtered by status."""
    c = get_db(conn)
    if status is not None:
        rows = c.execute("SELECT * FROM proposals WHERE status = ? ORDER BY created_at DESC", (status,)).fetchall()
    else:
        rows = c.execute("SELECT * FROM proposals ORDER BY created_at DESC").fetchall()
    res = []
    for row in rows:
        d = dict(row)
        d["moves"] = json.loads(d["moves_json"]) if d.get("moves_json") else []
        d["conflicts"] = json.loads(d["conflicts_json"]) if d.get("conflicts_json") else []
        d["reason_codes"] = json.loads(d["reason_codes_json"]) if d.get("reason_codes_json") else []
        d["proven_minimum"] = bool(d.get("proven_minimum"))
        d["infeasible"] = bool(d.get("infeasible"))
        res.append(d)
    return res


def update_proposal_status(
    prop_id: str,
    status: str,
    approver_id: str | None = None,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Update proposal approval status and approver ID."""
    c = get_db(conn)
    now = datetime.now(UTC).isoformat()
    with c:
        c.execute(
            """
            UPDATE proposals SET status = ?, approver_id = ?, updated_at = ? WHERE id = ?
            """,
            (status, approver_id, now, prop_id),
        )


def log_audit(
    action: str,
    proposal_id: str | None = None,
    proposer_id: str = "system",
    approver_id: str | None = None,
    detail: dict[str, Any] | None = None,
    conn: sqlite3.Connection | None = None,
    **kwargs: Any,
) -> None:
    """Record an entry in the immutable audit log."""
    if "user_id" in kwargs and proposer_id == "system":
        proposer_id = str(kwargs["user_id"])
    if "details" in kwargs and detail is None:
        detail = kwargs["details"]

    c = get_db(conn)
    now = datetime.now(UTC).isoformat()
    detail_json = json.dumps(detail or {})
    with c:
        c.execute(
            """
            INSERT INTO audit_log (id, action, proposal_id, proposer_id, approver_id, detail_json, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (f"audit-{uuid.uuid4().hex[:8]}", action, proposal_id, proposer_id, approver_id, detail_json, now),
        )


# =============================================================================
# Jobs
# =============================================================================

def create_job(
    job_id: str,
    job_type: str,
    status: str = "PENDING",
    phase: str | None = None,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Create a solver background job."""
    c = get_db(conn)
    now = datetime.now(UTC).isoformat()
    with c:
        c.execute(
            """
            INSERT INTO jobs (id, type, status, phase, elapsed_seconds, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0.0, ?, ?)
            """,
            (job_id, job_type, status, phase, now, now),
        )


def get_job(job_id: str, conn: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    """Retrieve job by ID."""
    c = get_db(conn)
    row = c.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not row:
        return None
    return dict(row)


def get_running_job(conn: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    """Check if any job is currently in PENDING or RUNNING status."""
    c = get_db(conn)
    row = c.execute(
        "SELECT * FROM jobs WHERE status IN ('PENDING', 'RUNNING', 'queued', 'running') LIMIT 1"
    ).fetchone()
    if not row:
        return None
    return dict(row)


def update_job(
    job_id: str,
    status: str,
    phase: str | None = None,
    elapsed_seconds: float = 0.0,
    best_soft_score: float | None = None,
    solver_status: str = "UNKNOWN",
    error_message: str | None = None,
    result_json: str | None = None,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Update background job progress metrics and status."""
    c = get_db(conn)
    now = datetime.now(UTC).isoformat()
    with c:
        c.execute(
            """
            UPDATE jobs
            SET status = ?, phase = ?, elapsed_seconds = ?, best_soft_score = ?,
                solver_status = ?, error_message = ?, result_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                status,
                phase,
                elapsed_seconds,
                best_soft_score,
                solver_status,
                error_message,
                result_json,
                now,
                job_id,
            ),
        )


# =============================================================================
# Bookings Persistence
# =============================================================================

def list_bookings(
    status: str | None = None,
    conn: sqlite3.Connection | None = None,
) -> list[dict[str, Any]]:
    """Retrieve all bookings with their latest decisions from SQLite."""
    c = get_db(conn)
    query = "SELECT * FROM bookings"
    params: list[Any] = []
    if status is not None:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY id ASC"

    rows = c.execute(query, params).fetchall()
    results: list[dict[str, Any]] = []
    for r in rows:
        row_dict = dict(r)
        req_obj = json.loads(row_dict["request_json"]) if row_dict.get("request_json") else {}
        dec_obj = json.loads(row_dict["decision_json"]) if row_dict.get("decision_json") else None

        # Merge decision fields into booking object for UI convenience
        merged = dict(req_obj)
        merged["id"] = row_dict["request_id"]
        merged["status"] = row_dict["status"]
        if dec_obj:
            merged["assigned_room"] = dec_obj.get("room_id")
            merged["assigned_day"] = dec_obj.get("day")
            merged["assigned_start_period"] = dec_obj.get("start_period")
            merged["assigned_end_period"] = dec_obj.get("end_period")
            merged["reason"] = dec_obj.get("reason", "")
            merged["reason_codes"] = dec_obj.get("reason_codes", [])
            merged["alternative_offered"] = dec_obj.get("alternative_offered")
            merged["decision"] = dec_obj
        results.append(merged)
    return results


def get_booking(
    request_id: str,
    conn: sqlite3.Connection | None = None,
) -> dict[str, Any] | None:
    """Retrieve single booking record by request_id."""
    c = get_db(conn)
    row = c.execute("SELECT * FROM bookings WHERE request_id = ?", (request_id,)).fetchone()
    if not row:
        return None
    row_dict = dict(row)
    req_obj = json.loads(row_dict["request_json"]) if row_dict.get("request_json") else {}
    dec_obj = json.loads(row_dict["decision_json"]) if row_dict.get("decision_json") else None
    merged = dict(req_obj)
    merged["id"] = row_dict["request_id"]
    merged["status"] = row_dict["status"]
    if dec_obj:
        merged["assigned_room"] = dec_obj.get("room_id")
        merged["assigned_day"] = dec_obj.get("day")
        merged["assigned_start_period"] = dec_obj.get("start_period")
        merged["assigned_end_period"] = dec_obj.get("end_period")
        merged["reason"] = dec_obj.get("reason", "")
        merged["reason_codes"] = dec_obj.get("reason_codes", [])
        merged["alternative_offered"] = dec_obj.get("alternative_offered")
        merged["decision"] = dec_obj
    return merged


def save_booking(
    request_id: str,
    request_data: dict[str, Any],
    status: str = "pending",
    decision_data: dict[str, Any] | None = None,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Save or update booking request in SQLite."""
    c = get_db(conn)
    now = datetime.now(UTC).isoformat()
    with c:
        c.execute(
            """
            INSERT INTO bookings (id, request_id, status, request_json, decision_json, version, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)
            ON CONFLICT(request_id) DO UPDATE SET
                status = excluded.status,
                request_json = excluded.request_json,
                decision_json = excluded.decision_json,
                version = bookings.version + 1,
                updated_at = excluded.updated_at
            """,
            (
                f"book-{uuid.uuid4().hex[:8]}",
                request_id,
                status,
                json.dumps(request_data),
                json.dumps(decision_data) if decision_data else None,
                now,
            ),
        )


def update_booking_status(
    request_id: str,
    status: str,
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Update status of a booking."""
    c = get_db(conn)
    now = datetime.now(UTC).isoformat()
    with c:
        cur = c.execute(
            "UPDATE bookings SET status = ?, updated_at = ? WHERE request_id = ?",
            (status, now, request_id),
        )
        return cur.rowcount > 0
