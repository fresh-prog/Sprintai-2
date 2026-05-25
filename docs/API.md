# API Reference

Base URL: `http://localhost:4000/api/v1` (dev). All requests/responses are
JSON. Auth uses `Authorization: Bearer <access_token>`.

## Conventions

- **Errors**: `{ "error": { "code": "STRING_CODE", "message": "human msg", "details": {...} } }`
- **Pagination**: `?page=1&limit=50` → `{ data: [...], page, limit, total }`
- **Timestamps**: ISO 8601 UTC.

---

## Auth

### `POST /auth/register`
```json
// body
{ "email": "a@b.com", "password": "...", "displayName": "Alice" }
// 201
{ "user": { "id": "...", "email": "...", "displayName": "...", "role": "USER" } }
```

### `POST /auth/login`
```json
// body
{ "email": "a@b.com", "password": "..." }
// 200 — sets refresh_token cookie (httpOnly, sameSite=lax)
{ "accessToken": "jwt...", "user": {...} }
```

### `POST /auth/refresh`
Uses the `refresh_token` cookie. Returns a new `accessToken`.

### `POST /auth/logout`
Revokes the refresh token, clears the cookie.

### `GET /auth/me`
Returns the authenticated user.

---

## Sessions

### `POST /sessions`
Start a new motion-capture session.
```json
// body
{ "label": "Squat warmup", "source": "WEBCAM", "meta": { "fps": 30 } }
// 201
{ "id": "uuid", "status": "ACTIVE", ... }
```

### `GET /sessions`
List sessions for the current user.

### `GET /sessions/:id`
Full session bundle (metadata + summary metrics).

### `PATCH /sessions/:id`
Update `label`, `meta`, or `status` (`COMPLETED|FAILED`).

### `DELETE /sessions/:id`
Cascades to frames/metrics/predictions.

### `POST /sessions/:id/upload`
`multipart/form-data` video upload. Returns a `videoAssetId`. Triggers
background frame extraction.

---

## Pose

### `POST /sessions/:id/frames`
Bulk-ingest pose frames (alternative to WebSocket).
```json
{
  "frames": [
    { "frameIdx": 0, "tsMs": 0, "keypoints": [{ "i": 0, "x": 0.5, "y": 0.4, "z": 0.0, "vis": 0.99 }, ...] }
  ]
}
```

### `GET /sessions/:id/frames?from=0&to=300`
Range query for replay.

---

## Analytics

### `GET /sessions/:id/metrics?name=left_knee_angle`
Time series for one or many metrics.

### `GET /sessions/:id/predictions?kind=POSTURE`
Predicted labels over time.

### `GET /sessions/:id/summary`
Aggregate report: ROM, symmetry, gait cadence, top activity, mean confidence.

### `GET /admin/analytics`
Admin-only aggregate (sessions/day, top activities, error rate).

### `GET /sessions/:id/export?format=json|csv`
Stream a session's frames, metrics, and predictions as a downloadable file.
- `format=json` returns one object containing the session record, frames,
  metrics, and predictions. Used by the "Export JSON" button on the session
  detail page.
- `format=csv` returns a flat `ts_ms,name,value` series of metrics and
  prediction confidences — easy to drop into Excel / Pandas.

### `GET /sessions/:id/report.pdf`
Returns a single-page PDF session report (pdfkit-rendered) with capture
summary, biomech metrics (ROM, symmetry, gait), and the top predictions by
frequency. Streamed as `application/pdf`.

---

## WebSocket — `/ws/pose`

Socket.IO namespace. Authenticate by passing `auth: { token }` in
`io(URL, { auth })`.

### Client → Server

| Event | Payload | Notes |
|---|---|---|
| `session:join` | `{ sessionId }` | Joins the session's room. |
| `pose:window` | `{ frames: PoseFrame[] }` | 1–32 frames per emit; server may drop if buffer is full. |
| `session:end` | `{ sessionId }` | Marks session COMPLETED. |

### Server → Client

| Event | Payload | Notes |
|---|---|---|
| `pose:ack` | `{ received, dropped }` | Per-window ack. |
| `prediction:posture` | `{ tsMs, label, confidence }` | From ML svc. |
| `prediction:activity` | `{ tsMs, label, confidence }` | From ML svc. |
| `metric:angles` | `{ tsMs, angles: { ... } }` | From biomech svc. |
| `feedback` | `{ severity, message, joint? }` | Coaching hint. |
| `error` | `{ code, message }` | Recoverable error. |
