# AI usage

## Tools used

| Tool | Model | What it does in the product | What it helped build | Where prompts live |
|------|-------|-----------------------------|---------------------|--------------------|
| OpenAI / Gemini API | gpt-4o-mini / gemini-2.5-flash (planned) | Parses natural language booking requests into structured fields (room, date, time, purpose). Falls back to a regex parser if the LLM is unavailable or returns bad output. | Not yet integrated in runtime. | `/prompts/` |
| Antigravity (build tool) | Claude Opus 4.6 | Nothing in the product. Used only during development. | Initial project scaffolding, kernel code, initial test writing, documentation. | N/A (interactive session) |
| Antigravity (build tool) | Gemini 3.8 Flash | Nothing in the product. Used only during development. | Environment setup, Python 3.13 venv configuration, test verification, bug diagnosis and fixing, documentation audit and task completion. | N/A (interactive session) |

We will add rows as more tools get used.

## What the LLM may never decide

The LLM is a convenience layer for parsing free-text booking requests. It must never:

- Decide whether a schedule or booking is valid. Validity is checked by deterministic code in the kernel, which mirrors the organiser validator rule by rule.
- Assign or change priority of a booking request.
- Approve or reject a booking or schedule change.
- Write, update, or delete any data in the database.

All of these actions go through the kernel, which runs hard-coded constraint checks (H1 through H14, B1 through B3, E1 through E2) and soft-cost calculations (S1 through S6). The kernel is deterministic. The LLM output is always treated as a draft that the kernel validates before anything is committed.
