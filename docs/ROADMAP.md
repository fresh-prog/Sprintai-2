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
- [ ] In-browser TF.js model option for offline mode

**Done when** moving in front of the webcam triggers `prediction:activity`
events that match what you're actually doing.

---

## Phase 4 — Biomechanics (2 weeks)

**Goal**: joint angles, ROM, symmetry, gait cadence.

- [ ] Pure-Python angle module (no OpenSim) for hot path
- [ ] OpenSim wrapper service (`opensim-core` PyPI) for IK on completed sessions
- [ ] Symmetry index (Robinson) — left/right joint comparison
- [ ] Gait cadence via heel-strike detection on ankle Y-velocity
- [ ] ROM aggregation per joint per session
- [ ] WebSocket `metric:angles` real-time emit
- [ ] Background job: full IK pass on session completion

**Done when** a recorded squat session reports peak knee flexion within 3° of
a manual measurement.

---

## Phase 5 — Visualization (1–2 weeks)

**Goal**: a dashboard that's worth looking at.

- [ ] Session list page with filters
- [ ] Session detail: video/skeleton player + scrubbable timeline
- [ ] Recharts: per-joint angle traces, predictions, confidence
- [ ] Leaflet motion map: hip-center trajectory + heatmap of dwell time
- [ ] Summary cards (peak ROM, symmetry, dominant activity)
- [ ] Export session as JSON / CSV

**Done when** a non-engineer can open a session and explain what happened.

---

## Phase 6 — Hardening (ongoing)

**Goal**: production-ready.

- [ ] Unit tests ≥ 70 % coverage for backend & ML feature code
- [ ] Playwright e2e: register → record → see prediction
- [ ] Load test: 50 concurrent sessions on a 4-core box
- [ ] Helmet, CSRF on cookie endpoints, rate limits
- [ ] Structured logs + `/metrics` endpoints
- [ ] Docker image hardening (non-root user, multi-stage, scan with Trivy)
- [ ] Backup strategy for Postgres + uploads
- [ ] Documentation polish + onboarding screencast

---

## Stretch goals

- Multi-person tracking (MediaPipe Holistic + ReID)
- Mobile app (React Native + MediaPipe iOS/Android)
- Federated training across instances
- Rep counting + exercise-specific form rubrics
- Physio-grade reports (PDF)
