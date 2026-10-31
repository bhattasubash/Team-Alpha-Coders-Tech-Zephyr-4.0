# API documentation

Specification for the CIT Campus Scheduling HTTP API contract.

Base URL: `http://localhost:8000`
OpenAPI specification: `/openapi.json`
Interactive documentation: `/docs`

## 1. Authentication and authorization

Protected endpoints require a Bearer token in the `Authorization` header:
`Authorization: Bearer <access_token>`

Roles:
- `admin`: Full administrative access, solver triggering, approvals, resets.
- `department_coordinator`: Manual moves, booking reviews.
- `faculty`: View access and personal schedule tracking.
- `club`: Student club event booking submissions and status tracking.

Demo credentials:
| Email | Password | Role |
|-------|----------|------|
| `admin@cit.edu` | `admin123` | admin |
| `coordinator@cit.edu` | `coord123` | department_coordinator |
| `faculty@cit.edu` | `faculty123` | faculty |
| `club@cit.edu` | `club123` | club |

## 2. Standardized error format

Every error response adheres strictly to the following envelope:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "details": [...]
  }
}
```

Allowed error codes:
- Validator rule IDs: `H1` to `H14`, `B1` to `B3`, `E1`, `E2`, `S1` to `S6`
- System and domain codes:
  - `NOT_FOUND`: Resource does not exist (HTTP 404).
  - `FORBIDDEN`: User role lacks required permission (HTTP 403).
  - `UNAUTHENTICATED`: Missing or invalid token (HTTP 401).
  - `NOT_IMPLEMENTED`: Endpoint logic not yet implemented (HTTP 501).
  - `INVALID_INPUT`: Request payload or parameter validation error (HTTP 422).
  - `SELF_APPROVAL`: Admin cannot approve their own submitted proposal (HTTP 400).
  - `INFEASIBLE`: Requested schedule modification cannot satisfy hard constraints (HTTP 409).

## 3. Response conventions

1. Every list response includes a concrete integer `count` field.
2. Every Proposal and Decision carries machine-readable `reason_codes` plus a human-readable `reason` string generated from deterministic templates (never from a generative model).
3. Endpoints without backend business logic return HTTP 501 with code `NOT_IMPLEMENTED`.

## 4. Endpoints list

### Health

| Method | Path | Role | Description | Response |
|--------|------|------|-------------|----------|
| GET | `/api/health` | Public | Application health status | `HealthResponse` |

### Auth

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/auth/login` | Public | `LoginRequest` | `TokenResponse` |
| GET | `/api/auth/me` | Authenticated | None | `UserProfileResponse` |

### Meta

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/meta` | Public | None | `MetaResponse` (calendar, rooms, faculty, groups, courses, kinds, period times, counts) |

### Timetable

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/timetable` | Authenticated | Query: `view=group\|faculty\|room`, `id=<str>` | `TimetableViewResponse` |
| GET | `/api/timetable/all` | Authenticated | None | `TimetableAllResponse` |
| POST | `/api/timetable/generate` | admin | `GenerateTimetableRequest` | `JobStatusResponse` (returns job ID) |
| POST | `/api/timetable/optimise` | admin | `OptimiseTimetableRequest` | `JobStatusResponse` (continues from best) |
| GET | `/api/jobs/{id}` | Authenticated | None | `JobStatusResponse` (status, progress, best soft penalty, solver status, seconds) |

### Validation

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/validation` | Authenticated | None | `ValidationReportResponse` (kernel report: hard violations with rule IDs, soft by S1-S6, bookings, exams) |
| GET | `/api/validation/official` | admin | None | `OfficialValidationResponse` (runs official validator as subprocess and returns report) |

### Manual scheduling

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/sessions/{id}/legal-slots` | Authenticated | None | `LegalSlotsResponse` (every day, start period, room with legal bool and reason codes) |
| POST | `/api/sessions/{id}/move` | admin, department_coordinator | `SessionMoveRequest` | `Proposal` with diff, or error with reason codes |

### Rooms

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/rooms/free` | Authenticated | Query: `day`, `period`, `duration`, `type`, `min_capacity`, `accessible` | `FreeRoomsResponse` (count, room list) |

### Exams

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/exams` | Authenticated | None | `ExamsResponse` (count, exam list) |
| POST | `/api/exams/generate` | admin | `GenerateExamsRequest` | `ExamsResponse` (generated exam placements) |

### Bookings

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/bookings` | Authenticated | None | `BookingsListResponse` (count, booking list) |
| POST | `/api/bookings/parse` | Authenticated | `ParseBookingTextRequest` (`text`) | `ParseBookingResponse` (`draft`, provenance per field, `follow_up_questions`, `source: "llm"\|"fallback"`) |
| POST | `/api/bookings` | Authenticated | `CreateBookingRequest` | `BookingPrecheckResult` (structured request with kernel pre-check) |
| POST | `/api/bookings/{id}/cancel` | Authenticated | None | `BookingCancelResponse` (marks rejected with reason "Withdrawn by requester") |
| POST | `/api/bookings/decide` | admin | None | `BookingDecideResponse` (runs Spectra week priority decision engine) |
| GET | `/api/bookings/{id}/decision` | Authenticated | None | `BookingDecision` (decision, reason codes, plain text reason, alternative offered) |

### Disruptions and Proposals

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/disruptions/preview` | admin | `DisruptionsPreviewRequest` | `Proposal` (`id`, `status`, `moves: [{session_id, from, to, kind: time\|room_only}]`, `moved_count`, `proven_minimum: bool`, `infeasible: bool`, `conflicts: [...]`) |
| GET | `/api/proposals` | Authenticated | None | `ProposalListResponse` (count, list of proposals) |
| POST | `/api/proposals/{id}/approve` | admin | None | `ApproveProposalResponse` (admin approval, forbidden if admin is proposer) |
| POST | `/api/proposals/{id}/reject` | admin | `RejectProposalRequest` | `ApproveProposalResponse` |

### Explain

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/explain/session/{id}` | Authenticated | None | `ExplainSessionResponse` (counterfactual explanation with reason codes) |
| GET | `/api/explain/booking/{id}` | Authenticated | None | `ExplainBookingResponse` (counterfactual explanation with reason codes) |
| POST | `/api/assistant` | Authenticated | `AssistantRequest` | `AssistantResponse` |

### Dashboard

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/dashboard` | Authenticated | None | `DashboardResponse` (conflict count, pending approvals, room utilisation by room/day/period, booking board) |

### Admin

| Method | Path | Role | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/admin/reset` | admin | None | `AdminResetResponse` |
| POST | `/api/admin/dataset` | admin | Multipart: `dataset_file`, optional `change_file` | `AdminResetResponse` |
| GET | `/api/export/schedule.json` | admin | None | File export / schedule JSON |
