"""Database schema DDL for Milestone 8 persistence."""

from __future__ import annotations

import sqlite3

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    profile_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dataset_state (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    data_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_state (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    schedule_json TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exams_state (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    exams_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    request_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    request_json TEXT NOT NULL,
    decision_json TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    moves_json TEXT NOT NULL,
    moved_count INTEGER NOT NULL DEFAULT 0,
    forced_moves INTEGER NOT NULL DEFAULT 0,
    knock_on_moves INTEGER NOT NULL DEFAULT 0,
    proven_minimum INTEGER NOT NULL DEFAULT 0,
    infeasible INTEGER NOT NULL DEFAULT 0,
    conflicts_json TEXT,
    reason_codes_json TEXT,
    reason TEXT,
    proposer_id TEXT NOT NULL,
    approver_id TEXT,
    schedule_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    proposal_id TEXT,
    proposer_id TEXT NOT NULL,
    approver_id TEXT,
    detail_json TEXT,
    timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL, -- PENDING, RUNNING, COMPLETED, FAILED
    phase TEXT,
    elapsed_seconds REAL DEFAULT 0.0,
    best_soft_score REAL,
    solver_status TEXT DEFAULT 'UNKNOWN',
    error_message TEXT,
    result_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schedule_active ON schedule_state(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
"""


def init_db(conn: sqlite3.Connection) -> None:
    """Initialize all schema tables and indexes."""
    conn.executescript(CREATE_TABLES_SQL)
    conn.commit()
