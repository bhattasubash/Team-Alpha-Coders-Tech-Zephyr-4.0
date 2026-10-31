"""Minimal-move CP-SAT reschedule solver for handling disruptions.

Milestone 7 & Fix F1: DISRUPTIONS & RESCHEDULING ENGINE
Lexicographic 3-stage minimal-move solve:
  Stage A: Minimise moved sessions only (no soft terms). Proven minimum is True only if Stage A is OPTIMAL.
  Stage B: Fix moved <= min_moves from Stage A, minimise sessions whose day or start period changed.
  Stage C: Fix both moved and time changes, minimise the soft penalty.

Also computes forced_moves (sessions whose baseline slot is directly invalid after disruption)
and knock_on_moves = moved - forced_moves.
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from ortools.sat.python import cp_model

from app.kernel.context import KernelContext
from app.solver.config import SolverConfig
from app.solver.domain import prune_session_domains


@dataclass
class RescheduleResult:
    """Output from a reschedule solve."""

    status: str  # OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
    assignments: dict[str, tuple[str, int, str]] | None = None
    schedule: dict[str, Any] | None = None
    moved_count: int = 0
    forced_moves: int = 0
    knock_on_moves: int = 0
    time_changed_count: int = 0
    room_only_changed_count: int = 0
    moved_ids: list[str] | None = None
    forced_move_ids: list[str] | None = None
    knock_on_move_ids: list[str] | None = None
    is_proven_minimum: bool = False
    infeasible: bool = False
    conflicts: list[str] | None = None
    solve_time_seconds: float = 0.0


class RescheduleSolver:
    """Solves for minimal schedule disruption moves while maintaining all hard constraints."""

    def __init__(
        self,
        data: dict[str, Any],
        baseline_schedule: dict[str, Any] | dict[str, tuple[str, int, str]],
        config: SolverConfig | None = None,
        blocked_room_slots: set[tuple[str, str, int]] | None = None,
        blocked_group_slots: set[tuple[str, str, int]] | None = None,
    ) -> None:
        """Initialize with disrupted dataset, baseline schedule, solver config, and reservations."""
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

        # Normalize baseline
        if isinstance(baseline_schedule, dict) and "sessions" in baseline_schedule:
            self.baseline: dict[str, tuple[str, int, str]] = {
                s["session_id"]: (s["day"], s["start_period"], s["room_id"])
                for s in baseline_schedule["sessions"]
            }
        else:
            self.baseline = dict(baseline_schedule)  # type: ignore[arg-type]

    def compute_forced_moves(self) -> list[str]:
        """Compute sessions whose baseline slot is directly invalid after the disruption."""
        forced = []
        for sid, triple in self.baseline.items():
            if sid not in self.domains or triple not in self.domains.get(sid, []):
                forced.append(sid)
        return sorted(forced)

    def _build_stage_model(
        self,
        max_moves: int | None = None,
        max_time_changes: int | None = None,
        hint_assignments: dict[str, tuple[str, int, str]] | None = None,
    ):
        """Construct the CP-SAT model for a reschedule stage."""
        model = cp_model.CpModel()
        x: dict[tuple[str, str, int, str], cp_model.IntVar] = {}

        # 1. Exactly one assignment per session
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

        # 3. Room non-overlap
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

        # Enforce reserved room slots for bookings
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

        # 5. Group non-overlap with basket deduplication
        grp_period_vars: dict[tuple[str, str, int], list[cp_model.IntVar]] = defaultdict(list)
        for s in self.data["sessions"]:
            if not s.get("basket_slot"):
                sid = s["id"]
                dur = s["duration"]
                for g in s["groups"]:
                    for d, t, r in self.domains[sid]:
                        var = x[(sid, d, t, r)]
                        for p in range(t, t + dur):
                            grp_period_vars[(g, d, p)].append(var)
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

        # 6. Moved and time changed tracking
        moved_var_map: dict[str, cp_model.IntVar] = {}
        time_changed_var_map: dict[str, cp_model.IntVar] = {}

        for s in self.data["sessions"]:
            sid = s["id"]
            if sid in self.baseline:
                base_d, base_t, base_r = self.baseline[sid]
                moved = model.NewBoolVar(f"moved_{sid}")
                time_changed = model.NewBoolVar(f"tc_{sid}")
                moved_var_map[sid] = moved
                time_changed_var_map[sid] = time_changed

                if (sid, base_d, base_t, base_r) in x:
                    model.Add(x[(sid, base_d, base_t, base_r)] + moved == 1)
                else:
                    model.Add(moved == 1)

                same_dt_vars = [
                    x[(sid, d, t, r)]
                    for d, t, r in self.domains[sid]
                    if d == base_d and t == base_t
                ]
                if same_dt_vars:
                    model.Add(sum(same_dt_vars) + time_changed == 1)
                else:
                    model.Add(time_changed == 1)

        # Apply bounds from prior stages
        if max_moves is not None:
            model.Add(sum(moved_var_map.values()) <= max_moves)
        if max_time_changes is not None:
            model.Add(sum(time_changed_var_map.values()) <= max_time_changes)

        # Warm start / hints
        seed_assign = hint_assignments or self.baseline
        if seed_assign:
            for sid, triple in seed_assign.items():
                d, t, r = triple
                if (sid, d, t, r) in x:
                    model.AddHint(x[(sid, d, t, r)], 1)

        return model, x, b_var, basket_sessions, grp_period_vars, moved_var_map, time_changed_var_map

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

        # S1, S5, S6
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

                # S1: faculty preference avoidance
                for pref in fac_prefs:
                    if pref.get("type") == "avoid" and d in pref.get("days", days):
                        cost += self.config.s1_faculty_avoid_weight * sum(1 for p in per if p in pref["periods"])

                # S5: room underutilization (< 40%)
                cap = self.ctx.rooms[r]["capacity"]
                if cap and size / cap < 0.4:
                    cost += self.config.s5_room_underutilized_weight

                # S6: last teaching period P9
                if 9 in per:
                    cost += self.config.s6_p9_session_weight

                if cost > 0:
                    obj_terms.append(cost * var)

        # S3: group overload (> 6 hours per day)
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

        # S4: same course non-basket lectures
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

        # S4: basket lectures of same course twice in a day
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

        # S2: group gaps
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

    def solve(
        self,
        time_limit_override: float | None = None,
    ) -> RescheduleResult:
        """Solve lexicographically in 3 stages:
        Stage A: Minimise moved sessions only (no soft terms).
        Stage B: Fix moved <= min_moves, minimise time changes.
        Stage C: Fix both, minimise soft penalty.
        """
        start_time = time.time()
        total_limit = time_limit_override if time_limit_override is not None else self.config.time_limit_seconds

        # Check for empty domains immediately
        empty_domain_sessions = [
            s["id"] for s in self.data["sessions"]
            if not self.domains.get(s["id"])
        ]
        if empty_domain_sessions:
            conflicts = []
            for sid in empty_domain_sessions:
                s = self.ctx.sessions[sid]
                fid = s["faculty_id"]
                rtypes = s["room_types"]
                conflicts.append(
                    f"Session {sid} has 0 legal slots (Faculty {fid}, Room types {rtypes})"
                )
            return RescheduleResult(
                status="INFEASIBLE",
                infeasible=True,
                conflicts=conflicts,
                solve_time_seconds=time.time() - start_time,
            )

        forced_move_ids = self.compute_forced_moves()
        forced_moves_count = len(forced_move_ids)

        def read_assignment(solver: cp_model.CpSolver, x_vars: dict) -> dict[str, tuple[str, int, str]]:
            assign: dict[str, tuple[str, int, str]] = {}
            for s in self.data["sessions"]:
                sid = s["id"]
                for d, t, r in self.domains[sid]:
                    if solver.Value(x_vars[(sid, d, t, r)]) == 1:
                        assign[sid] = (d, t, r)
                        break
            return assign

        # =====================================================================
        # STAGE A: Minimise moved sessions only (no soft terms)
        # =====================================================================
        model_a, x_a, _, _, _, moved_a, time_a = self._build_stage_model()
        model_a.Minimize(sum(moved_a.values()))

        solver_a = cp_model.CpSolver()
        solver_a.parameters.symmetry_level = 0
        solver_a.parameters.num_workers = self.config.num_workers
        solver_a.parameters.random_seed = self.config.random_seed
        limit_a = max(10.0, total_limit - 12.0)
        solver_a.parameters.max_time_in_seconds = limit_a

        status_code_a = solver_a.Solve(model_a)
        if status_code_a not in (cp_model.FEASIBLE, cp_model.OPTIMAL):
            return RescheduleResult(
                status=solver_a.StatusName(status_code_a),
                infeasible=True,
                conflicts=["Hard constraints cannot be simultaneously satisfied."],
                solve_time_seconds=time.time() - start_time,
            )

        proven_minimum = (status_code_a == cp_model.OPTIMAL)
        min_moves = int(solver_a.ObjectiveValue())
        assign_a = read_assignment(solver_a, x_a)

        elapsed = time.time() - start_time
        remaining_time = max(1.0, total_limit - elapsed)

        # =====================================================================
        # STAGE B: Fix moved <= min_moves, minimise time changes
        # =====================================================================
        model_b, x_b, _, _, _, moved_b, time_b = self._build_stage_model(
            max_moves=min_moves,
            hint_assignments=assign_a,
        )
        model_b.Minimize(sum(time_b.values()))

        solver_b = cp_model.CpSolver()
        solver_b.parameters.symmetry_level = 0
        solver_b.parameters.num_workers = self.config.num_workers
        solver_b.parameters.random_seed = self.config.random_seed
        limit_b = max(3.0, min(remaining_time * 0.4, 15.0))
        solver_b.parameters.max_time_in_seconds = limit_b

        status_code_b = solver_b.Solve(model_b)
        if status_code_b in (cp_model.FEASIBLE, cp_model.OPTIMAL):
            min_time_changes = int(solver_b.ObjectiveValue())
            assign_b = read_assignment(solver_b, x_b)
        else:
            min_time_changes = sum(solver_a.Value(tc) for tc in time_a.values())
            assign_b = assign_a

        elapsed = time.time() - start_time
        remaining_time = max(1.0, total_limit - elapsed)

        # =====================================================================
        # STAGE C: Fix both, minimise soft penalty
        # =====================================================================
        model_c, x_c, b_var_c, baskets_c, grp_c, moved_c, time_c = self._build_stage_model(
            max_moves=min_moves,
            max_time_changes=min_time_changes,
            hint_assignments=assign_b,
        )
        self._add_soft_objective(model_c, x_c, b_var_c, baskets_c, grp_c)

        solver_c = cp_model.CpSolver()
        solver_c.parameters.symmetry_level = 0
        solver_c.parameters.num_workers = self.config.num_workers
        solver_c.parameters.random_seed = self.config.random_seed
        solver_c.parameters.max_time_in_seconds = remaining_time

        status_code_c = solver_c.Solve(model_c)
        if status_code_c in (cp_model.FEASIBLE, cp_model.OPTIMAL):
            final_assign = read_assignment(solver_c, x_c)
            final_status = solver_c.StatusName(status_code_c)
        else:
            final_assign = assign_b
            final_status = solver_b.StatusName(status_code_b) if status_code_b in (cp_model.OPTIMAL, cp_model.FEASIBLE) else solver_a.StatusName(status_code_a)

        # Calculate final diff metrics
        moved_ids = sorted([
            sid for sid in self.baseline
            if sid in final_assign and final_assign[sid] != self.baseline[sid]
        ])
        moved_count = len(moved_ids)
        knock_on_move_ids = sorted([sid for sid in moved_ids if sid not in forced_move_ids])
        knock_on_moves = len(knock_on_move_ids)
        time_changed_count = sum(
            1 for sid in moved_ids
            if final_assign[sid][:2] != self.baseline[sid][:2]
        )
        room_only_count = moved_count - time_changed_count

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
                for sid, (d, t, r) in final_assign.items()
            ],
        }

        return RescheduleResult(
            status=final_status,
            assignments=final_assign,
            schedule=schedule,
            moved_count=moved_count,
            forced_moves=forced_moves_count,
            knock_on_moves=knock_on_moves,
            time_changed_count=time_changed_count,
            room_only_changed_count=room_only_count,
            moved_ids=moved_ids,
            forced_move_ids=forced_move_ids,
            knock_on_move_ids=knock_on_move_ids,
            is_proven_minimum=proven_minimum,
            infeasible=False,
            solve_time_seconds=time.time() - start_time,
        )
