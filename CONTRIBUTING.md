# Contributing to SprintAI

Welcome. This guide gets you from a fresh clone to a merged PR in ~30 minutes.

---

## 1. Prerequisites

- **Docker + Compose v2** (the easiest path; everything else falls out of this).
- **Node 20+** and **Python 3.11+** if you want to run services outside Docker.
- **git** and a GitHub account with access to the repo.

That's it. No paid API keys, no cloud setup.

---

## 2. First-run checklist

```bash
git clone https://github.com/fresh-prog/sprintai-2.git
cd sprintai-2

cp .env.example .env
# Edit .env if you want to change ports or secrets. Defaults are fine for dev.

docker compose up --build
```

Once everything settles (~2 min on a cold cache):

- Open `http://localhost:5173`
- Register an account → land on the dashboard → click **Capture**
- Allow the camera prompt; you should see your skeleton on the canvas with
  posture / activity / joint-angle cards updating live.

If any of that doesn't happen, see [Debugging](#7-debugging).

---

## 3. Project layout

```
backend/   Express + Prisma + Socket.IO
frontend/  React + Vite + Tailwind + MediaPipe Pose
ml/        TensorFlow training + FastAPI inference (Python)
biomech/   OpenSim/SciPy biomechanics service (Python)
e2e/       Playwright golden-path tests
docs/      Architecture, API, database, deployment, security, testing
scripts/   Load test (k6), pg backup
```

See [`docs/MODULES.md`](docs/MODULES.md) for a deliverable-by-deliverable
file map.

---

## 4. Workflow

1. **Branch off `main`** with `feat/<area>-<short-desc>` or
   `fix/<area>-<short-desc>`.
2. **Make the smallest vertical slice** that delivers value. Avoid scope creep.
3. **Write tests** — see [`docs/TESTING.md`](docs/TESTING.md). The bar is:
   - any new pure function has a unit test
   - any new HTTP route has at least one supertest case
   - any new metric/log surface gets exercised at least once
4. **Run the affected suites locally** before pushing:
   ```bash
   cd backend  && npm test
   cd frontend && npm test
   cd ml       && pytest
   cd biomech  && pytest
   ```
5. **Open a PR** with the `.github/pull_request_template.md` filled in.
6. **CI must be green** before review. The matrix runs lint, unit + integration
   tests, a docker build smoke, and a Trivy image scan.
7. **Squash-merge** once approved.

---

## 5. Coding standards

- **No paid APIs, no cloud AI services.** This is non-negotiable — see the
  project's privacy promise in the README.
- **Edit existing files** before adding new ones. The folder layout is
  intentional; a new module should be the exception, not the default.
- **Don't add error handling for cases that can't happen.** Trust internal
  contracts (e.g. validators run before controllers). Validate at boundaries.
- **Comments explain why, not what.** Well-named identifiers cover *what*.
- **Tests next to the code**: `foo.js` ↔ `foo.test.js`, `bar.py` ↔ `test_bar.py`.
- **Backend logs are structured (`pino`)**; never `console.log`. Python uses
  `logging`/`structlog`.
- **Frontend state lives in Zustand stores or component-local hooks** —
  default to the latter, escalate to a store only when multiple routes care.

---

## 6. Common tasks

### Add a backend endpoint
1. New Zod schema in `backend/src/validators/`
2. Route in `backend/src/routes/`
3. Controller in `backend/src/controllers/` — keep thin
4. Real logic in `backend/src/services/` with unit tests
5. Document in [`docs/API.md`](docs/API.md)

### Add a frontend page
1. Component in `frontend/src/pages/`
2. Add route + (if private) wrap in `<Protected>` in `App.jsx`
3. Link from `Navbar.jsx` or `Dashboard.jsx`
4. If it talks to the backend, add the call to `services/api.js`

### Add an ML feature
1. Feature extractor in `ml/src/utils/features.py` (mirror in
   `frontend/src/utils/features.js` if it must run in-browser)
2. Model definition in `ml/src/models/`
3. Training script in `ml/src/training/`
4. Inference route in `ml/src/inference_server.py`
5. Backend client in `backend/src/services/ml.client.js`
6. Train: `python -m src.training.train_<name> --data data/processed/<x>.csv`

### Train + ship a TF.js model for offline mode
```bash
cd ml
python -m src.training.train_posture --data data/processed/posture.csv
tensorflowjs_converter --input_format keras \
  checkpoints/posture/model.keras \
  ../frontend/public/models/posture
```
Reload the frontend; `posturePredictor.ready()` will return true and the
"offline" badge will appear on the Posture card when the WS drops.

---

## 7. Debugging

| Symptom | Try |
|---|---|
| `Invalid environment` on backend boot | Compare `.env` against `.env.example` — required secrets must be ≥ 16 chars. |
| Webcam never appears | Browser permission denied; check the URL bar. Chrome only allows camera on `https://` or `http://localhost`. |
| Skeleton overlay flickers | MediaPipe `GPU` delegate failed; the hook falls back automatically. Open devtools → console for the message. |
| `prediction:posture` never fires | ML service down. `docker compose logs ml` — check the `posture=False activity=False` line on boot. |
| Live activity always says "idle" | Models aren't trained yet. Run `python -m src.data.synth_activity` then `train_activity.py`. |
| Postgres connection refused | Container still starting; the backend has `depends_on: { postgres: condition: service_healthy }` — give it ~10 s. |

Tail everything at once: `docker compose logs -f --tail=200`.

---

## 8. Reporting bugs / security

- Functional bugs: open a GitHub issue with reproduction steps + expected vs.
  actual.
- Security issues: see [`docs/SECURITY.md`](docs/SECURITY.md) — do **not**
  open a public issue; use a private security advisory or email the address
  listed there.

Thanks for contributing!
