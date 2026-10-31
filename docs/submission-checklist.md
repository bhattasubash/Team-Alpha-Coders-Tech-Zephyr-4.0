# Submission checklist

Go through every item before the deadline. A single unchecked box here could mean disqualification.

## Repository

- [x] Public GitHub repo (https://github.com/bhattasubash/Team-Alpha-Coders-Tech-Zephyr-4.0)
- [x] Repo created after hackathon start time (First commit: Sat Oct 31 16:29:45 2026 +0530)
- [ ] No pushes after deadline

## Deployment

- [x] Vercel Root Directory set to `frontend` (Documented in README.md & next.config.mjs)
- [x] Live deployment link is up and working (https://team-alpha-coders-tech-zephyr-40.vercel.app)
- [ ] Video shows the live app (not localhost)

## Demo accounts

- [x] admin@cit.edu / admin123 logs in and sees data
- [x] coordinator@cit.edu / coord123 logs in and sees data
- [x] faculty@cit.edu / faculty123 logs in and sees data
- [x] club@cit.edu / club123 logs in and sees data
- [x] Reset demo data button works (all accounts restored via POST /api/admin/reset)

## Schedule files

- [x] `exports/schedule.json` produced by the app (not hand-edited)
- [x] `exports/schedule_after.json` produced by the app (not hand-edited)
- [x] Both files are committed to the repo before deadline

## Validator

- [x] `validator.py` reports zero hard violations on `schedule.json` (0 hard, 161 soft, 67.0 booking score)
- [x] `validator.py` reports zero hard violations on `schedule_after.json` (0 hard, 160 soft, 67.0 booking score, 14 moves)
- [x] `validator.py` run on a fresh in-app generation also shows zero hard violations (verified via test_persistence_and_jobs)

## AI safety

- [x] LLM API key removed from committed code and environment (git history clean; .gitignore protects .env; .env.example has placeholder)
- [x] Manual booking form still works without LLM API key (deterministic regex fallback + direct manual payload submission)
- [ ] Prompt injection attempts are handled (AI parser rejects or kernel catches bad output)

## Documentation

- [x] README.md has setup instructions and demo accounts
- [x] AI_USAGE.md describes what AI does and does not decide (Groq llama-3.1-8b-instant, build tool Gemini 3.8 Flash)
- [x] THIRD_PARTY.md lists all dependencies with licences (including groq Apache-2.0)
