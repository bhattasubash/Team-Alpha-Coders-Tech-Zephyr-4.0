"""
Fuzz test with 5000 cases and a NEW seed (20261101).
Tests parity between kernel validate_schedule and official validator.run.
"""
import sys
from pathlib import Path
import random
import time

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))
sys.path.insert(0, str(ROOT_DIR))

import validator.validator as official_validator
from app.kernel.validate import validate_schedule
import scripts.fuzz_kernel as fk

def main():
    seed = 20261101
    cases = 5000
    random.seed(seed)
    fk.RANDOM_SEED = seed
    
    print(f"Starting differential fuzzing: {cases} cases, seed={seed}...")
    start_time = time.time()
    cases_run, mismatches = fk.run_fuzz(total_cases=cases)
    elapsed = time.time() - start_time
    
    print(f"Completed {cases_run} cases in {elapsed:.2f}s ({cases_run/elapsed:.1f} cases/sec)")
    print(f"Mismatches: {len(mismatches)}")
    
    evidence_path = ROOT_DIR / "docs" / "judge_evidence" / "fuzz_5000_results.txt"
    with open(evidence_path, "w", encoding="utf-8") as f:
        f.write(f"Differential Fuzzing Results\n")
        f.write(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total Cases: {cases_run}\n")
        f.write(f"Seed: {seed}\n")
        f.write(f"Elapsed Time: {elapsed:.2f}s\n")
        f.write(f"Mismatches: {len(mismatches)}\n\n")
        if mismatches:
            f.write("MISMATCHES:\n")
            for m in mismatches[:20]:
                f.write(f"- Case {m['iteration']}: {m['mutations']}\n")
                for d in m['diffs']:
                    f.write(f"  {d}\n")
        else:
            f.write("PERFECT PARITY: 0 mismatches across 5000 cases.\n")

    if mismatches:
        print("FAIL: Mismatches detected!")
        sys.exit(1)
    else:
        print("SUCCESS: 0 mismatches across 5000 cases.")
        sys.exit(0)

if __name__ == "__main__":
    main()
