# AI usage

## Tools used

| Tool | Model | What it does in the product | What it helped build | Where prompts live |
|------|-------|-----------------------------|---------------------|--------------------|
| Antigravity (build tool) | Gemini 3.8 Flash (coding agent) | Nothing in the product. Used only during development. | Project implementation, kernel validation parity, test suite, and documentation. | N/A (interactive session) |
| claude.ai | Claude (used by team lead) | Nothing in the product. Used by team lead. | Strategy and prompt drafting. | N/A (interactive session) |
| OpenAI / Gemini API (planned) | gpt-4o-mini / gemini-2.5-flash | Parses natural language booking requests into structured fields. Falls back to deterministic regex parser if unavailable. | Not yet integrated in runtime. | /prompts/ |

## Team correction table

Review this table and update if any model name or tool usage differs from actual team activity:

| Date | Person | Tool | Model recorded | Correction needed | Verified (Yes/No) |
|------|--------|------|----------------|-------------------|-------------------|
| 2026-10-31 | Team Lead | claude.ai | Claude | Confirm specific Claude model variant | Pending |
| 2026-10-31 | Backend Engineer | Antigravity | Gemini 3.8 Flash | Confirm Antigravity agent model | Pending |

## What the LLM may never decide

The LLM is a convenience layer for parsing free-text booking requests. It must never:

- Decide whether a schedule or booking is valid. Validity is checked by deterministic code in the kernel, which mirrors the official validator rule by rule.
- Assign or change priority of a booking request.
- Approve or reject a booking or schedule change.
- Write, update, or delete any data in the database.

All of these actions go through the kernel, which runs hard constraint checks (H1 through H14, B1 through B3, E1 through E2) and soft cost calculations (S1 through S6). The kernel is deterministic. The LLM output is always treated as a draft that the kernel validates before anything is committed.
