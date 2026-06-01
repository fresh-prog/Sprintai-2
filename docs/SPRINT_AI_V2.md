# Sprint AI v2 — Technical Architecture

This document is the canonical engineering reference for the Sprint AI
platform: the full 100m / 200m talent-identification system described in
`/Sprint AI presentation`. It expands on `ARCHITECTURE.md` (the generic
biomechanics platform) with the sprint-specific components.

> **Status legend**: ✅ shipped on `main` · 🟡 partially shipped · 🔴 planned.

---

## 1. Vision

> "Sprint AI tackles a real global problem: the systematic failure to discover
> athletic talent. By combining computer vision and machine learning, we give
> every athlete — regardless of where they were born — a fair chance to be seen."

We operationalize that vision as a five-stage funnel:

```
   Record  ──►  Upload  ──►  Analyze  ──►  Score  ──►  Connect
  (phone)     (cloud)    (MediaPipe +    (sprint   (coach view +
              or local    biomech)        score +   global map)
              webcam)                     phases)
```

Each stage maps to a concrete artefact in this repo — see §4.

---

## 2. Personas & roles

| Role | Read | Write | Notes |
|---|---|---|---|
| **Athlete**     | own profile, own sessions | own sessions   | Default for self-coached users. |
| **Coach**       | own roster | roster + sessions on behalf of roster | Multi-athlete management. |
| **Researcher**  | anonymized cohort | nothing on personal data | Cohort analytics + dataset export. |
| **Administrator** | all data | all data | Cohort moderation, federation rollout. |

Roles live in the `Role` Prisma enum (`USER | ATHLETE | COACH | RESEARCHER | ADMIN`).
The legacy `USER` value is kept for the existing demo accounts.

---

## 3. Data model deltas vs v1

### New tables

- **`athlete`** — sprinter profile (canonical record):
  - `userId` (nullable) — links to the User account if the athlete signs up.
  - `coachId` (nullable) — links to a Coach. Athletes can be coach-managed
    before they ever create a user account.
  - `primaryEvent` — `SprintEvent` enum (`S100M | S200M | S400M | RELAY | PRACTICE`).
  - Demographics: `dateOfBirth`, `sex`, `heightCm`, `weightKg`, `country` (ISO).
  - Indexed on `coachId` (roster query) and `country` (research cohort).

### Updated tables

- **`session`** — gains `athleteId` (FK to athlete) and `event` (SprintEvent).
  - One session targets one athlete; the owner (`userId`) is who uploaded it
    (athlete themselves or their coach).
  - `status` enum gains `PROCESSING` for between-upload-and-finalize.
- **`prediction.kind`** enum gains `SPRINT_PHASE`, `TECHNIQUE_ERROR`,
  `PERFORMANCE` so the finalizer can persist phase timelines.

### Metric naming convention

The finalizer writes pivoted rows so the dashboard doesn't recompute:

| Prefix | Owner | Examples |
|---|---|---|
| `summary.rom.*`        | biomech `/summary` | `summary.rom.left_knee` (degrees) |
| `summary.symmetry.*`   | biomech `/summary` | `summary.symmetry.knee` (0–100 %) |
| `summary.gait.*`       | biomech `/summary` | `summary.gait.cadence_spm` |
| **`sprint.*`**         | biomech `/sprint`  | `sprint.sprint_score`, `sprint.stride_freq_hz`, … |

Sprint phases are persisted as `Prediction` rows with `kind = SPRINT_PHASE`
and the phase name as `label`. `meta.endMs` + `meta.durationMs` give the
timeline.

---

## 4. Funnel → file map

### 4.1 Record

- **Webcam (live)**: `frontend/pages/Capture.jsx` →
  `frontend/hooks/usePoseDetector.js` (MediaPipe Pose, WASM, 33 landmarks) →
  Socket.IO `pose:window` → backend Redis stream → `sessionFinalizer.service.js`.
- **Phone upload (fixture)**: `frontend/pages/Upload.jsx` (drag-drop MP4 / MOV /
  AVI / MKV / WebM, ≤ 200 MB) → `POST /sessions` then `POST /sessions/:id/upload`
  → `backend/services/upload.service.js`.
- 🔴 **Server-side frame extraction** (Phase 7 task) — a Python worker that
  consumes uploaded videos, runs MediaPipe Pose offline, and writes
  `PoseFrame` rows. Until that's wired, uploaded videos sit as raw assets
  while the live capture path produces the frames.

### 4.2 Upload

- Multipart endpoint: `POST /sessions/:id/upload` (multer memory storage).
- Stored under a randomized UUID name in `$UPLOAD_DIR/<uuid>.<ext>`.
- One `VideoAsset` row per session — `storagePath`, `durationMs`, `width`,
  `height`.

### 4.3 Analyze

- **In-browser**: MediaPipe → 33 landmarks per frame. Normalized image coords.
- **Server-side biomech** (`biomech/`):
  - `geometry.frame_angles` — joint angles per frame.
  - `gait.cadence_from_frames` — heel-strike-based cadence.
  - `sprint.analyze_sprint` — stride length / frequency, GCT, trunk lean,
    knee drive, arm swing, horizontal velocity, **sprint phase timeline**.
  - `ik.run_ik` — optional OpenSim IK pass when the wheel + a `.osim` model
    are present; falls back to pure-Python angle estimator otherwise.

