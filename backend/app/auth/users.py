"""Demo user accounts and simple auth for the hackathon build.

Four seed accounts with role-based access. No database yet: users live in a dict.
The manual booking form and scheduling must work with every LLM key removed,
so auth never depends on an external service.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

import os

# We use python-jose for JWT tokens
try:
    from jose import JWTError, jwt
except ImportError:
    # Fallback: auth still works at import time, just can't sign tokens
    jwt = None  # type: ignore[assignment]
    JWTError = Exception  # type: ignore[assignment,misc]

ENV = os.getenv("ENV", "development").lower()
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if ENV == "production":
        raise RuntimeError("SECRET_KEY environment variable must be set in production mode")
    SECRET_KEY = "hackathon-dev-secret-change-in-production"

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 480  # 8 hours, long enough for a demo session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# --- seed accounts ---
# Password stored as plaintext for the hackathon demo. In production: hash with passlib.
DEMO_USERS: dict[str, dict[str, Any]] = {
    "admin@cit.edu": {
        "email": "admin@cit.edu",
        "password": "admin123",
        "name": "Admin User",
        "role": "admin",
        "profile": {"title": "System Administrator"},
    },
    "dean@cit.edu": {
        "email": "dean@cit.edu",
        "password": "dean123",
        "name": "Dean of Academic Affairs",
        "role": "admin",
        "profile": {"title": "Dean of Academic Affairs"},
    },
    "coordinator@cit.edu": {
        "email": "coordinator@cit.edu",
        "password": "coord123",
        "name": "Dept Coordinator",
        "role": "department_coordinator",
        "department": "CSE",
        "profile": {"department": "CSE"},
    },
    "faculty@cit.edu": {
        "email": "faculty@cit.edu",
        "password": "faculty123",
        "name": "Faculty Member",
        "role": "faculty",
        "faculty_id": "F01",
        "profile": {"faculty_id": "F01"},
    },
    "club@cit.edu": {
        "email": "club@cit.edu",
        "password": "club123",
        "name": "Club Representative",
        "role": "club",
        "club_name": "Coding Club",
        "profile": {"club_name": "Coding Club"},
    },
}


def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    """Check credentials against the seed user list."""
    user = DEMO_USERS.get(email)
    if user and user["password"] == password:
        return user
    return None


def create_access_token(data: dict[str, Any]) -> str:
    """Sign a JWT with the user's email and role."""
    if jwt is None:
        raise RuntimeError("python-jose is not installed")
    payload = data.copy()
    payload["exp"] = datetime.now(UTC) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict[str, Any]:
    """Decode the JWT and return the user dict. Raises 401 if invalid."""
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None or email not in DEMO_USERS:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return DEMO_USERS[email]
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def require_role(*allowed_roles: str):
    """Dependency that checks the user has one of the allowed roles."""

    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return checker
