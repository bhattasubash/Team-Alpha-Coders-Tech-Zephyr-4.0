# API endpoints

All endpoints are prefixed with the backend base URL (default: `http://localhost:8000`).

Auth-protected endpoints require a Bearer token in the Authorization header. Get one from POST /api/auth/login.

## Status

| Status | Meaning |
|--------|---------|
| Implemented | Working, tested |
| Stub | Route exists, returns 501 Not Implemented |
| Planned | Not yet created |

## Endpoints

### Health

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/health` | Returns `{"status": "ok"}` | Planned |

### Auth

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| POST | `/api/auth/login` | Accepts `{"email", "password"}`. Returns `{"access_token", "role"}`. | None | Planned |

### Timetable

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| GET | `/api/timetable` | Returns the full committed timetable for the current week. | Any | Planned |
| POST | `/api/timetable/generate` | Triggers the solver to generate a new timetable. Returns a proposal ID. | Admin | Planned |
| GET | `/api/timetable/{group_id}` | Returns the timetable filtered for a specific student group. | Any | Planned |

### Schedule changes

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| POST | `/api/schedule/propose` | Submit a proposed schedule change. Kernel validates it. Returns violations or a proposal ID. | Admin, Coordinator | Planned |
| POST | `/api/schedule/approve/{id}` | Approve or reject a proposed change by ID. Body: `{"action": "approve"|"reject", "reason": "..."}`. | Admin | Planned |

### Bookings

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| GET | `/api/bookings` | List all booking requests with their status. | Any | Planned |
| POST | `/api/bookings/request` | Submit a new booking request. Body includes room, date, periods, purpose, event type. Also accepts a `natural_language` field for AI parsing. | Any | Planned |
| POST | `/api/bookings/decide/{id}` | Approve or reject a booking request. Priority order enforced: exam > regular_session > institute_event > guest_lecture > department_event > club_event. | Admin, Coordinator | Planned |

### Rooms

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| GET | `/api/rooms/available` | Query params: `date`, `period`. Returns rooms that are free at the given slot with capacity and type info. | Any | Planned |

### Disruption

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| POST | `/api/disruption/apply` | Apply a disruption scenario (e.g., faculty sick, room closed). Kernel reschedules affected sessions with minimal moves. Returns diff. | Admin | Planned |

### Validation

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| GET | `/api/validate` | Runs the kernel validator on the current committed schedule. Returns hard violations, soft penalty score, and per-rule results. | Admin | Planned |

### Export

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| POST | `/api/export` | Exports the current schedule as JSON to `exports/schedule.json`. For post-disruption, exports to `exports/schedule_after.json`. | Admin | Planned |

## Request/response examples

### POST /api/auth/login

Request:
```json
{
  "email": "admin@cit.edu",
  "password": "admin123"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "role": "admin"
}
```

### GET /api/rooms/available?date=2026-11-02&period=3

Response:
```json
{
  "available_rooms": [
    {
      "room_id": "CR-01",
      "name": "Classroom 1",
      "capacity": 60,
      "type": "classroom",
      "accessible": true
    }
  ]
}
```

### POST /api/bookings/request

Request (structured):
```json
{
  "room_id": "AUD-01",
  "date": "2026-11-05",
  "periods": [10, 11, 12],
  "purpose": "Spectra opening ceremony",
  "event_type": "institute_event",
  "requested_by": "club@cit.edu"
}
```

Request (natural language, AI-parsed):
```json
{
  "natural_language": "Book the auditorium for Spectra opening ceremony on Nov 5, periods 10 to 12",
  "requested_by": "club@cit.edu"
}
```
