"""CP-SAT solver for exam scheduling.

Milestone 4: EXAMS
- Uses calendar.exam_week days and sessions.
- Candidate rooms: rooms with "exam" in allowed_uses.
- Seats per room: integer floor division capacity // 2.
- Room non-overlap (H4): at most one exam per (room, day, session).
- Group non-overlap (H3): at most one exam per (group, day, session).
- Soft objective: 5 penalty points per extra same-day exam for any student group.
"""

from __future__ import annotations

from typing import Any

from ortools.sat.python import cp_model

from app.solver.config import SolverConfig


class ExamSolver:
    """CP-SAT based exam scheduler."""

    def __init__(
        self,
        data: dict[str, Any],
        config: SolverConfig | None = None,
    ) -> None:
        """Initialize with dataset and optional solver configuration."""
        self.data = data
        self.config = config or SolverConfig()
        self.exams = data.get("exams", [])
        self.cal = data.get("calendar", {}).get("exam_week", {})
        self.days = self.cal.get("days", [])
        self.sessions = [s["id"] for s in self.cal.get("sessions", [])]
        self.slots = [(d, s) for d in self.days for s in self.sessions]

        # Candidate rooms: rooms explicitly allowing exams
        self.exam_rooms = [
            r for r in data.get("rooms", [])
            if "exam" in r.get("allowed_uses", [])
        ]
        self.rooms_by_id = {r["id"]: r for r in self.exam_rooms}

    def solve(
        self,
        time_limit_override: float | None = None,
    ) -> list[dict[str, Any]]:
        """Solve the exam scheduling model using CP-SAT.

        Returns list of scheduled exam dictionaries:
        [{"exam_id": ..., "day": ..., "session": ..., "rooms": [...], "room_ids": [...]}]
        """
        if not self.exams:
            return []

        model = cp_model.CpModel()
        slots = self.slots
        num_slots = len(slots)
        exam_rooms = self.exam_rooms

        # 1. Decision variables
        # y[e, t]: exam e assigned to slot t
        y: dict[tuple[str, int], cp_model.IntVar] = {}
        for e in self.exams:
            eid = e["id"]
            for t_idx in range(num_slots):
                y[(eid, t_idx)] = model.NewBoolVar(f"y_{eid}_{t_idx}")
            model.AddExactlyOne(y[(eid, t_idx)] for t_idx in range(num_slots))

        # z[e, r, t]: exam e uses room r in slot t
        z: dict[tuple[str, str, int], cp_model.IntVar] = {}
        for e in self.exams:
            eid = e["id"]
            size = e["size"]
            for t_idx in range(num_slots):
                for r in exam_rooms:
                    rid = r["id"]
                    z[(eid, rid, t_idx)] = model.NewBoolVar(f"z_{eid}_{rid}_{t_idx}")
                    # Room can only be used by exam e in slot t if exam e is assigned to slot t
                    model.Add(z[(eid, rid, t_idx)] <= y[(eid, t_idx)])

                # Total half-capacity seats >= exam size in assigned slot
                # Sum(r.capacity // 2 * z[e, r, t]) >= size * y[e, t]
                model.Add(
                    sum((r["capacity"] // 2) * z[(eid, r["id"], t_idx)] for r in exam_rooms)
                    >= size * y[(eid, t_idx)]
                )

        # 2. Room non-overlap: at most one exam per (room, slot)
        for t_idx in range(num_slots):
            for r in exam_rooms:
                rid = r["id"]
                model.Add(sum(z[(e["id"], rid, t_idx)] for e in self.exams) <= 1)

        # 3. Student group non-overlap: at most one exam per (group, slot)
        groups = sorted(set(g for e in self.exams for g in e.get("groups", [])))
        for t_idx in range(num_slots):
            for g in groups:
                g_exams = [y[(e["id"], t_idx)] for e in self.exams if g in e.get("groups", [])]
                if len(g_exams) > 1:
                    model.Add(sum(g_exams) <= 1)

        # 4. Soft objective: extra same-day exams per student group (5 points per extra exam)
        obj_terms: list[Any] = []
        for g in groups:
            for d in self.days:
                d_slot_indices = [idx for idx, (day, _) in enumerate(slots) if day == d]
                day_exam_terms = [
                    y[(e["id"], t_idx)]
                    for e in self.exams
                    if g in e.get("groups", [])
                    for t_idx in d_slot_indices
                ]
                extra = model.NewIntVar(0, len(self.exams), f"extra_{g}_{d}")
                model.Add(extra >= sum(day_exam_terms) - 1)
                # Primary weight: 50,000 * extra ensures zero soft violations dominates
                obj_terms.append(50000 * extra)

        # Secondary objective: seat compactness (minimizes assigned excess room seats)
        for (eid, rid, t_idx), zvar in z.items():
            r_cap = self.rooms_by_id[rid]["capacity"] // 2
            obj_terms.append(r_cap * zvar)

        model.Minimize(sum(obj_terms))

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.num_workers = self.config.num_workers
        solver.parameters.random_seed = self.config.random_seed
        limit = time_limit_override if time_limit_override is not None else self.config.time_limit_seconds
        solver.parameters.max_time_in_seconds = limit

        status = solver.Solve(model)
        if status not in (cp_model.FEASIBLE, cp_model.OPTIMAL):
            raise RuntimeError(f"Exam solver failed to find a feasible solution: status={solver.StatusName(status)}")

        scheduled: list[dict[str, Any]] = []
        for e in self.exams:
            eid = e["id"]
            assigned_t = None
            for t_idx in range(num_slots):
                if solver.Value(y[(eid, t_idx)]) == 1:
                    assigned_t = t_idx
                    break

            if assigned_t is None:
                raise RuntimeError(f"Exam {eid} was not assigned a slot")

            day, sess = slots[assigned_t]
            assigned_rooms = [
                r["id"] for r in exam_rooms
                if solver.Value(z[(eid, r["id"], assigned_t)]) == 1
            ]

            scheduled.append({
                "exam_id": eid,
                "day": day,
                "session": sess,
                "rooms": assigned_rooms,
                "room_ids": assigned_rooms,
            })

        return scheduled

    def solve_naive_round_robin(self) -> list[dict[str, Any]]:
        """Naive baseline scheduling exams across slots sequentially for penalty comparison."""
        scheduled: list[dict[str, Any]] = []
        num_slots = len(self.slots)
        room_usage: set[tuple[str, int]] = set()

        for idx, e in enumerate(self.exams):
            eid = e["id"]
            size = e["size"]
            t_idx = idx % num_slots
            day, sess = self.slots[t_idx]

            # Greedily allocate available rooms
            assigned_rooms: list[str] = []
            seats = 0
            for r in self.exam_rooms:
                rid = r["id"]
                if (rid, t_idx) not in room_usage:
                    assigned_rooms.append(rid)
                    room_usage.add((rid, t_idx))
                    seats += r["capacity"] // 2
                    if seats >= size:
                        break

            scheduled.append({
                "exam_id": eid,
                "day": day,
                "session": sess,
                "rooms": assigned_rooms,
                "room_ids": assigned_rooms,
            })

        return scheduled
