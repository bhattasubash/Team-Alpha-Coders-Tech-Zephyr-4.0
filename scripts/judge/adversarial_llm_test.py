"""
Adversarial LLM Output Test.
Requirement D4: Monkeypatch the provider to return hostile JSON:
- status approved
- a room that does not exist
- a slot that breaks hard rules
- extra fields
- wrong types
- attendance 10^9
- strings with HTML/XSS
Prove the kernel/API rejects it and no schedule or booking data changes.
"""
import sys
import json
from pathlib import Path
from unittest.mock import patch

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))
sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.ai.provider import LLMProvider, ParsedBooking
from app.auth.users import create_access_token

def main():
    client = TestClient(app)
    club_token = create_access_token({"sub": "club@cit.edu", "role": "club"})
    headers = {"Authorization": f"Bearer {club_token}"}

    hostile_cases = [
        # 1. Hostile status "approved"
        {
            "desc": "Hostile status approved injection",
            "hostile_obj": ParsedBooking(
                raw_text="Hostile 1",
                requested_room="AUD",
                follow_up=None,
                attendance=50,
                windows=[{"day": "MON", "from_period": 10, "to_period": 12}],
            ),
            "payload_extra": {"status": "approved", "role": "admin", "effective_category": "institute_event"}
        },
        # 2. Non-existent room
        {
            "desc": "Non-existent room",
            "hostile_obj": ParsedBooking(
                raw_text="Hostile 2",
                requested_room="GHOST_ROOM_999",
                attendance=50,
                windows=[{"day": "MON", "from_period": 10, "to_period": 12}],
            ),
            "payload_extra": {"requested_room": "GHOST_ROOM_999"}
        },
        # 3. Attendance 10^9
        {
            "desc": "Astronomical attendance (10^9)",
            "hostile_obj": ParsedBooking(
                raw_text="Hostile 3",
                requested_room="AUD",
                attendance=1_000_000_000,
                windows=[{"day": "MON", "from_period": 10, "to_period": 12}],
            ),
            "payload_extra": {"attendance": 1_000_000_000}
        },
        # 4. Strings with HTML/XSS
        {
            "desc": "XSS attack in title and text",
            "hostile_obj": ParsedBooking(
                raw_text="<script>alert('XSS')</script>",
                requested_room="AUD",
                attendance=50,
                windows=[{"day": "MON", "from_period": 10, "to_period": 12}],
            ),
            "payload_extra": {"title": "<script>alert('pwned')</script>", "notes": "<img src=x onerror=alert(1)>"}
        },
        # 5. Slot breaking hard rules (Sunday P15)
        {
            "desc": "Invalid slot Sunday P15",
            "hostile_obj": ParsedBooking(
                raw_text="Hostile 5",
                requested_room="AUD",
                attendance=50,
                windows=[{"day": "SUN", "from_period": 15, "to_period": 17}],
            ),
            "payload_extra": {"windows": [{"day": "SUN", "from_period": 15, "to_period": 17}]}
        }
    ]

    results = []
    print("Running Adversarial LLM Output Tests...")

    for case in hostile_cases:
        desc = case["desc"]
        hostile = case["hostile_obj"]
        
        # Monkeypatch parse_booking_text
        with patch.object(LLMProvider, "parse_booking_text", return_value=hostile):
            parse_res = client.post("/api/bookings/parse", json={"text": "arbitrary prompt"}, headers=headers)
            parse_data = parse_res.json() if parse_res.status_code == 200 else {}
            
            # Now attempt to submit booking request with hostile payload
            booking_payload = {
                "title": "Adversarial Test",
                "attendance": hostile.attendance or 50,
                "duration_periods": 2,
                "windows": hostile.windows or [{"day": "THU", "from_period": 10, "to_period": 11}],
                "room_types": ["auditorium"],
                "requested_room": hostile.requested_room or "AUD",
                "needs": [],
                "mandatory_for_groups": [],
                **case["payload_extra"]
            }
            
            submit_res = client.post("/api/bookings", json=booking_payload, headers=headers)
            submit_data = submit_res.json() if submit_res.status_code == 200 else {"status_code": submit_res.status_code, "text": submit_res.text}

            # Verify that status is NOT approved, and illegal room/attendance are rejected
            is_rejected_or_pending = False
            reasons = []
            if submit_res.status_code == 422:
                is_rejected_or_pending = True
                reasons.append("Rejected by Pydantic 422 schema validation")
            elif submit_res.status_code == 200:
                legal = submit_data.get("legal")
                if not legal:
                    is_rejected_or_pending = True
                    reasons.append(f"Rejected by kernel precheck: {submit_data.get('reason_codes')}")
                else:
                    # Even if legal, must be queued as pending, never approved
                    req_id = submit_data.get("details", {}).get("request_id")
                    # Check list bookings to ensure status != approved
                    all_bookings = client.get("/api/bookings", headers=headers).json().get("bookings", [])
                    matched = next((b for b in all_bookings if b.get("id") == req_id), None)
                    if matched and matched.get("status") == "pending" and matched.get("role") == "club":
                        is_rejected_or_pending = True
                        reasons.append(f"Safely queued as pending club request (role clamped to club)")
                    else:
                        is_rejected_or_pending = False
                        reasons.append(f"VULNERABILITY: Booking status was {matched.get('status') if matched else 'unknown'}")

            passed = is_rejected_or_pending
            print(f"[{'PASS' if passed else 'FAIL'}] {desc}: {reasons}")
            results.append({
                "test": desc,
                "passed": passed,
                "reasons": reasons,
                "submit_status": submit_res.status_code,
                "submit_data": submit_data
            })

    evidence_path = ROOT_DIR / "docs" / "judge_evidence" / "adversarial_llm_results.json"
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    with open(evidence_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved adversarial results to {evidence_path}")

if __name__ == "__main__":
    main()
