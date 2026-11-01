"""
Parity test between placement checker (ExplainEngine.what_blocks / legal-slots)
and the official validator.
Requirement C1: 1500 random single session moves, legal must equal zero new hard violations.
"""
import sys
import json
import random
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))
sys.path.insert(0, str(ROOT_DIR))

import validator.validator as official_validator
from app.explain.engine import ExplainEngine
from app.kernel.context import KernelContext

def main():
    with open(ROOT_DIR / "data" / "cit_public.json", encoding="utf-8") as f:
        data = json.load(f)
    with open(ROOT_DIR / "exports" / "schedule.json", encoding="utf-8") as f:
        base_sched = json.load(f)

    # Baseline check
    base_report = official_validator.run(data, base_sched)
    base_hard = len(base_report.get("hard_violations", []))
    print(f"Baseline schedule hard violations: {base_hard}")
    assert base_hard == 0, "Baseline must have 0 hard violations"

    explainer = ExplainEngine(data, base_sched)
    ctx = KernelContext(data)
    
    sessions = base_sched["sessions"]
    days = data["calendar"]["days"]
    periods = list(range(1, 10))
    rooms = [r["id"] for r in data["rooms"]]

    random.seed(42)
    trials = 1500
    
    false_positives = [] # marked legal, but validator has hard violations
    false_negatives = [] # marked illegal, but validator has 0 hard violations
    legal_count = 0
    illegal_count = 0

    print(f"Running {trials} random single session move tests...")
    start_time = time.time()

    for i in range(trials):
        # Pick a random session
        s_idx = random.randint(0, len(sessions) - 1)
        orig_s = sessions[s_idx]
        s_id = orig_s.get("session_id") or orig_s.get("id")
        
        # Pick a random candidate slot
        target_day = random.choice(days)
        target_period = random.choice(periods)
        target_room = random.choice(rooms)

        # Check with ExplainEngine
        blocks = explainer.what_blocks(s_id, target_day, target_period, target_room)
        is_legal = (len(blocks) == 0)

        # Create candidate schedule with single move
        cand_sessions = [dict(s) for s in sessions]
        cand_sessions[s_idx] = {
            "session_id": s_id,
            "day": target_day,
            "start_period": target_period,
            "room_id": target_room
        }
        cand_sched = dict(base_sched)
        cand_sched["sessions"] = cand_sessions

        # Run official validator
        cand_report = official_validator.run(data, cand_sched)
        cand_hard = len(cand_report.get("hard_violations", []))
        hard_rules = [v.get("rule") for v in cand_report.get("hard_violations", [])]

        if is_legal:
            legal_count += 1
            if cand_hard > 0:
                false_positives.append({
                    "iteration": i,
                    "session_id": s_id,
                    "slot": (target_day, target_period, target_room),
                    "blocks": blocks,
                    "validator_hard_rules": hard_rules,
                    "violations": cand_report.get("hard_violations")
                })
        else:
            illegal_count += 1
            if cand_hard == 0:
                false_negatives.append({
                    "iteration": i,
                    "session_id": s_id,
                    "slot": (target_day, target_period, target_room),
                    "blocks": blocks,
                })

    elapsed = time.time() - start_time
    print(f"Completed {trials} moves in {elapsed:.2f}s ({trials/elapsed:.1f} tests/s)")
    print(f"Evaluated: {legal_count} legal, {illegal_count} illegal")
    print(f"False Positives (legal but validator failed): {len(false_positives)}")
    print(f"False Negatives (illegal but validator passed): {len(false_negatives)}")

    evidence_path = ROOT_DIR / "docs" / "judge_evidence" / "parity_placement_1500.json"
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    with open(evidence_path, "w", encoding="utf-8") as f:
        json.dump({
            "trials": trials,
            "elapsed_seconds": elapsed,
            "legal_count": legal_count,
            "illegal_count": illegal_count,
            "false_positives_count": len(false_positives),
            "false_negatives_count": len(false_negatives),
            "false_positives_sample": false_positives[:10],
            "false_negatives_sample": false_negatives[:10]
        }, f, indent=2)

    print(f"Saved evidence to {evidence_path}")
    if false_positives:
        print("FAIL: False positives found! Legal slots must equal zero new hard violations.")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
