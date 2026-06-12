# SprintAI — AI-Powered Biomechanics & Motion Analysis Platform

A fully **local**, **offline-capable** human motion analysis system. Capture
movement from a webcam or uploaded video, detect 33 body landmarks with
MediaPipe Pose, compute biomechanical metrics, classify posture/activity with
TensorFlow, run OpenSim-grade inverse kinematics, and visualize everything in a
React dashboard.

> **No paid APIs. No cloud AI calls. Everything runs on your machine or your
> own Docker Compose stack.**

---

## Table of Contents

1. [Why this exists](#why-this-exists)
2. [System architecture](#system-architecture)
3. [Folder structure](#folder-structure)
4. [Tech stack & rationale](#tech-stack--rationale)
5. [Quick start](#quick-start)
6. [Development workflow](#development-workflow)
7. [Documentation index](#documentation-index)
8. [Implementation roadmap](#implementation-roadmap)

---

## Why this exists

Most "AI fitness" products send your video to a third-party API. That:

- **costs money per request**,
- **leaks biometric data** to vendors you don't control, and
- **stops working without internet**.

SprintAI replaces that with a self-hosted stack: webcam → MediaPipe (in-browser)
→ Node API → TensorFlow inference → OpenSim biomechanics → Postgres → React
dashboard. You own the data, the models, and the latency budget.

---

## System architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                  │
│  React + Vite + Tailwind                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐    │
│  │ WebRTC cam  │→ │ MediaPipe    │→ │ Canvas skeleton overlay   │    │
│  │ / file upld │  │ Pose (WASM)  │  │ Leaflet motion map        │    │
│  └─────────────┘  └──────┬───────┘  └───────────────────────────┘    │
└────────────────────────── │ ─────────────────────────────────────────┘
                            │ keypoints / frames (WebSocket + REST)
┌────────────────────────── ▼ ─────────────────────────────────────────┐
│                         BACKEND (Node)                               │
│  Express REST + Socket.IO              JWT auth, validation, MVC     │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ controllers │ services │ models │ middleware │ sockets       │    │
│  └────┬──────────────┬─────────────────┬─────────────────────────┘   │
└────── │ ──────────── │ ─────────────── │ ───────────────────────────┘
        │              │                 │
        ▼              ▼                 ▼
   ┌─────────┐   ┌──────────┐    ┌──────────────────┐
   │Postgres │   │  Redis   │    │ Python services   │
   │ users,  │   │ queues,  │    │ (HTTP, localhost) │
   │ sessions│   │ pubsub   │    │                   │
   │ frames, │   └──────────┘    │ • ML inference    │
   │ metrics │                   │ • OpenSim/OpenCap │
   └─────────┘                   └──────────────────┘
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for sequence diagrams,
threading model, and back-pressure strategy.

---

## Folder structure

```
sprintai-2/
├── README.md                      ← you are here
├── docker-compose.yml             ← one-shot local stack
├── .env.example
│
├── backend/                       ← Node.js + Express + Socket.IO
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── server.js              ← HTTP + WS bootstrap
│       ├── app.js                 ← Express app composition
│       ├── config/                ← env, db, logger
│       ├── controllers/           ← thin HTTP handlers
│       ├── services/              ← business logic
│       ├── models/                ← Prisma client + domain types
│       ├── routes/                ← /api/v1/*
│       ├── middleware/            ← auth, validate, error
│       ├── sockets/               ← Socket.IO namespaces
│       ├── validators/            ← Zod schemas
│       └── utils/                 ← angles, geometry, logger
│   └── prisma/
│       └── schema.prisma          ← DB schema (Postgres)
│
├── frontend/                      ← React + Vite + Tailwind
│   ├── package.json
│   ├── Dockerfile
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/            ← reusable UI
│       ├── pages/                 ← route-level views
│       ├── hooks/                 ← usePose, useWebcam, useSocket
│       ├── services/              ← API + WS clients
│       ├── store/                 ← Zustand stores
│       └── utils/                 ← angles, drawing
│
├── ml/                            ← Python TensorFlow pipeline
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── src/
│   │   ├── inference_server.py    ← FastAPI model serving
│   │   ├── models/                ← Keras model definitions
│   │   ├── training/              ← train_posture.py, train_activity.py
│   │   ├── data/                  ← dataset loaders
│   │   └── utils/                 ← feature extraction
│   └── scripts/
│
├── biomech/                       ← OpenSim / OpenCap pipeline
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── src/
│   │   ├── opensim_service.py     ← FastAPI IK/ID runner
│   │   ├── gait.py
│   │   ├── symmetry.py
│   │   └── rom.py
│   └── models/                    ← .osim musculoskeletal models
│
└── docs/
    ├── ARCHITECTURE.md
    ├── DATABASE.md                ← ER diagram + schema reference
    ├── API.md                     ← REST + WS contract
    ├── ROADMAP.md                 ← phased implementation plan
    ├── DEPLOYMENT.md              ← Docker / VPS / on-prem
    ├── SECURITY.md
    └── TESTING.md
```

---

## Tech stack & rationale

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **React + Vite** | Fast HMR, huge component ecosystem, easy to onboard contributors. |
| Styling | **Tailwind CSS** | Utility-first → no naming bikeshed; pairs well with shadcn-style components. |
| State | **Zustand** | 2 kB, no Provider boilerplate, perfect for streaming pose data. |
| Pose detection | **MediaPipe Pose (WASM, in-browser)** | Runs at 30 fps on a laptop CPU; no server round-trip per frame; biometric data never leaves the client. |
| Map / heatmap | **Leaflet.js + leaflet.heat** | Open-source, projection-agnostic; we repurpose it for normalized motion-space coordinates. |
| Backend | **Node.js + Express** | Plays nicely with Socket.IO; non-blocking I/O ideal for high-frequency frame ingest. |
| Realtime | **Socket.IO** | Auto-fallback to long-polling, rooms per session, simple back-pressure. |
| Auth | **JWT (access + refresh)** | Stateless, scales horizontally; refresh tokens stored httpOnly. |
| DB | **PostgreSQL + Prisma** | Strong relational fit for users → sessions → frames → metrics; Prisma gives typed queries + migrations. |
| Cache/queue | **Redis** | Pub/sub between Node workers; rate-limit buckets. |
| ML training | **TensorFlow / Keras (Python)** | Mature, well-supported; can export to TF.js for optional in-browser inference. |
| ML serving | **FastAPI + TF SavedModel** | Local HTTP microservice; sub-10ms inference for small MLPs. |
| Biomechanics | **OpenSim (Python bindings)** | Gold-standard IK/ID; OpenCap workflow for marker-less mocap. |
| Container | **Docker Compose** | One command spins the whole stack on any laptop. |

---

## Quick start

The only prerequisite is **Docker Desktop** (or Docker Engine + Compose).

### Production — run it like a real deployment

```bash
# 1. Clone & enter
git clone https://github.com/fresh-prog/sprintai-2.git
cd sprintai-2

# 2. Generate .env with random secrets (one-time)
./scripts/setup.sh                                        # macOS / Linux / Git Bash
# powershell -ExecutionPolicy Bypass -File scripts\setup.ps1   # Windows PowerShell

# 3. Build and start everything
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Open **http://localhost:8080** — or **http://\<this-machine's-IP\>:8080**
from any other device on the network. Each person registers their own
account; all data is scoped per user. Database migrations run automatically
on first boot. Only port 8080 is exposed; Postgres, Redis, and the Python
services stay on the internal Docker network.

### Public hosting with HTTPS (free Let's Encrypt certs)

On a public server with a domain name, add the HTTPS overlay — Caddy
obtains and renews certificates automatically:

```bash
# .env: set DOMAIN=your.domain.com  (DNS A record → this server)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  -f docker-compose.https.yml up -d --build
```

The app is then served at `https://your.domain.com` with HTTP→HTTPS
redirects and HSTS. Note: webcam capture requires HTTPS (or localhost) —
browsers block camera access on plain-HTTP origins, so use this overlay
for any internet-facing deployment.

### Development — hot reload

```bash
./scripts/setup.sh        # once
docker compose up --build

# Services:
#   Frontend ........ http://localhost:5173
#   Backend API ..... http://localhost:4000
#   ML service ...... http://localhost:8001
#   Biomech service.. http://localhost:8002
#   Postgres ........ localhost:5432
#   Redis ........... localhost:6379
```

For **local dev without Docker**, see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Development workflow

1. **Branch** off `main` with `feat/<area>-<short-desc>` or `fix/<…>`.
2. **Code** the smallest vertical slice that delivers value.
3. **Test** — unit tests next to the code (`*.test.js` / `test_*.py`).
4. **Lint** — `npm run lint` / `ruff check ml biomech`.
5. **PR** with a checklist (see `.github/pull_request_template.md`).
6. **CI** runs lint + tests + a Docker build smoke check.
7. **Review** by at least one teammate; squash-merge.

---

## Documentation index

| Doc | What's inside |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Component diagram, sequence diagrams, threading model. |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Tables, relations, indexes, ER diagram. |
| [`docs/API.md`](docs/API.md) | REST endpoints + Socket.IO events. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase-by-phase implementation plan. |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Docker, VPS, on-prem. |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, hardening checklist. |
| [`docs/TESTING.md`](docs/TESTING.md) | Unit / integration / e2e strategy. |

---

## Implementation roadmap

| Phase | Goal | Key deliverables |
|---|---|---|
| **1. Foundation** | Repo bootstrapped, dev loop works | Docker compose, auth, empty dashboard |
| **2. Pose pipeline** | Live skeleton in the browser | MediaPipe hook, canvas overlay, WS ingest |
| **3. ML services** | Posture & activity classification | TF training script, FastAPI inference, REST glue |
| **4. Biomechanics** | Joint angles, ROM, symmetry, gait | OpenSim pipeline, derived-metrics service |
| **5. Visualization** | Dashboard, charts, motion map | Recharts, Leaflet heatmap, session replay |
| **6. Hardening** | Production-ready | Tests, perf, security, observability |

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the per-phase task breakdown.

---

## License

MIT — see [`LICENSE`](LICENSE).
