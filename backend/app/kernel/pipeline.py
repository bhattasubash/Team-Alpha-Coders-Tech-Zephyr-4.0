"""The single pipeline every change goes through: propose, validate, diff, approve, commit."""

from __future__ import annotations

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

Assign = dict[str, tuple[str, int, str]]


def propose(current: Assign, changes: Assign, source: str = "manual") -> ScheduleProposal:
    """Create a proposed schedule by applying changes to the current one."""
    merged = dict(current)
    merged.update(changes)
    return ScheduleProposal(assignments=merged, source=source)


def validate(ctx: KernelContext, proposal: ScheduleProposal) -> list[Violation]:
    """Run the kernel validator on a proposal and store results."""
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
            # Matches the validator definition: time_changed if day or period differ
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
    """Re-validate and check the approver has permission. Needs DB for full implementation."""
    # Re-run validation to be safe (approval must re-check)
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
    """Apply the change to persistent storage. Needs DB, so stub for now."""
    # TODO(subash): implement DB persistence in the next phase
    raise NotImplementedError(
        "commit() needs database persistence. Listed in DECISIONS.md as pending."
    )
