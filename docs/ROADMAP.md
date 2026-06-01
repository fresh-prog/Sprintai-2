# Implementation Roadmap

Each phase is **demoable on its own**. You should be able to merge phase N to
`main` and ship value before starting phase N+1.

---

## Phase 1 — Foundation (1 week)

**Goal**: anyone can clone the repo, run `docker compose up`, register, log in,
see an empty dashboard.

- [x] Repo bootstrap, `.gitignore`, `README`, `.env.example`
- [x] `docker-compose.yml` with postgres + redis + node + vite
- [x] Backend skeleton: Express + Prisma + JWT auth + error middleware
- [x] Frontend skeleton: React + Vite + Tailwind + router + Zustand
- [x] Auth flow end-to-end (register/login/me/logout)
- [x] CI: lint + unit tests on PR

**Done when** new dev can finish "register → login → dashboard" in ≤ 5 min.

---

## Phase 2 — Pose pipeline (1–2 weeks)

**Goal**: live skeleton in the browser, frames flowing to the backend.

- [x] `useWebcam` hook with permissions + device selection
- [x] MediaPipe Pose initialization (Tasks Vision JS, WASM in `/public`)
- [x] Canvas overlay component (skeleton + landmark labels)
- [x] Frame batcher (8 frames per emit)
- [x] Socket.IO namespace `/ws/pose` with auth + rooms
- [x] Redis stream ingest + Node consumer
- [x] Down-sampled persistence to `pose_frame`
- [x] Session start/end controls

**Done when** a recorded 30 s webcam session shows up in `pose_frame` and the
overlay is smooth (≥ 25 fps).

---

## Phase 3 — ML services (2 weeks)

**Goal**: posture + activity classification on the live stream.

- [x] Feature extractor (33 keypoints → angle/ratio vector)
- [x] Posture classifier: small MLP, 5 classes
      (`upright | hunched | leaning_left | leaning_right | slouched`)
- [x] Activity classifier: TCN, 6 classes
      (`idle | walk | run | squat | jump | sit`)
- [x] Training scripts on a synthetic + open dataset (synthetic ready; UCF-Pose ingest TODO)
- [x] FastAPI inference server (`/predict/posture`, `/predict/activity`)
- [x] Node client + Socket.IO emit of predictions
- [x] In-browser TF.js model option for offline mode (loader + posture fallback wired; train + convert per CONTRIBUTING.md)

**Done when** moving in front of the webcam triggers `prediction:activity`
events that match what you're actually doing.

---

## Phase 4 — Biomechanics (2 weeks)

**Goal**: joint angles, ROM, symmetry, gait cadence.

- [x] Pure-Python angle module (no OpenSim) for hot path
- [x] OpenSim wrapper service (`opensim-core` PyPI) for IK on completed sessions
- [x] Symmetry index (Robinson) — left/right joint comparison
- [x] Gait cadence via heel-strike detection on ankle Y-velocity
- [x] ROM aggregation per joint per session
- [x] WebSocket `metric:angles` real-time emit
- [x] Background job: full IK pass on session completion

**Done when** a recorded squat session reports peak knee flexion within 3° of
a manual measurement.

---

## Phase 5 — Visualization (1–2 weeks)

**Goal**: a dashboard that's worth looking at.

- [x] Session list page with filters
- [x] Session detail: skeleton player + scrubbable timeline
- [x] Recharts: per-joint angle traces, predictions, confidence
- [x] Leaflet motion map: hip-center trajectory + heatmap of dwell time
- [x] Summary cards (peak ROM, symmetry, dominant activity)
- [x] Export session as JSON / CSV

**Done when** a non-engineer can open a session and explain what happened.

---

## Phase 6 — Hardening (ongoing)

**Goal**: production-ready.

- [x] Unit tests for backend utils + auth integration test (Vitest + supertest)
- [x] Service-layer tests for `token.service` and `pose.service`; ML smoke test for the train pipeline
- [x] Playwright e2e harness: register/login/redirect + capture spec behind `VITE_E2E_MOCK_POSE=1`
- [x] Load test: k6 script for 25–100 concurrent WS sessions
- [x] Helmet + rate limits (CSRF: cookie uses `sameSite=lax`; document tradeoffs)
- [x] Structured logs + Prometheus `/metrics` endpoint
- [x] Docker image hardening (multi-stage, non-root, Trivy scan in CI)
- [x] Backup strategy for Postgres (`scripts/backup/pg_backup.sh`) + uploads (restic guidance)
- [x] CONTRIBUTING.md + screencast script & shot list (`docs/SCREENCAST.md`)

---

## Stretch goals

- Multi-person tracking (MediaPipe Holistic + ReID)
- Mobile app (React Native + MediaPipe iOS/Android)
- Federated training across instances
- [x] Rep counting + exercise-specific form rubrics (squat + push-up; biomech `/reps` endpoint)
- [x] Physio-grade reports (PDF via pdfkit at `GET /sessions/:id/report.pdf`)

---

## Sprint AI v2 (the talent-identification platform)

Tracks the deck — see [`SPRINT_AI_V2.md`](SPRINT_AI_V2.md) for the full
architecture and [`RESEARCH_METHODOLOGY.md`](RESEARCH_METHODOLOGY.md) for the
Ugandan-cohort study.

### Phase 7 — Sprint-specific analysis (this commit)

- [x] Multi-role data model: `ATHLETE | COACH | RESEARCHER | ADMIN`
- [x] `Athlete` table linked to `User` (self) and `User` (coach)
- [x] `Session.athleteId` + `Session.event` (S100M / S200M / S400M / RELAY / PRACTICE)
- [x] Biomech `/sprint` endpoint — stride length / freq, GCT, trunk lean,
      knee drive, arm swing, velocity, phase timeline, **sprint score (0–100)**
- [x] Backend finalizer persists `sprint.*` metrics + `SPRINT_PHASE` predictions
- [x] Athletes page + CRUD (`/api/v1/athletes`)
- [x] Drag-drop video upload page (MP4 / MOV / AVI / MKV / WebM, ≤ 200 MB)
- [x] 3D athlete viewer (`@react-three/fiber`) — rotatable skeleton + hip trail
- [x] Sprint scorecard (two SVG score rings + 6 benchmarked sub-metrics)
- [x] Phase timeline (stacked horizontal bar, deck colors)
- [x] Research methodology doc — Ugandan cohort, IRB, consent, capture protocol

### Phase 8 — ML upgrades

- [x] Server-side video → MediaPipe Pose worker (Python) for uploaded clips
- [x] Athlete similarity model (k-NN on normalized 6-feature technique vector)
- [x] Performance prediction (linear model → 100m time + confidence band)
- [x] Injury-risk classifier (rule-based: asymmetry, GCT outliers, knee drive, trunk lean)
- [ ] TCN phase classifier (replaces heuristic phase timeline)
- [ ] Technique error detection (per-frame fault tags)

### Phase 9 — Visualization & connection

- [x] Global Talent Map (Leaflet world view of anonymized scores by country)
- [x] Chart.js performance-over-time per athlete (`AthleteTrendline`)
- [x] Insights panel on session detail (predicted time / injury risk / similar athletes)
- [ ] D3 elite-fan comparison chart (athlete vs elite distribution)
- [ ] Coach roster bulk-upload (CSV)
- [ ] Research consent flow + cohort export endpoint
- [ ] Mobile-first capture UI (works on a phone browser)
