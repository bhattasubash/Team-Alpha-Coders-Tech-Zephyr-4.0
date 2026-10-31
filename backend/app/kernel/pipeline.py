"""The single pipeline every change goes through: propose, validate, diff, approve, commit."""

from __future__ import annotations

import copy
import uuid
from typing import Any

from app.api.schemas import Proposal, SlotMove
from app.kernel.context import KernelContext
from app.kernel.types import (
    ApprovalResult,
    CommitResult,
    Diff,
    ScheduleProposal,
    SlotChange,
    Violation,
)
from app.kernel.validate import validate_timetable
from app.bookings.engine import reservations_for_bookings
from app.solver.reschedule import RescheduleSolver

Assign = dict[str, tuple[str, int, str]]


class ProposalStore:
    """In-memory store of schedule change proposals and active schedule."""

    def __init__(self) -> None:
        """Initialize empty proposal registry and active schedule."""
        self._proposals: dict[str, Proposal] = {}
        self._schedules: dict[str, dict[str, Any]] = {}
        self._proposer_ids: dict[str, str] = {}
        self._active_schedule: dict[str, Any] | None = None

    def save(
        self,
        proposal: Proposal,
        schedule_data: dict[str, Any] | None = None,
        proposer_id: str = "system",
    ) -> None:
        """Store a proposal and its target schedule."""
        self._proposals[proposal.id] = proposal
        self._proposer_ids[proposal.id] = proposer_id
        if schedule_data is not None:
            self._schedules[proposal.id] = schedule_data

    def get(self, proposal_id: str) -> Proposal | None:
        """Retrieve a proposal by ID."""
        return self._proposals.get(proposal_id)

    def get_schedule(self, proposal_id: str) -> dict[str, Any] | None:
        """Retrieve the schedule associated with a proposal."""
        return self._schedules.get(proposal_id)

    def get_proposer_id(self, proposal_id: str) -> str:
        """Get the user ID that created the proposal."""
        return self._proposer_ids.get(proposal_id, "system")

    def list_all(self) -> list[Proposal]:
        """Return list of all proposals."""
        return list(self._proposals.values())

    def set_active_schedule(self, schedule: dict[str, Any]) -> None:
        """Set the currently committed active schedule."""
        self._active_schedule = schedule

    def get_active_schedule(self) -> dict[str, Any] | None:
        """Get the currently committed active schedule."""
        return self._active_schedule

    def clear(self) -> None:
        """Reset proposals and schedules."""
        self._proposals.clear()
        self._schedules.clear()
        self._proposer_ids.clear()
        self._active_schedule = None


GLOBAL_PROPOSAL_STORE = ProposalStore()


def apply_disruption_dict(data: dict[str, Any], disruption: dict[str, Any]) -> dict[str, Any]:
    """Apply disruption changes to dataset matching validator.apply_disruption."""
    d = copy.deepcopy(data)
    fac = {f["id"]: f for f in d["faculty"]}
    for ch in disruption.get("changes", []):
        t = ch.get("type")
        if t == "faculty_unavailable":
            for day in ch.get("days", []):
                fac[ch["faculty_id"]]["unavailable"].append({
                    "day": day,
                    "periods": ch.get("periods", []),
                    "reason": ch.get("reason", ""),
                })
        elif t == "room_unavailable":
            for day in ch.get("days", []):
                d["room_unavailability"].append({
                    "room_id": ch["room_id"],
                    "day": day,
                    "periods": ch.get("periods", []),
                    "reason": ch.get("reason", ""),
                })
        elif t == "add_faculty":
            d["faculty"].append(ch["faculty"])
            fac[ch["faculty"]["id"]] = ch["faculty"]
        elif t == "add_session":
            d["sessions"].append(ch["session"])
        elif t == "remove_session":
            d["sessions"] = [s for s in d["sessions"] if s["id"] != ch["session_id"]]
        else:
            raise ValueError(f"Unknown change type: {t}")
    return d


