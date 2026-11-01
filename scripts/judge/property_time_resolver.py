"""
Property tests for the time resolver and Hinglish lexicon.
Requirement C1: Property tests for the time resolver (hour to period, "6 to 8 pm" is P10 to P11, "after lunch" P6) and the Hinglish lexicon.
Tests both fallback parser and live API /api/bookings/parse.
"""
import sys
import json
from pathlib import Path
import httpx

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))
sys.path.insert(0, str(ROOT_DIR))

from app.ai.provider import LLMProvider

TEST_CASES = [
    # (input_text, expected_from_p, expected_to_p, expected_day, description)
    ("auditorium 6 to 8 pm for 100 people Thursday", 10, 11, "THU", "6 to 8 pm is P10 to P11"),
    ("seminar hall after lunch Friday for 50 people", 6, 6, "FRI", "after lunch is P6"),
    ("kal shaam seminar hall chahiye 80 log", 10, 12, "TUE", "Hinglish: kal shaam (tomorrow evening)"),
    ("parso subah 10 baje se 12 baje tak lab 50 students", 3, 4, "WED", "Hinglish: parso subah (day after tomorrow morning)"),
    ("seminar hall kal 6 baje 2 ghante 100 log mic chahiye", 10, 11, "TUE", "Hinglish: 6 baje 2 ghante (6pm for 2 hours)"),
    ("Monday 7 to 9 pm rehearsal 40 people OAT", 11, 12, "MON", "7 to 9 pm is P11 to P12"),
    ("auditorium 2 to 6 pm Wednesday 200 people", 6, 9, "WED", "2 to 6 pm is P6 to P9"),
    ("hall from 10 pm till midnight", None, None, None, "10 pm to midnight (beyond P13)"),
    ("auditorium 9 am to 12 pm Tuesday", 2, 4, "TUE", "9 am to 12 pm is P2 to P4"),
]

def main():
    llm = LLMProvider()
    results = []

    print("--- Testing Fallback Parser (Local Deterministic) ---")
    for text, exp_from, exp_to, exp_day, desc in TEST_CASES:
        parsed = llm._fallback_parse(text)
        win = parsed.windows[0] if parsed.windows else None
        act_from = win.get("from_period") if win else None
        act_to = win.get("to_period") if win else None
        act_day = win.get("day") if win else None

        passed = (act_from == exp_from and act_to == exp_to and (exp_day is None or act_day == exp_day))
        results.append({
            "mode": "fallback_parser",
            "text": text,
            "description": desc,
            "expected": {"from": exp_from, "to": exp_to, "day": exp_day},
            "actual": {"from": act_from, "to": act_to, "day": act_day, "room": parsed.requested_room, "att": parsed.attendance},
            "passed": passed
        })
        print(f"[{'PASS' if passed else 'FAIL'}] {desc}: {text}")
        if not passed:
            print(f"       Expected from={exp_from}, to={exp_to}, day={exp_day}; Got from={act_from}, to={act_to}, day={act_day}")

    print("\n--- Testing Deployed Backend API (/api/bookings/parse) ---")
    client = httpx.Client(base_url="https://cit-scheduler-backend.onrender.com", timeout=25.0)
    for text, exp_from, exp_to, exp_day, desc in TEST_CASES:
        try:
            r = client.post("/api/bookings/parse", json={"text": text})
            if r.status_code == 200:
                data = r.json()
                draft = data.get("draft") or {}
                win = draft.get("windows", [{}])[0] if draft.get("windows") else {}
                act_from = win.get("from_period")
                act_to = win.get("to_period")
                act_day = win.get("day")
                source = data.get("source")
                passed = (act_from == exp_from and act_to == exp_to and (exp_day is None or act_day == exp_day))
                results.append({
                    "mode": f"deployed_api_{source}",
                    "text": text,
                    "description": desc,
                    "expected": {"from": exp_from, "to": exp_to, "day": exp_day},
                    "actual": {"from": act_from, "to": act_to, "day": act_day, "source": source},
                    "passed": passed
                })
                print(f"[{'PASS' if passed else 'FAIL'}] ({source}) {desc}: {text}")
                if not passed:
                    print(f"       Expected from={exp_from}, to={exp_to}, day={exp_day}; Got from={act_from}, to={act_to}, day={act_day}")
            else:
                print(f"[FAIL] HTTP {r.status_code}: {text}")
                results.append({"mode": "deployed_api", "text": text, "error": r.text, "passed": False})
        except Exception as e:
            print(f"[ERROR] {e}: {text}")
            results.append({"mode": "deployed_api", "text": text, "error": str(e), "passed": False})

    evidence_path = ROOT_DIR / "docs" / "judge_evidence" / "property_time_resolver.json"
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    with open(evidence_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved results to {evidence_path}")

if __name__ == "__main__":
    main()
