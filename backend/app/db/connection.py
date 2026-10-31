"""SQLite persistence and connection management for CIT Scheduler (Milestone 8)."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_DB_PATH = ROOT_DIR / "backend" / "cit_scheduler.db"
DB_PATH = Path(os.getenv("DATABASE_PATH", str(DEFAULT_DB_PATH)))


def get_db_path() -> Path:
    """Return configured database file path."""
    return DB_PATH


def get_connection(db_path: Path | str | None = None) -> sqlite3.Connection:
    """Create and configure a SQLite connection with WAL mode and foreign keys enabled."""
    target_path = Path(db_path) if db_path else DB_PATH
    target_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(target_path), timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn
