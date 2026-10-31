"""Differential fuzzing for the scheduling kernel against the official validator.

Runs 2000 random schedule mutations against both the official validator and the
kernel validate_schedule function, requiring identical hard_by_rule and soft_total.
"""

from __future__ import annotations

import copy
import json
import random
import sys
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))
sys.path.insert(0, str(ROOT_DIR))

import validator.validator as official_validator  # noqa: E402
from app.kernel.validate import validate_schedule  # noqa: E402

DATA_PATH = ROOT_DIR / "data" / "cit_public.json"
EXPORTS_PATH = ROOT_DIR / "exports" / "schedule.json"
EXAMPLE_PATH = ROOT_DIR / "CrunchWeek_StarterPack" / "examples" / "schedule.example.json"
REPORT_PATH = ROOT_DIR / "docs" / "fuzz-report.md"

DEFAULT_CASES = 2000
RANDOM_SEED = 42


def load_json(path: Path) -> dict[str, Any]:
    """Load JSON from disk."""
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_handcrafted_valid_subset(data: dict[str, Any]) -> dict[str, Any]:
    """Build a minimal valid schedule subset in memory for fuzzing baseline."""
    days = data["calendar"]["days"]
    rooms = [r["id"] for r in data["rooms"] if "lecture" in r["allowed_uses"]]
    sessions = []
    # Place first 10 sessions cleanly without conflicts
    for idx, s in enumerate(data["sessions"][:10]):
        sessions.append({
            "session_id": s["id"],
            "day": days[idx % len(days)],
            "start_period": (idx % 3) * 2 + 1,
            "room_id": rooms[idx % len(rooms)],
        })
    # Add valid exams
    exams = []
    exam_rooms = [r["id"] for r in data["rooms"] if "exam" in r["allowed_uses"]]
    cal_exam = data["calendar"]["exam_week"]
    for idx, e in enumerate(data.get("exams", [])[:4]):
        exams.append({
            "exam_id": e["id"],
            "day": cal_exam["days"][idx % len(cal_exam["days"])],
            "session": cal_exam["sessions"][idx % len(cal_exam["sessions"])]["id"],
            "rooms": [exam_rooms[idx % len(exam_rooms)]],
        })
    # Add fest week bookings
    bookings = []
    for idx, b in enumerate(data.get("booking_requests", [])[:4]):
        if b["id"] in [c["request_id"] for c in data.get("cancellations", [])]:
            bookings.append({"request_id": b["id"], "status": "rejected", "reason": "Withdrawn by requester"})
        else:
            w = b["windows"][0]
            bookings.append({
                "request_id": b["id"],
                "status": "approved",
                "day": w["day"],
                "start_period": w["from_period"],
                "end_period": w["from_period"] + b["duration_periods"] - 1,
                "room_id": data["rooms"][0]["id"],
                "reason": "approved for demo",
            })

    return {
        "dataset_id": data.get("dataset_id"),
        "team": "Fuzz Seed",
        "sessions": sessions,
        "exams": exams,
        "fest_week": {
            "bookings": bookings,
            "session_overrides": [],
        },
    }


def mutate(sched: dict[str, Any], data: dict[str, Any]) -> str:
    """Apply a random mutation to the schedule in place and return mutation description."""
    mutation_types = [
        "move_session",
        "swap_rooms",
        "swap_times",
        "change_basket",
        "delete_session",
        "duplicate_session",
        "change_booking_status",
        "move_booking",
        "move_exam",
        "duplicate_exam",
        "delete_exam",
    ]
    m_type = random.choice(mutation_types)
    days = data["calendar"]["days"]
    rooms = [r["id"] for r in data["rooms"]]

    sessions = sched.get("sessions", [])
    exams = sched.get("exams", [])
    bookings = sched.get("fest_week", {}).get("bookings", [])

    if m_type == "move_session" and sessions:
        s = random.choice(sessions)
        s["day"] = random.choice(days)
        s["start_period"] = random.randint(1, 9)
        s["room_id"] = random.choice(rooms)
        return f"move_session {s['session_id']} to {s['day']} P{s['start_period']} {s['room_id']}"

    elif m_type == "swap_rooms" and len(sessions) >= 2:
        s1, s2 = random.sample(sessions, 2)
        s1["room_id"], s2["room_id"] = s2["room_id"], s1["room_id"]
        return f"swap_rooms between {s1['session_id']} and {s2['session_id']}"

    elif m_type == "swap_times" and len(sessions) >= 2:
        s1, s2 = random.sample(sessions, 2)
        s1["day"], s2["day"] = s2["day"], s1["day"]
        s1["start_period"], s2["start_period"] = s2["start_period"], s1["start_period"]
        return f"swap_times between {s1['session_id']} and {s2['session_id']}"

    elif m_type == "change_basket" and sessions:
        # Find session with basket slot in dataset
        basket_sids = [s["id"] for s in data["sessions"] if s.get("basket_slot")]
        matches = [s for s in sessions if s["session_id"] in basket_sids]
        if matches:
            s = random.choice(matches)
            s["day"] = random.choice(days)
            s["start_period"] = random.randint(1, 9)
            return f"change_basket {s['session_id']}"

    elif m_type == "delete_session" and len(sessions) > 1:
        idx = random.randrange(len(sessions))
        removed = sessions.pop(idx)
        return f"delete_session {removed.get('session_id')}"

    elif m_type == "duplicate_session" and sessions:
        s = copy.deepcopy(random.choice(sessions))
        sessions.append(s)
        return f"duplicate_session {s.get('session_id')}"

    elif m_type == "change_booking_status" and bookings:
        b = random.choice(bookings)
        b["status"] = random.choice(["approved", "rejected", "alternative_offered", "unknown_st"])
        b["reason"] = "mutated status"
        return f"change_booking_status {b.get('request_id')} -> {b['status']}"

    elif m_type == "move_booking" and bookings:
        b = random.choice(bookings)
        b["day"] = random.choice(days)
        b["start_period"] = random.randint(1, 12)
        b["end_period"] = b["start_period"] + random.randint(1, 3)
        b["room_id"] = random.choice(rooms)
        return f"move_booking {b.get('request_id')}"

    elif m_type == "move_exam" and exams:
        e = random.choice(exams)
        cal = data["calendar"]["exam_week"]
        e["day"] = random.choice(cal["days"])
        e["session"] = random.choice(cal["sessions"])["id"]
        e["rooms"] = [random.choice(rooms)]
        return f"move_exam {e.get('exam_id')}"

    elif m_type == "duplicate_exam" and exams:
        e = copy.deepcopy(random.choice(exams))
        exams.append(e)
        return f"duplicate_exam {e.get('exam_id')}"

    elif m_type == "delete_exam" and len(exams) > 1:
        idx = random.randrange(len(exams))
        removed = exams.pop(idx)
        return f"delete_exam {removed.get('exam_id')}"

    # Default fallback
    if sessions:
        s = random.choice(sessions)
        s["start_period"] = (s["start_period"] % 9) + 1
        return f"fallback_move {s['session_id']}"
    return "no_op"