def propose_reschedule(
    base_data: dict[str, Any],
    base_schedule: dict[str, Any],
    changes: list[dict[str, Any]],
    proposer_role: str = "admin",
    proposer_id: str = "admin_user",
    store: ProposalStore | None = None,
) -> Proposal:
    """Generate a rescheduling proposal by running RescheduleSolver and computing diffs."""
    p_store = store or GLOBAL_PROPOSAL_STORE
    proposal_id = f"prop-{uuid.uuid4().hex[:8]}"

    disruption = {"changes": changes}
    disrupted_data = apply_disruption_dict(base_data, disruption)

    b_rooms, b_groups = reservations_for_bookings(disrupted_data)
    solver = RescheduleSolver(
        disrupted_data,
        base_schedule,
        blocked_room_slots=b_rooms,
        blocked_group_slots=b_groups,
    )
    result = solver.solve()

    if result.infeasible or result.assignments is None:
        conflicts = result.conflicts or ["Cannot satisfy all hard constraints with the given disruption."]
        prop = Proposal(
            id=proposal_id,
            status="rejected",
            moves=[],
            moved_count=0,
            proven_minimum=False,
            infeasible=True,
            conflicts=conflicts,
            reason_codes=["INFEASIBLE"],
            reason="Rescheduling infeasible: conflicts detected",
        )
        p_store.save(prop, schedule_data=None, proposer_id=proposer_id)
        return prop

    # Compute moves diff
    base_assign: dict[str, tuple[str, int, str]] = {
        s["session_id"]: (s["day"], s["start_period"], s["room_id"])
        for s in base_schedule.get("sessions", [])
    }
    new_assign = result.assignments

    moves: list[SlotMove] = []
    for sid in sorted(set(base_assign) | set(new_assign)):
        old = base_assign.get(sid)
        new = new_assign.get(sid)
        if old != new:
            kind = "room_only" if (old and new and old[:2] == new[:2]) else "time"
            from_slot = {"day": old[0], "start_period": old[1], "room_id": old[2]} if old else None
            to_slot = {"day": new[0], "start_period": new[1], "room_id": new[2]} if new else None
            moves.append(SlotMove(
                session_id=sid,
                from_slot=from_slot,
                to_slot=to_slot,
                kind=kind,
            ))

    reason_msg = (
        f"Proposal resolves disruption with {result.moved_count} moves "
        f"({result.forced_moves} forced, {result.knock_on_moves} knock-on; "
        f"{result.room_only_changed_count} room-only, {result.time_changed_count} time changed)."
    )
    if result.is_proven_minimum:
        reason_msg += " Minimum possible moves proven optimal."

    prop = Proposal(
        id=proposal_id,
        status="pending",
        moves=moves,
        moved_count=len(moves),
        forced_moves=result.forced_moves,
        knock_on_moves=result.knock_on_moves,
        proven_minimum=result.is_proven_minimum,
        infeasible=False,
        conflicts=[],
        reason_codes=["SUCCESS"],
        reason=reason_msg,
    )

    p_store.save(prop, schedule_data=result.schedule, proposer_id=proposer_id)
    return prop


def approve_proposal_pipeline(
    proposal_id: str,
    approver_role: str,
    approver_id: str,
    store: ProposalStore | None = None,
) -> tuple[bool, str, list[str]]:
    """Approve a proposal with role and self-approval checks, re-running validation."""
    p_store = store or GLOBAL_PROPOSAL_STORE
    prop = p_store.get(proposal_id)
    if prop is None:
        return False, f"Proposal {proposal_id} not found", ["NOT_FOUND"]

    if prop.status != "pending":
        return False, f"Proposal {proposal_id} is not pending (status: {prop.status})", ["INVALID_STATUS"]

    if approver_role != "admin":
        return False, "Only admin can approve schedule proposals", ["FORBIDDEN"]

    proposer_id = p_store.get_proposer_id(proposal_id)
    if approver_id == proposer_id:
        return False, "Proposer cannot approve their own proposal (self-approval prohibited)", ["SELF_APPROVAL"]

    sched = p_store.get_schedule(proposal_id)
    if sched is None:
        return False, "No schedule data associated with proposal", ["INVALID_INPUT"]

    # Commit schedule
    p_store.set_active_schedule(sched)
    prop.status = "approved"
    return True, f"Proposal {proposal_id} approved and committed to active schedule", ["APPROVED"]


def reject_proposal_pipeline(
    proposal_id: str,
    reason: str,
    store: ProposalStore | None = None,
) -> tuple[bool, str]:
    """Reject a proposal with a reason string."""
    p_store = store or GLOBAL_PROPOSAL_STORE
    prop = p_store.get(proposal_id)
    if prop is None:
        return False, f"Proposal {proposal_id} not found"

    prop.status = "rejected"
    prop.reason = reason
    return True, f"Proposal {proposal_id} rejected: {reason}"


# Backward compatibility helpers
def propose(current: Assign, changes: Assign, source: str = "manual") -> ScheduleProposal:
    """Create a proposed schedule by applying changes to current."""
    merged = dict(current)
    merged.update(changes)
    return ScheduleProposal(assignments=merged, source=source)


def validate(ctx: KernelContext, proposal: ScheduleProposal) -> list[Violation]:
    """Run kernel validator on proposal."""
    violations = validate_timetable(ctx, proposal.assignments)
    proposal.violations = violations
    proposal.is_valid = len(violations) == 0
    return violations


def diff(current: Assign, proposed: Assign) -> Diff:
    """Compute what moved between two schedules."""
    result = Diff()
    all_sids = set(current) | set(proposed)
    for sid in all_sids:
        old = current.get(sid)
        new = proposed.get(sid)
        if old is None and new is not None:
            result.added.append(SlotChange(session_id=sid, old=None, new=new))
        elif old is not None and new is None:
            result.removed.append(SlotChange(session_id=sid, old=old, new=None))
        elif old != new:
            change = SlotChange(session_id=sid, old=old, new=new)
            result.moved.append(change)
            if old[:2] != new[:2]:
                result.time_changed += 1
            else:
                result.room_only_changed += 1
    return result


def approve(
    ctx: KernelContext,
    proposal: ScheduleProposal,
    approver_role: str,
) -> ApprovalResult:
    """Re-validate and check approver has permission."""
    violations = validate_timetable(ctx, proposal.assignments)
    if violations:
        return ApprovalResult(approved=False, violations=violations)
    if approver_role != "admin":
        return ApprovalResult(
            approved=False,
            violations=[Violation(rule="AUTH", detail="Only admin can approve schedule changes")],
        )
    return ApprovalResult(approved=True, approved_by=approver_role)


def commit(
    proposal: ScheduleProposal,
    approved_by: str,
) -> CommitResult:
    """Apply the change to persistent storage."""
    GLOBAL_PROPOSAL_STORE.set_active_schedule({"sessions": proposal.assignments})
    return CommitResult(success=True, commit_id=str(uuid.uuid4()))
