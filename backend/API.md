# ResQ-Aid Backend API

Base URL (local dev): `http://localhost:5000`

All endpoints return JSON. Errors follow the shape:
```json
{ "error": "human-readable message" }
```

---

## Auth

### `POST /api/auth/signup`
Create a new account.

**Body** (`application/json`):
```json
{ "email": "user@example.com", "password": "yourpassword", "fullName": "Optional Name" }
```

**Response** `201`:
```json
{ "user": { "id": "...", "email": "...", ... }, "session": { "access_token": "...", "expires_in": 3600, ... } }
```
> Note: `session` may be `null` if email confirmation is required and hasn't happened yet.

---

### `POST /api/auth/login`
Log in with an existing account.

**Body** (`application/json`):
```json
{ "email": "user@example.com", "password": "yourpassword" }
```

**Response** `200`:
```json
{ "user": { "id": "...", "email": "...", ... }, "session": { "access_token": "...", "expires_in": 3600, ... } }
```

**Use `session.access_token`** as a Bearer token on any authenticated request:
```
Authorization: Bearer <access_token>
```
Tokens expire after 1 hour (`expires_in: 3600`) — re-login to get a fresh one.

---

## Cases (core reporting flow)

### `POST /api/cases`
**Requires auth.** Creates a new rescue case, OR merges into / escalates an existing nearby case if one is found within 50m.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Body** (`multipart/form-data`):
| Field | Type | Required | Notes |
|---|---|---|---|
| `image` | file | ✅ | Photo of the animal |
| `lat` | string/number | ✅ | Latitude |
| `lng` | string/number | ✅ | Longitude |
| `landmark` | string | optional | Human-readable location description |
| `description` | string | optional | Reporter's own description; falls back to AI-generated summary if omitted |
| `reporterContact` | string | optional | Phone/email if reporter wants to be contacted |

**Response `201`** — new case created:
```json
{
  "case": { "id": "...", "status": "dispatched", "urgency_score": 5, "report_count": 1, ... },
  "assessment": { "urgencyScore": 5, "injurySummary": "...", "confidence": "high", "visibleAnimalType": "dog" },
  "nearestTeam": { "team_id": "...", "team_name": "...", "distance_meters": 3039.0 },
  "action": "new_case"
}
```

**Response `200`** — merged into existing case as a duplicate:
```json
{
  "case": { "id": "...", "report_count": 2, ... },
  "assessment": { ... },
  "classification": { "classification": "duplicate", "reasoning": "...", "updatedUrgencyScore": 5 },
  "action": "duplicate_merged"
}
```

**Response `200`** — escalated an existing case:
```json
{
  "case": { "id": "...", "urgency_score": 5, "status": "dispatched", ... },
  "assessment": { ... },
  "classification": { "classification": "escalation", "reasoning": "...", "updatedUrgencyScore": 5 },
  "action": "escalated"
}
```

**Errors**:
- `400` — missing image, missing lat/lng, or invalid lat/lng
- `401` — missing/invalid/expired auth token

---

## Assessment (standalone, used internally by `/api/cases`)

### `POST /api/assessment/image`
Runs AI triage on a single image, no persistence.

**Body** (`multipart/form-data`):
| Field | Type | Required |
|---|---|---|
| `image` | file | ✅ |

**Response `200`**:
```json
{
  "assessment": {
    "urgencyScore": 5,
    "injurySummary": "A dog lying on the ground with active bleeding...",
    "confidence": "high",
    "visibleAnimalType": "dog"
  }
}
```

---

## Dispatch (standalone, used internally by `/api/cases`)

### `GET /api/dispatch/nearest-team`
Finds the nearest available rescue team(s) to a coordinate.

**Query params**:
| Param | Required | Default |
|---|---|---|
| `lat` | ✅ | — |
| `lng` | ✅ | — |
| `radiusMeters` | optional | 10000 |

**Example**: `GET /api/dispatch/nearest-team?lat=27.7172&lng=85.3240`

**Response `200`**:
```json
{
  "teams": [
    { "team_id": "...", "team_name": "Kathmandu Animal Rescue", "distance_meters": 0 },
    { "team_id": "...", "team_name": "Patan Street Animal Team", "distance_meters": 4499.6 }
  ]
}
```

---

## Health check

### `GET /health`
```json
{ "status": "ok", "service": "resq-aid-backend" }
```

---

## Frontend integration notes
- All requests other than `/api/cases` are currently **public** (no auth required).
- `/api/cases` requires a valid Bearer token — the frontend must have the user log in first and store the `access_token` (e.g. in memory/context; do **not** use localStorage per Claude artifact restrictions if built as an artifact — for a real Next.js app, a secure cookie or in-memory auth context is fine).
- CORS is enabled for all origins in dev.
- Case `status` lifecycle: `reported → triaged → dispatched → in_progress → rescued → closed / cancelled`. `/api/cases` currently sets `triaged` or `dispatched` automatically depending on whether a team was matched.