def run_fuzz(total_cases: int = DEFAULT_CASES, seed: int = RANDOM_SEED) -> tuple[int, list[dict[str, Any]]]:
    """Run differential fuzzing and return (cases_run, mismatches_list)."""
    random.seed(seed)
    data = load_json(DATA_PATH)

    # Base schedule sources
    seeds = []
    if EXPORTS_PATH.exists():
        seeds.append(load_json(EXPORTS_PATH))
    if EXAMPLE_PATH.exists():
        seeds.append(load_json(EXAMPLE_PATH))
    seeds.append(build_handcrafted_valid_subset(data))

    mismatches: list[dict[str, Any]] = []

    print(f"Starting differential fuzzing: {total_cases} cases, seed={seed}")
    for i in range(total_cases):
        base_sched = copy.deepcopy(seeds[i % len(seeds)])
        # Apply 1 to 3 random mutations
        applied = []
        for _ in range(random.randint(1, 3)):
            desc = mutate(base_sched, data)
            applied.append(desc)

        # Run both validators
        ker_rep = validate_schedule(data, base_sched)
        val_rep = official_validator.run(data, base_sched)

        # Compare results
        k_hard = ker_rep["hard_by_rule"]
        v_hard = val_rep["hard_by_rule"]
        k_soft = ker_rep["soft_total"]
        v_soft = val_rep["soft_total"]
        k_count = ker_rep["hard_violation_count"]
        v_count = val_rep["hard_violation_count"]

        diffs = []
        if k_hard != v_hard:
            diffs.append(f"hard_by_rule mismatch: kernel={k_hard} vs validator={v_hard}")
        if k_soft != v_soft:
            diffs.append(f"soft_total mismatch: kernel={k_soft} vs validator={v_soft}")
        if k_count != v_count:
            diffs.append(f"hard_violation_count mismatch: kernel={k_count} vs validator={v_count}")

        if "bookings" in val_rep and "bookings" in ker_rep:
            kb = ker_rep["bookings"]
            vb = val_rep["bookings"]
            if kb["booking_score"] != vb["booking_score"]:
                diffs.append(f"booking_score mismatch: kernel={kb['booking_score']} vs validator={vb['booking_score']}")
            if len(kb["priority_inversions"]) != len(vb["priority_inversions"]):
                diffs.append(
                    f"priority_inversions count mismatch: kernel={len(kb['priority_inversions'])} vs validator={len(vb['priority_inversions'])}"
                )

        if "exam_soft_penalty" in val_rep:
            if ker_rep.get("exam_soft_penalty", 0) != val_rep.get("exam_soft_penalty", 0):
                diffs.append(
                    f"exam_soft_penalty mismatch: kernel={ker_rep.get('exam_soft_penalty')} vs validator={val_rep.get('exam_soft_penalty')}"
                )

        if diffs:
            mismatches.append({
                "iteration": i,
                "mutations": applied,
                "diffs": diffs,
            })
            if len(mismatches) <= 5:
                print(f"  MISMATCH at case {i}: {', '.join(applied)}")
                for d in diffs:
                    print(f"    - {d}")

        if (i + 1) % 500 == 0 or (i + 1) == total_cases:
            print(f"Progress: {i + 1}/{total_cases} completed ({len(mismatches)} mismatches)")

    return total_cases, mismatches


def write_report(cases_run: int, mismatches: list[dict[str, Any]]) -> None:
    """Write docs/fuzz-report.md."""
    lines = [
        "# Differential fuzzing report",
        "",
        "## Summary",
        f"- Target iterations: {cases_run}",
        f"- Total cases executed: {cases_run}",
        f"- Mismatches detected: {len(mismatches)}",
        f"- Agreement rate: {((cases_run - len(mismatches)) / cases_run) * 100:.2f}%",
        "",
        "## Mutation types tested",
        "- `move_session`: moves session day, period, or room",
        "- `swap_rooms`: swaps room assignments between two sessions",
        "- `swap_times`: swaps time slots between two sessions",
        "- `change_basket`: desynchronizes parallel basket slot sessions",
        "- `delete_session`: removes sessions to trigger H1 unscheduled",
        "- `duplicate_session`: duplicates session IDs in schedule",
        "- `change_booking_status`: mutates booking statuses (approved, rejected, alternative, unknown)",
        "- `move_booking`: mutates booking days, periods, and rooms",
        "- `move_exam`: alters exam days, sessions, and room assignments",
        "- `duplicate_exam`: duplicates exam IDs in schedule",
        "- `delete_exam`: removes exams to trigger E1 unscheduled",
        "",
        "## Outcome",
    ]
    if not mismatches:
        lines.append("Parity achieved. All 2000 mutated cases yielded identical hard_by_rule and soft_total results.")
    else:
        lines.append(f"Encountered {len(mismatches)} mismatches. See BUGS.md for triage.")
        lines.append("")
        lines.append("### Sample mismatches")
        for m in mismatches[:10]:
            lines.append(f"- Case {m['iteration']}: {', '.join(m['mutations'])}")
            for d in m['diffs']:
                lines.append(f"  - {d}")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Wrote report to {REPORT_PATH}")


def main():
    cases = DEFAULT_CASES
    if len(sys.argv) > 1:
        try:
            cases = int(sys.argv[1])
        except ValueError:
            pass

    cases_run, mismatches = run_fuzz(total_cases=cases)
    write_report(cases_run, mismatches)

    if mismatches:
        print(f"Fuzz test failed with {len(mismatches)} mismatches.")
        sys.exit(1)
    else:
        print("Fuzz test passed: 0 mismatches across all 2000 cases.")
        sys.exit(0)


if __name__ == "__main__":
    main()
