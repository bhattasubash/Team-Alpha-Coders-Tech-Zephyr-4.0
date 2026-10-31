"""CP-SAT solver for baseline timetable generation and rescheduling.

Formulation:
- Boolean decision variables x[s, d, t, r] over pruned legal domains.
- Basket slot synchronization: single (day, start_period) choice per basket slot.
- Non-overlap: at most one session per (room, day, period).
- Faculty constraints: at most one session per (faculty, day, period) and daily hours cap.
- Student group constraints: at most one event per (group, day, period) with basket deduplication.
- Two-phase solve: feasibility first, then soft objective optimization using feasibility as hint.
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from ortools.sat.python import cp_model

from app.kernel.context import KernelContext
from app.kernel.validate import soft_score
from app.solver.config import SolverConfig
from app.solver.domain import prune_session_domains


@dataclass
class SolverResult:
    """Output from a solver run."""

    status: str  # OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
    assignments: dict[str, tuple[str, int, str]] | None = None
    schedule: dict[str, Any] | None = None
    soft_penalty: int = 0
    soft_penalties: dict[str, int] | None = None
    solve_time_seconds: float = 0.0
    is_proven_optimal: bool = False


class TimetableSolver:
    """Builds and solves the CP-SAT model for CIT scheduling."""

    def __init__(
        self,
        data: dict[str, Any],
        config: SolverConfig | None = None,
        blocked_room_slots: set[tuple[str, str, int]] | None = None,
        blocked_group_slots: set[tuple[str, str, int]] | None = None,
    ) -> None:
        """Store dataset, solver configuration, and optional booking reservations."""
        self.data = data
        self.config = config or SolverConfig()
        self.ctx = KernelContext(data)
        self.blocked_room_slots: set[tuple[str, str, int]] = set(blocked_room_slots or set())
        self.blocked_group_slots: set[tuple[str, str, int]] = set(blocked_group_slots or set())
        self.domains = prune_session_domains(
            data,
            self.ctx,
            blocked_room_slots=self.blocked_room_slots,
            blocked_group_slots=self.blocked_group_slots,
        )

    def solve_initial(
        self,
        include_soft_objective: bool = False,
        hint_assignments: dict[str, tuple[str, int, str]] | None = None,
        time_limit_override: float | None = None,
    ) -> SolverResult:
        """Solve CP-SAT model for timetable.

        include_soft_objective=False: feasibility only (Phase 3A).
        include_soft_objective=True: full soft objective minimization (Phase 3B).
        """
        model = cp_model.CpModel()
        x: dict[tuple[str, str, int, str], cp_model.IntVar] = {}

        # 1. Exactly one placement per session from pruned domain
        for s in self.data["sessions"]:
            sid = s["id"]
            for d, t, r in self.domains[sid]:
                x[(sid, d, t, r)] = model.NewBoolVar(f"x_{sid}_{d}_{t}_{r}")
            model.AddExactlyOne(x[(sid, d, t, r)] for d, t, r in self.domains[sid])

        # 2. Basket synchronization
        basket_sessions: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for s in self.data["sessions"]:
            if s.get("basket_slot"):
                basket_sessions[s["basket_slot"]].append(s)

        b_var: dict[tuple[str, str, int], cp_model.IntVar] = {}
        for b_id, s_list in basket_sessions.items():
            all_dt: set[tuple[str, int]] = set()
            for s in s_list:
                all_dt.update((d, t) for d, t, r in self.domains[s["id"]])

            for d, t in all_dt:
                b_var[(b_id, d, t)] = model.NewBoolVar(f"b_{b_id}_{d}_{t}")
            model.AddExactlyOne(b_var[(b_id, d, t)] for d, t in all_dt)

            for s in s_list:
                for d, t in all_dt:
                    s_dt_vars = [
                        x[(s["id"], d_, t_, r)]
                        for d_, t_, r in self.domains[s["id"]]
                        if d_ == d and t_ == t
                    ]
                    if s_dt_vars:
                        model.Add(sum(s_dt_vars) == b_var[(b_id, d, t)])
                    else:
                        model.Add(b_var[(b_id, d, t)] == 0)

        # 3. Room non-overlap (at most one use per room, day, period)
        room_period_vars: dict[tuple[str, str, int], list[cp_model.IntVar]] = defaultdict(list)
        for s in self.data["sessions"]:
            sid = s["id"]
            dur = s["duration"]
            for d, t, r in self.domains[sid]:
                for p in range(t, t + dur):
                    room_period_vars[(r, d, p)].append(x[(sid, d, t, r)])

        for k, v in room_period_vars.items():
            if len(v) > 1:
                model.Add(sum(v) <= 1)

        # Enforce reserved room slots for bookings (BR-01..BR-25)
        for r_slot in self.blocked_room_slots:
            if r_slot in room_period_vars and room_period_vars[r_slot]:
                model.Add(sum(room_period_vars[r_slot]) == 0)

        # 4. Faculty non-overlap and daily hours limit
        fac_period_vars: dict[tuple[str, str, int], list[cp_model.IntVar]] = defaultdict(list)
        fac_day_terms: dict[tuple[str, str], list[Any]] = defaultdict(list)
        for s in self.data["sessions"]:
            sid = s["id"]
            dur = s["duration"]
            fid = s["faculty_id"]
            for d, t, r in self.domains[sid]:
                var = x[(sid, d, t, r)]
                for p in range(t, t + dur):
                    fac_period_vars[(fid, d, p)].append(var)
                fac_day_terms[(fid, d)].append(dur * var)

        for k, v in fac_period_vars.items():
            if len(v) > 1:
                model.Add(sum(v) <= 1)

        fac_dict = {f["id"]: f for f in self.data["faculty"]}
        for (fid, d), terms in fac_day_terms.items():
            max_h = fac_dict[fid].get("max_hours_per_day", 4)
            model.Add(sum(terms) <= max_h)

        # 5. Student group non-overlap (at most one event per group, day, period)
        grp_period_vars: dict[tuple[str, str, int], list[cp_model.IntVar]] = defaultdict(list)
        # Non-basket sessions
        for s in self.data["sessions"]:
            if not s.get("basket_slot"):
                sid = s["id"]
                dur = s["duration"]
                for g in s["groups"]:
                    for d, t, r in self.domains[sid]:
                        var = x[(sid, d, t, r)]
                        for p in range(t, t + dur):
                            grp_period_vars[(g, d, p)].append(var)

        # Basket slots
        for b_id, s_list in basket_sessions.items():
            dur = s_list[0]["duration"]
            b_groups: set[str] = set()
            for s in s_list:
                b_groups.update(s["groups"])

            for (b_, d, t), bvar in b_var.items():
                if b_ == b_id:
                    for g in b_groups:
                        for p in range(t, t + dur):
                            grp_period_vars[(g, d, p)].append(bvar)

        for k, v in grp_period_vars.items():
            if len(v) > 1:
                model.Add(sum(v) <= 1)

        # Enforce reserved mandatory group slots for bookings
        for g_slot in self.blocked_group_slots:
            if g_slot in grp_period_vars and grp_period_vars[g_slot]:
                model.Add(sum(grp_period_vars[g_slot]) == 0)

        # 6. Optional soft objective
        if include_soft_objective:
            self._add_soft_objective(model, x, b_var, basket_sessions, grp_period_vars)

        # 7. Add solution hint if provided
        if hint_assignments is not None:
            for sid, (d, t, r) in hint_assignments.items():
                if (sid, d, t, r) in x:
                    model.AddHint(x[(sid, d, t, r)], 1)

        # 8. Solver configuration
        solver = cp_model.CpSolver()
        solver.parameters.symmetry_level = 0
        solver.parameters.num_workers = self.config.num_workers
        solver.parameters.random_seed = self.config.random_seed
        limit = time_limit_override if time_limit_override is not None else self.config.time_limit_seconds
        solver.parameters.max_time_in_seconds = limit

        t0 = time.time()
        status_code = solver.Solve(model)
        solve_time = time.time() - t0
        status_name = solver.StatusName(status_code)

        if status_code in (cp_model.FEASIBLE, cp_model.OPTIMAL):
            assign: dict[str, tuple[str, int, str]] = {}
            for s in self.data["sessions"]:
                sid = s["id"]
                for d, t, r in self.domains[sid]:
                    if solver.Value(x[(sid, d, t, r)]) == 1:
                        assign[sid] = (d, t, r)
                        break

            soft_dict, total_soft = soft_score(self.ctx, assign)

            schedule = {
                "dataset_id": self.data.get("dataset_id"),
                "team": "CIT Scheduler",
                "sessions": [
                    {
                        "session_id": sid,
                        "day": d,
                        "start_period": t,
                        "room_id": r,
                    }
                    for sid, (d, t, r) in assign.items()
                ],
            }
            return SolverResult(
                status=status_name,
                assignments=assign,
                schedule=schedule,
                soft_penalty=total_soft,
                soft_penalties=soft_dict,
                solve_time_seconds=solve_time,
                is_proven_optimal=(status_code == cp_model.OPTIMAL),
            )

        return SolverResult(
            status=status_name,
            assignments=None,
            schedule=None,
            solve_time_seconds=solve_time,
        )

    def _add_soft_objective(
        self,
        model: cp_model.CpModel,
        x: dict[tuple[str, str, int, str], cp_model.IntVar],
        b_var: dict[tuple[str, str, int], cp_model.IntVar],
        basket_sessions: dict[str, list[dict[str, Any]]],
        grp_period_vars: dict[tuple[str, str, int], list[cp_model.IntVar]],
    ) -> None:
        """Add S1 through S6 soft objective terms mirroring validator soft scoring."""
        obj_terms: list[Any] = []
        days = self.ctx.days
        fac_dict = self.ctx.fac

        # S1, S5, S6 on session variables
        for s in self.data["sessions"]:
            sid = s["id"]
            dur = s["duration"]
            fid = s["faculty_id"]
            size = s["size"]
            fac_prefs = fac_dict.get(fid, {}).get("preferences", [])
            for d, t, r in self.domains[sid]:
                var = x[(sid, d, t, r)]
                cost = 0
                per = list(range(t, t + dur))

                # S1: faculty preference avoidance (weight: 2)
                for pref in fac_prefs:
                    if pref.get("type") == "avoid" and d in pref.get("days", days):
                        cost += self.config.s1_faculty_avoid_weight * sum(1 for p in per if p in pref["periods"])

                # S5: room underutilization (< 40%) (weight: 1)
                cap = self.ctx.rooms[r]["capacity"]
                if cap and size / cap < 0.4:
                    cost += self.config.s5_room_underutilized_weight

                # S6: last teaching period P9 (weight: 1)
                if 9 in per:
                    cost += self.config.s6_p9_session_weight

                if cost > 0:
                    obj_terms.append(cost * var)

        # S3: group overload (> 6 hours per day, weight: 3)
        for g in self.ctx.groups:
            for d in days:
                dur_terms: list[Any] = []
                for s in self.data["sessions"]:
                    if not s.get("basket_slot") and g in s["groups"]:
                        for d_, t, r in self.domains[s["id"]]:
                            if d_ == d:
                                dur_terms.append(s["duration"] * x[(s["id"], d, t, r)])
                for b_id, s_list in basket_sessions.items():
                    b_groups = set()
                    for s in s_list:
                        b_groups.update(s["groups"])
                    if g in b_groups:
                        dur = s_list[0]["duration"]
                        for (b_, d_, t), bvar in b_var.items():
                            if b_ == b_id and d_ == d:
                                dur_terms.append(dur * bvar)
                overload = model.NewIntVar(0, 9, f"overload_{g}_{d}")
                model.Add(overload >= sum(dur_terms) - 6)
                obj_terms.append(self.config.s3_group_overload_weight * overload)

        # S4: same course non-basket lectures (weight: 3)
        for g in self.ctx.groups:
            for d in days:
                for c in self.data["courses"]:
                    cid = c["id"]
                    c_lectures = [
                        s["id"]
                        for s in self.data["sessions"]
                        if s["kind"] == "lecture"
                        and not s.get("basket_slot")
                        and s["course_id"] == cid
                        and g in s["groups"]
                    ]
                    if len(c_lectures) > 1:
                        c_vars: list[Any] = []
                        for sid in c_lectures:
                            for d_, t, r in self.domains[sid]:
                                if d_ == d:
                                    c_vars.append(x[(sid, d, t, r)])
                        extra = model.NewIntVar(0, len(c_lectures), f"extra_{g}_{d}_{cid}")
                        model.Add(extra >= sum(c_vars) - 1)
                        obj_terms.append(self.config.s4_same_course_weight * extra)

        # S4: basket lectures of same course twice in a day (weight: 3)
        for d in days:
            for c in self.data["courses"]:
                cid = c["id"]
                bc_sessions = [
                    s["id"]
                    for s in self.data["sessions"]
                    if s.get("basket_slot") and s["course_id"] == cid
                ]
                if len(bc_sessions) > 1:
                    bc_vars: list[Any] = []
                    for sid in bc_sessions:
                        for d_, t, r in self.domains[sid]:
                            if d_ == d:
                                bc_vars.append(x[(sid, d, t, r)])
                    extra_b = model.NewIntVar(0, len(bc_sessions), f"extra_b_{d}_{cid}")
                    model.Add(extra_b >= sum(bc_vars) - 1)
                    obj_terms.append(self.config.s4_same_course_weight * extra_b)

        # S2: group gaps (weight: 1)
        for g in self.ctx.groups:
            for d in days:
                occ: dict[int, Any] = {}
                for p in range(1, 10):
                    vars_p = grp_period_vars.get((g, d, p), [])
                    occ[p] = sum(vars_p)
                has_before: dict[int, cp_model.IntVar] = {}
                for p in range(1, 10):
                    has_before[p] = model.NewBoolVar(f"hb_{g}_{d}_{p}")
                    if p == 1:
                        model.Add(has_before[p] == occ[1])
                    else:
                        model.AddMaxEquality(has_before[p], [has_before[p - 1], occ[p]])
                has_after: dict[int, cp_model.IntVar] = {}
                for p in range(9, 0, -1):
                    has_after[p] = model.NewBoolVar(f"ha_{g}_{d}_{p}")
                    if p == 9:
                        model.Add(has_after[p] == occ[9])
                    else:
                        model.AddMaxEquality(has_after[p], [has_after[p + 1], occ[p]])
                for p in range(1, 10):
                    gap = model.NewIntVar(0, 1, f"gap_{g}_{d}_{p}")
                    model.Add(gap >= has_before[p] + has_after[p] - 1 - occ[p])
                    obj_terms.append(self.config.s2_group_gap_weight * gap)

        model.Minimize(sum(obj_terms))

    def solve_two_phase(
        self,
        feasibility_limit: float = 35.0,
        optimize_limit: float = 30.0,
        hint_assignments: dict[str, tuple[str, int, str]] | None = None,
    ) -> SolverResult:
        """Two-phase solve: feasibility first, then improve using it as a hint."""
        p1_res = None
        if hint_assignments is None:
            # Phase 1: Feasibility solve
            p1_res = self.solve_initial(
                include_soft_objective=False,
                time_limit_override=feasibility_limit,
            )
            if p1_res.assignments is None:
                return p1_res
            hint = p1_res.assignments
        else:
            hint = hint_assignments

        # Phase 2: Soft optimization with hint
        p2_res = self.solve_initial(
            include_soft_objective=True,
            hint_assignments=hint,
            time_limit_override=optimize_limit,
        )
        if p2_res.assignments is not None:
            return p2_res
        if p1_res is not None:
            return p1_res
        return p2_res
