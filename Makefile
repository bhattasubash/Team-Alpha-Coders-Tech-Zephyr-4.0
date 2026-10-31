# Makefile for CIT Schedule project
#
# Targets:
#   setup          - Install backend (venv + pip) and frontend (npm) dependencies
#   dev-backend    - Start FastAPI dev server on port 8000
#   dev-frontend   - Start Next.js dev server
#   dev            - Alias for dev-backend (frontend runs separately)
#   test           - Run backend pytest suite
#   validate       - Run validator on baseline schedule
#   validate-after - Run validator on disrupted schedule with baseline comparison
#   export         - Export schedule JSON from the solver pipeline
#   fuzz           - Run differential fuzzing against the kernel
#   redteam        - Run red-team prompt injection test suite
#   lint           - Run ruff (backend) and eslint (frontend)
#   format         - Auto-format with ruff (backend) and prettier (frontend)
#   clean          - Remove caches and build artifacts

.PHONY: setup dev dev-backend dev-frontend test test-all validate validate-after export fuzz redteam lint format clean

setup:
	cd backend && python -m venv venv && venv\Scripts\pip install -r requirements.txt
	cd frontend && npm install

dev-backend:
	cd backend && venv\Scripts\uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

dev: dev-backend

test:
	cd backend && venv\Scripts\pytest tests/ -v -m "not slow" --durations=10

test-all:
	cd backend && venv\Scripts\pytest tests/ -v --durations=10

validate:
	python validator/validator.py --data data/cit_public.json --schedule exports/schedule.json --json exports/report.json

validate-after:
	python validator/validator.py --data data/cit_public.json --schedule exports/schedule_after.json --disruption data/sample_disruption.json --baseline exports/schedule.json --json exports/report_after.json

export:
	backend\venv\Scripts\python scripts/export_schedule.py

fuzz:
	backend\venv\Scripts\python scripts/fuzz_kernel.py

redteam:
	cd backend && venv\Scripts\python -m redteam.runner

lint:
	cd backend && venv\Scripts\ruff check app/ tests/
	cd frontend && npx eslint src/

format:
	cd backend && venv\Scripts\ruff format app/ tests/
	cd frontend && npx prettier --write src/

clean:
	rm -rf backend/__pycache__ backend/.pytest_cache frontend/.next
