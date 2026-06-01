# Database Schema

PostgreSQL 16, managed via Prisma (`backend/prisma/schema.prisma`).

Sprint AI v2 adds the `Athlete` table and the `Athlete ↔ Session` link.
See [`SPRINT_AI_V2.md`](SPRINT_AI_V2.md) §3 for the rationale and the
metric-naming convention (`summary.*` vs `sprint.*`).

## ER diagram

```mermaid
erDiagram
    USER ||--o{ SESSION : owns
    USER ||--o{ REFRESH_TOKEN : holds
    SESSION ||--o{ POSE_FRAME : contains
    SESSION ||--o{ METRIC : produces
    SESSION ||--o{ PREDICTION : produces
    SESSION ||--o| VIDEO_ASSET : has

    USER {
      uuid    id PK
      string  email UK
      string  password_hash
      string  display_name
      enum    role  "USER|ADMIN"
      tstz    created_at
    }

    REFRESH_TOKEN {
      uuid    id PK
      uuid    user_id FK
      string  token_hash UK
      tstz    expires_at
      tstz    revoked_at
    }

    SESSION {
      uuid    id PK
      uuid    user_id FK
      string  label
      enum    source  "WEBCAM|UPLOAD"
      enum    status  "ACTIVE|COMPLETED|FAILED"
      tstz    started_at
      tstz    ended_at
      jsonb   meta     "fps, resolution, device, notes"
    }

    VIDEO_ASSET {
      uuid    id PK
      uuid    session_id FK,UK
      string  storage_path
      int     duration_ms
      int     width
      int     height
      tstz    uploaded_at
    }

    POSE_FRAME {
      bigserial id PK
      uuid    session_id FK
      int     frame_idx
      int     ts_ms
      jsonb   keypoints  "[{i,x,y,z,vis}, ... 33]"
      float   confidence
    }

    METRIC {
      bigserial id PK
      uuid    session_id FK
      string  name        "left_knee_angle|symmetry_idx|..."
      int     ts_ms
      float   value
      jsonb   meta
    }

    PREDICTION {
      bigserial id PK
      uuid    session_id FK
      enum    kind        "POSTURE|ACTIVITY|INJURY_RISK|FORM"
      int     ts_ms
      string  label
      float   confidence
      jsonb   meta
    }
```

## Index strategy

| Table | Index | Reason |
|---|---|---|
| `user(email)` | unique | login lookup |
| `refresh_token(token_hash)` | unique | rotation check |
| `refresh_token(user_id, expires_at)` | btree | cleanup queries |
| `session(user_id, started_at DESC)` | btree | "my recent sessions" |
| `pose_frame(session_id, frame_idx)` | btree | sequential scan during replay |
| `metric(session_id, name, ts_ms)` | btree | charting queries |
| `prediction(session_id, kind, ts_ms)` | btree | filtered timelines |

## Retention

- `pose_frame` is the largest table by volume. We persist **every 5th frame**
  (~6 fps) by default; raw 30 fps stays in Redis only.
- A nightly job (`backend/src/jobs/retention.js`) deletes `pose_frame` rows
  older than `POSE_RETENTION_DAYS` (default 90).

## Migrations

```bash
cd backend
npx prisma migrate dev --name init      # creates a new migration
npx prisma migrate deploy               # applies in prod / CI
npx prisma studio                       # browse the DB
```
