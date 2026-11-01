import json
import httpx

BASE_URL = "https://cit-scheduler-backend.onrender.com"

ACCOUNTS = [
    ("admin@cit.edu", "admin123", "admin"),
    ("dean@cit.edu", "dean123", "admin"),
    ("coordinator@cit.edu", "coord123", "department_coordinator"),
    ("faculty@cit.edu", "faculty123", "faculty"),
    ("club@cit.edu", "club123", "club"),
]

results = []
client = httpx.Client(timeout=20.0)

for email, pwd, expected_role in ACCOUNTS:
    try:
        r = client.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd})
        if r.status_code == 200:
            data = r.json()
            token = data.get("access_token")
            # Call /api/auth/me
            me_r = client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            me_data = me_r.json() if me_r.status_code == 200 else me_r.text
            results.append({
                "email": email,
                "login_status": r.status_code,
                "token_role": data.get("role"),
                "expected_role": expected_role,
                "me_status": me_r.status_code,
                "me_data": me_data,
                "pass": data.get("role") == expected_role and me_r.status_code == 200
            })
        else:
            results.append({
                "email": email,
                "login_status": r.status_code,
                "error": r.text,
                "pass": False
            })
    except Exception as e:
        results.append({
            "email": email,
            "error": str(e),
            "pass": False
        })

print(json.dumps(results, indent=2))
with open("docs/judge_evidence/deployed_auth_audit.json", "w") as f:
    json.dump(results, f, indent=2)
