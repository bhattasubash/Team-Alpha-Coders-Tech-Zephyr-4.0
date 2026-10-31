"""Thin timetable routes. No business logic here: all work goes to the kernel and solver."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth.users import get_current_user

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


@router.get("/")
def get_timetable(user: dict = Depends(get_current_user)) -> dict:
    """Return the current timetable. Needs DB and solver output."""
    # TODO(subash): load from DB once solver produces a schedule
    raise NotImplementedError("Timetable retrieval needs the solver and DB. Pending.")


@router.get("/{group_id}")
def get_timetable_for_group(group_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Return timetable filtered by student group."""
    raise NotImplementedError("Group timetable needs the solver and DB. Pending.")


@router.post("/generate")
def generate_timetable(user: dict = Depends(get_current_user)) -> dict:
    """Trigger timetable generation via the solver. Admin only."""
    raise NotImplementedError("Solver integration pending.")


@router.post("/propose")
def propose_change(user: dict = Depends(get_current_user)) -> dict:
    """Submit a change proposal through the pipeline."""
    raise NotImplementedError("Change proposal needs the full pipeline and DB. Pending.")


@router.post("/approve/{proposal_id}")
def approve_change(proposal_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Approve a pending proposal. Admin only, re-validates before commit."""
    raise NotImplementedError("Approval flow needs the pipeline and DB. Pending.")
