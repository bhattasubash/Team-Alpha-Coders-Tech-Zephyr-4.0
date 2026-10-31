# Submission checklist

Go through every item before the deadline. A single unchecked box here could mean disqualification.

## Repository

- [ ] Public GitHub repo
- [ ] Repo created after hackathon start time
- [ ] No pushes after deadline

## Deployment

- [ ] Vercel Root Directory set to `frontend`
- [ ] Live deployment link is up and working
- [ ] Video shows the live app (not localhost)

## Demo accounts

- [ ] admin@cit.edu / admin123 logs in and sees data
- [ ] coordinator@cit.edu / coord123 logs in and sees data
- [ ] faculty@cit.edu / faculty123 logs in and sees data
- [ ] club@cit.edu / club123 logs in and sees data
- [ ] Reset demo data button works (all accounts restored)

## Schedule files

- [ ] `exports/schedule.json` produced by the app (not hand-edited)
- [ ] `exports/schedule_after.json` produced by the app (not hand-edited)
- [ ] Both files are committed to the repo before deadline

## Validator

- [ ] `validator.py` reports zero hard violations on `schedule.json`
- [ ] `validator.py` reports zero hard violations on `schedule_after.json`
- [ ] `validator.py` run on a fresh in-app generation also shows zero hard violations

## AI safety

- [ ] LLM API key removed from committed code and environment
- [ ] Manual booking form still works without LLM API key
- [ ] Prompt injection attempts are handled (AI parser rejects or kernel catches bad output)

## Documentation

- [ ] README.md has setup instructions and demo accounts
- [ ] AI_USAGE.md describes what AI does and does not decide
- [ ] THIRD_PARTY.md lists all dependencies with licences