### 4.4 Score

`sprint.analyze_sprint` produces two composite scores (0–100):

- **Technique score** = mean of six Gaussian-distance scores, each measuring
  proximity to an elite benchmark:
  - Stride length (× leg length), target 2.6, σ 0.5
  - Stride frequency (Hz), target 4.7, σ 0.8
  - Ground contact time (ms), target 92, σ 25
  - Trunk lean (deg), target 7.5, σ 5
  - Knee drive (deg), target 95, σ 20
  - Arm swing amplitude (deg), target 85, σ 25
- **Sprint score** = 0.6 × technique + 0.4 × velocity component (velocity
  normalized against 4.0 body-heights / second, ~12 m/s for a 1.85 m athlete).

Elite benchmarks come from Mero & Komi (1986), Weyand et al. (2000), Bushnell
& Hunter (2007). Constants live in `biomech/src/sprint.py::ELITE`.

### 4.5 Sprint phases

`sprint._phase_timeline` slices the run into six phases using velocity profile
+ trunk lean heuristics:

| Phase             | Heuristic                                        |
|---|---|
| `acceleration`    | initial — velocity rising from 0                 |
| `drive`           | velocity > 55 % of peak                          |
| `transition`      | trunk lean < 12° **and** velocity > 85 % of peak |
| `max_velocity`    | velocity > 97 % of peak                          |
| `speed_endurance` | velocity drops below 90 % of peak                |
| `finish`          | final 0.5 s                                      |

🔴 **Phase 8 upgrade**: replace heuristics with a TCN classifier trained on
labeled phase data. Output kept identical so the UI doesn't change.

### 4.6 Connect

- **Athletes page** (`/athletes`) — coach roster + add-athlete modal.
- 🔴 **Global Talent Map** — Leaflet world map of anonymized hip-trajectory
  scores by country (we already track `athlete.country`).

---

## 5. Components

### 5.1 Frontend

- `components/Athlete3D.jsx` — react-three-fiber 3D athlete viewer.
  Renders the persisted pose frames as a rotatable skeleton (cylinder bones
  + colored joints) with a hip-center trail and grid floor.
- `components/SprintScorecard.jsx` — hero dashboard for a finalized sprint:
  two SVG score rings + six benchmark-coloured sub-metrics.
- `components/PhaseTimeline.jsx` — stacked horizontal bar of the six sprint
  phases with deck-matched colors.
- `pages/Upload.jsx` — drag-drop video upload with progress + event picker.
- `pages/Athletes.jsx` — roster view with add-athlete modal.

### 5.2 Backend

- `services/sessionFinalizer.service.js` — calls both `/summary` (generic
  biomech) and `/sprint` (sprint-specific) in parallel and persists the
  pivoted metrics + phase timeline. Idempotent.
- `services/biomech.client.js::analyzeSprint` — wraps the Python `/sprint`
  endpoint.
- `services/athlete.service.js` + `controllers/athlete.controller.js` +
  `routes/athlete.routes.js` — CRUD for the `Athlete` table with
  role-scoped access (athletes see their own profile, coaches see their
  roster, researchers + admins see everyone).

### 5.3 Biomech service

- `biomech/src/sprint.py` — the sprint analyzer. Pure NumPy + SciPy; no
  OpenSim dependency. Designed to run on a 4-core box in tens of ms per
  100m session.
- `biomech/tests/test_sprint.py` — synthetic-trajectory smoke tests.

---

## 6. Open work (Sprint AI v2 → v2.5)

| # | Item | Where it lands |
|---|---|---|
| 1 | Python frame-extraction worker for uploaded videos | `biomech/` or new `video/` service |
| 2 | TCN phase classifier (replaces heuristic timeline) | `ml/src/models/phase.py` |
| 3 | Athlete similarity model (k-NN on technique vectors) | `ml/src/models/similarity.py` |
| 4 | Performance prediction (e.g. 100m time from form) | `ml/src/models/perf.py` |
| 5 | Injury risk classifier (asymmetry + GCT outliers) | `ml/src/models/injury.py` |
| 6 | Global Talent Map (Leaflet world view) | `frontend/pages/TalentMap.jsx` |
| 7 | D3 comparison fan chart (athlete vs elite vs peers) | `frontend/components/EliteFan.jsx` |
| 8 | Chart.js performance-over-time per athlete | `frontend/components/AthleteTrendline.jsx` |
| 9 | Coach roster bulk-upload + CSV ingest | `backend/routes/athletes/import` |
| 10 | Research consent flow + cohort export | new `Consent` table |

---

## 7. Where to look first

If you're a new contributor coming in cold:

1. Read `README.md` then this file.
2. Trace one sprint end-to-end:
   - Upload video → `frontend/pages/Upload.jsx`
   - Multipart POST → `backend/services/upload.service.js`
   - Session end → `backend/services/sessionFinalizer.service.js`
   - Biomech call → `biomech/src/sprint.py::analyze_sprint`
   - Render → `frontend/pages/SessionDetail.jsx` →
     `SprintScorecard` + `PhaseTimeline` + `Athlete3D`
3. Skim `docs/MODULES.md` for the original-spec → file mapping.
