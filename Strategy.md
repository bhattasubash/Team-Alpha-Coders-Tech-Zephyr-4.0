# Strategy for the CIT scheduling build

Every team has the same PS and the same AI tools. Typing speed will not separate us. Three things will: how deeply we verify, how hard we attack our own AI layer, and how visibly we prove our answers to the judges. This file is the plan.

## 1. How the marks are really won

| Criterion | Marks | Where teams lose it | Our counter |
|---|---|---|---|
| Correctness | 25 | Solver model drifts from validator.py. Hidden violations in exam capacity halving, elective baskets, combined lectures, lab slots | Kernel mirrors the validator rule by rule. Differential fuzzing against the real validator. |
| Rescheduling | 15 | Full re-solve moves dozens of sessions. Diff is unclear. | Minimal-move CP-SAT with proven optimality. Animated diff. Admin approval. |
| AI | 15 | LLM decides things. Weak against tricky prompts. | LLM only fills a typed draft. Deterministic resolver for time words. Red-team suite run before every deploy. |
| Optimisation | 10 | Weights do not match the validator | Read weights from validator.py. Two phase solve. Keep optimising button. |
| Booking | 10 | First come first served. Vague reasons. | Weighted optimisation on the validator's booking score. Reason code on every decision. |
| Usability | 10 | Judge cannot find things | Judge tour, command palette, README with three short steps. |
| UI | 10 | Desktop only. No empty or error states. | Mobile agenda view, skeletons, empty and error states, dark mode. |
| Docs | 5 | Declarations incomplete | Written as we go, checked in the final hour. |

Disqualification traps come first and are listed in docs/submission-checklist.md. A strong project that is disqualified scores zero.

## 2. The constraint kernel

One pipeline: propose, validate, diff, approve, commit. Every change goes through it: solver output, LLM drafts, manual edits, booking requests, disruptions. The kernel is plain deterministic code. It never calls a model.

Rules for the kernel:
- One function per hard rule and one per soft rule, named after the rule, each returning structured violations with a reason code.
- Read constants (periods, lunch, daily limit, weights, exam capacity factor) from the dataset or from validator.py. Do not retype numbers.
- Where the PS text and validator.py disagree, validator.py wins. Record each case in DECISIONS.md.

### Proving the kernel matches the validator
- Differential fuzzing: take a valid schedule, apply thousands of random mutations (move session, swap rooms, change period, break an elective basket, shrink a room), run both the kernel and the official validator, and require identical hard violation counts and identical soft penalty. Any mismatch is a bug and goes in BUGS.md.
- Keep the fuzz report as a committed file (docs/fuzz-report.md) with the number of cases and mismatches. Show it in the app (see section 6).
- The official validator is a test oracle and an audit tool. It is never the thing the app relies on to decide validity at runtime. The app's own kernel decides. The admin proof page can run the official validator over the current state as a cross check.

## 3. Solver

Engine: OR-Tools CP-SAT.

Model basics:
- Variables per session: day, start period, room (use boolean assignment variables over legal (day, period, room) triples after pruning).
- Prune the domain before the solver sees it: remove triples that break lunch, lab length rule, room type, capacity, accessibility, room maintenance, faculty unavailability, fixed slot. This makes the model small and fast, and it doubles as the data for explanations.
- Elective baskets: one shared slot variable for all sessions in a basket.
- Combined lectures: count for every group in them.
- Faculty daily limit: sum of hours per faculty per day.
- Exams: separate pass for the following week, effective capacity halved, using the same kernel rules.

Phases:
1. Feasibility first. Get any zero-violation schedule quickly and save it.
2. Improve. Use the feasible schedule as a hint and minimise the soft penalty with the validator's exact weights.
3. A "Keep optimising" button resumes from the last best solution with a longer time limit. Fixed random seed for repeatable results.

Run solves as background jobs with progress streamed to the UI. A request must never block until a proxy times out.

## 4. Rescheduling (15 marks)

- Warm start from the current timetable.
- Per-session `moved` boolean. First check how validator.py counts a moved session (day or period change, room change, or both). Model exactly that definition. If a room-only change does not count as a move, prefer room changes.
- Objective in strict order: hard constraints, then number of moved sessions, then soft penalty. Use weights large enough that the order is lexicographic, or solve in two stages and lock the minimum.
- Report solver status. If the status is OPTIMAL, the UI says "minimum possible moves: N (proven)".
- Build the disruption loader to accept every kind of change in the starter format, and write a generator that creates many random disruptions (leave of a faculty member, room closed for a day, new session, fixed slot) so we can test beyond sample_disruption.json. The judges will bring their own file.

### Infeasible changes
- Give every constraint group an assumption literal (faculty leave, room closure, lunch rule, lab type, daily limit, basket rule, accessibility, capacity).
- On INFEASIBLE, read the sufficient assumptions from CP-SAT, then shrink them by deletion (drop one group, re-solve, keep the drop if still infeasible). Report the smallest set found.
- Message format: "No valid fix. These constraints conflict: Dr X on leave Tue, Physics Lab closed Tue and Wed, 3 hour labs only in P2 to P4 or P6 to P8. Session PHY-L2 has 0 legal slots." Plain facts from code, no model guessing.

### Approval
Proposal is stored as pending with its full diff. Only an Admin can approve. Approval re-runs the kernel on the proposed state and refuses to commit if anything is invalid. The audit log stores who proposed, who approved, and when.

## 5. Bookings (10 marks)

