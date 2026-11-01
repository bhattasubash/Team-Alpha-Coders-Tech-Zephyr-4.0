import httpx
import time

BASE_URL = "https://cit-scheduler-backend.onrender.com"
client = httpx.Client(base_url=BASE_URL, timeout=30.0)

token = client.post("/api/auth/login", json={"email": "admin@cit.edu", "password": "admin123"}).json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

job_id = "job-090001d1"
print(f"Polling job {job_id}...")

for i in range(25):
    r = client.get(f"/api/jobs/{job_id}", headers=headers)
    data = r.json()
    print(f"[{i*4}s] status={data.get('status')}, phase={data.get('phase')}, seconds={data.get('seconds')}, soft={data.get('best_soft_penalty')}")
    if data.get("status") in ("completed", "failed"):
        print("Final:", data)
        break
    time.sleep(4)
