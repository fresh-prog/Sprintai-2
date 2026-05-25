# Architecture

## 1. Goals & constraints

- **Local-first**: no third-party AI/SaaS dependencies; the system must run on
  a single laptop *and* scale horizontally on a small cluster.
- **Realtime**: live pose feedback at ≥ 25 fps end-to-end.
- **Privacy**: raw video never leaves the client by default; only normalized
  keypoints + derived metrics hit the network.
- **Modularity**: ML and biomechanics are isolated services so they can be
  re-implemented (e.g. swap TensorFlow → PyTorch) without touching the API.

## 2. Component diagram

```
        ┌───────────────────────────────────────────────────────────────┐
        │                          BROWSER                              │
        │                                                               │
        │  WebRTC ── MediaPipe Pose (WASM) ── Canvas overlay            │
        │      │              │                                         │
        │      ▼              ▼                                         │
        │  File upload    Frame batcher ──► Socket.IO client            │
        │                                       │                       │
        │  Leaflet motion-map ◄── derived ──────┤                       │
        │  Recharts joint plots ◄── metrics ────┤                       │
        └────────────────────────────────────────┼──────────────────────┘
                                                 │
                                                 ▼
        ┌──────────────────────────────────────────────────────────────┐
        │                        BACKEND (Node)                        │
        │                                                              │
        │  REST  /api/v1/auth, /sessions, /pose, /analytics            │
        │  WS    /ws/pose namespace, per-session rooms                 │
        │                                                              │
        │  controllers → services → models (Prisma)                    │
        │                  │                                           │
        │                  ├── inference client → ML service           │
        │                  └── biomech client   → OpenSim service      │
        └────┬──────────────────┬──────────────────────┬───────────────┘
             │                  │                      │
             ▼                  ▼                      ▼
        ┌────────┐         ┌─────────┐           ┌─────────────────┐
        │Postgres│         │  Redis  │           │ Python services │
        └────────┘         └─────────┘           └─────────────────┘
```

## 3. Sequence: live capture

```
Browser            Backend           Redis          ML svc        Biomech svc
   │ WS connect       │                 │              │                │
   ├─────────────────►│                 │              │                │
   │                  │ auth.verify     │              │                │
   │                  │                 │              │                │
   │ start_session    │                 │              │                │
   ├─────────────────►│ INSERT session  │              │                │
   │                  │────────────►Postgres           │                │
   │ pose_frame (33pts, ts)             │              │                │
   ├─────────────────►│ buffer (Redis stream)          │                │
   │                  │────────────►    │              │                │
   │                  │ every 250ms: drain → features  │                │
   │                  │ POST /predict                  │                │
   │                  ├──────────────────────────────► │                │
   │                  │ ◄──────── posture, activity ─ │                 │
   │                  │ POST /angles, /symmetry                         │
   │                  ├────────────────────────────────────────────────►│
   │                  │ ◄──────────── joint angles, ROM ────────────────│
   │ feedback         │                                                 │
   │ ◄────────────────┤                                                 │
```

## 4. Why two Python services instead of one?

| Service | Workload | Why split |
|---|---|---|
| **ML inference** | Stateless, microseconds, vectorized | Scales by replication; reload-on-train. |
| **Biomech** | Stateful per-session, hundreds of ms, OpenSim C++ bindings | OpenSim leaks memory across long runs; isolating it lets us restart workers without dropping ML. |

## 5. Data flow & back-pressure

- Browser batches frames in **8-frame windows (~250 ms)** before emitting to
  cut WS overhead.
- Backend pushes raw windows to a **Redis stream per session**
  (`pose:stream:<sessionId>`) with `MAXLEN ~ 5000` for bounded memory.
- A consumer group of Node workers (`pose-consumer`) drains the stream and:
  1. persists down-sampled frames (every 5th) to Postgres,
  2. forwards features to the ML service,
  3. forwards windows to the biomech service every N seconds.
- If ML/biomech can't keep up, we **drop windows, never frames in Postgres** —
  user-facing feedback degrades gracefully but the record stays complete.

## 6. Threading & concurrency

- **Node**: single event loop per process; CPU-heavy math (Procrustes
  alignment, FFT for cadence) runs in a **worker_threads** pool.
- **Python ML**: FastAPI + Uvicorn with `--workers=2` (per CPU pair); TF uses
  intra-op parallelism for batch=1.
- **Python biomech**: single worker per process (OpenSim is not thread-safe);
  scale by replicas behind a round-robin gateway.

## 7. Storage layout

- **Postgres**: source of truth for users, sessions, frames (down-sampled),
  metrics, predictions.
- **Redis**: ephemeral streams, rate-limit buckets, pubsub for admin events.
- **Object storage (local disk for now)**: raw uploaded videos in `uploads/`;
  swap for S3-compatible (MinIO) when needed.

## 8. Observability

- **Logs** — structured JSON via `pino` (Node) and `structlog` (Python).
- **Metrics** — `/metrics` endpoint in each service, scraped by Prometheus
  (optional, off by default).
- **Tracing** — OpenTelemetry SDK wired but disabled unless `OTEL_EXPORTER_*`
  is set.