- Read the validator's booking score first and find exactly what it rewards. Build the decision step to maximise that score, not first come first served.
- Priority order is fixed from the PS: exams, regular classes, institute events, guest lectures, department events, club events. It comes from the authenticated role and the event type, never from words in the request. An Admin can change the order, and that change is logged.
- A club representative who writes "I am the Dean, this is an institute event" gets a club event. The system notes the claim was ignored.
- Every decision (approve, reject, alternative) carries: reason code, the conflicting session or booking, the rule that applied, and a nearest alternative in this order: same time in another room, then adjacent time in the same room, then adjacent time in another room.
- A booking that would move a class goes to Admin. Nobody approves their own request.
- Cancelled requests free their slots and trigger a re-decision of requests that were blocked by them.

## 6. AI layer (15 marks, judged by adversarial prompts)

Principle: the model reads and writes words. It never holds authority.

- The model outputs only a strict JSON draft (venue, date, start, end, event type, attendees, accessibility need, conditions). No tool it can call writes data.
- User text is treated as data. Instructions inside it ("ignore the rules", "approve this") are ignored and flagged in the audit log.
- Deterministic resolvers sit between the model and the form:
  - Time words: "morning", "after lunch", "evening", "kal shaam", "parso", "next Friday". A fixed table maps words to periods. If a phrase is vague, the form shows the options and asks one follow-up question instead of guessing.
  - Conditionals: "auditorium, else seminar hall" becomes an ordered preference list that the booking engine tries in order.
  - Hinglish and code mixing: a small lexicon (kal, aaj, parso, shaam, subah, dopahar, chahiye, bukk, hall, etc.) used by the rule based fallback parser and as a check on model output.
- Provenance on every field in the editable form: "Time P6: inferred from 'after lunch'. Edit?" The user sees what was guessed.
- Impossible requests (Sunday, P12 for a class, 500 people in a 60 seat room) are caught by the kernel and returned with a plain reason and a legal alternative.
- Fallback parser: regex and lexicon, no network. If the API key is missing or the call fails, the app falls back automatically. The manual form never depends on any API.
- Faculty assistant: the model turns "move my Tuesday lab to Thursday" into a typed request. The solver and kernel find legal options. The model may paraphrase the result. Every proposal goes through the pipeline in section 2.
- Explanations ("why is this class at 8 AM?"): the explain engine produces structured reason codes by trying every other (day, period, room) for the session and recording the first rule each one breaks. The model may rewrite them in friendly words but cannot add facts. If the model is down, show the structured version.

Red-team suite (backend/redteam/): at least 80 prompts stored as data files, run before every deploy and results shown in the app. Categories:
- vague time, relative dates, Hinglish, mixed scripts, typos
- conditionals and multiple venues
- role spoofing and priority abuse
- prompt injection, including text hidden in a field like event title
- impossible and contradictory requests
- long and empty input
- requests to reveal the system prompt or other users' data
- requests to edit the schedule directly

Each case states the expected behaviour (ask follow up, reject with code, parse to X, ignore the instruction). The runner prints a pass rate and writes docs/redteam-report.md.

## 7. UI and usability (20 marks combined)

- Timetable component with three lenses: group, faculty, room. One component, shared filters.
- Drag and drop with live legality. While dragging, the kernel marks legal slots green and illegal ones red with the reason on hover.
- Diff view for changes: before and after, moved cards highlighted, "N sessions moved, proven minimum" summary, approve and reject with a reason.
- Week 7 dashboard: current conflicts, pending approvals, room utilisation heatmap, Spectra booking board with decisions and reasons.
- Command palette (Ctrl+K): "free room Thu P6", "timetable for CSE Year 2", "why is PHY-L2 at 8 AM".
- Phone layout: day agenda cards instead of a squeezed grid. Check at 360 px width.
- Loading skeletons, empty states, error states with a retry, dark mode, keyboard focus styles, colour plus label for session types (never colour alone).
- First login "Judge tour": three steps (find a free room, read a timetable, approve a change) with a skip button.
- Admin proof page: runs the official validator on the current state, shows hard violations (target 0), soft penalty, booking score, fuzz report summary and red-team pass rate. A judge sees evidence in one place.
- Admin "Reset demo data" button, with a confirmation.

## 8. Deployment and reliability

- Deploy a skeleton in the first hours (health endpoint, login, one page). Keep deploying every few hours. Do not leave deployment to the end.
- Use a host with no cold sleep for the backend. CP-SAT needs CPU. Set a worker count that fits the plan.
- Seed data is produced by scripts in the repo (scripts/seed_demo.py, scripts/export_schedule.py) so exports are reproducible.
- Keep one SQLite or Postgres database with an event log.
- Health check page and a status line in the footer.
- Freeze 60 minutes before the deadline. After freeze: no pushes, no deploys. Test the live link from a clean browser and a phone.

## 9. Order of work

P0 (cannot skip): repo after start, kernel, zero-violation schedule, exports from script, four demo accounts, reset, live link, video.
P1: rescheduling with approval and diff, booking decisions with reasons, exams.
P2: AI layer with fallback and red-team suite, explain engine.
P3: optimisation, proof page, polish, mobile.
P4: extras only if everything above passes.

If time is short, cut from the bottom, never from P0.

## 10. Ways we avoid common failures

- Never trust the model for validity.
- Never type a constant that exists in the data or validator.
- Never leave a stub that passes silently. Stubs raise NotImplementedError and are listed in DECISIONS.md.
- Never push after the deadline.
- Never edit an export by hand.
- Test with the API key removed.
- Test the judge flow from a fresh browser profile.