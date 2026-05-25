# Module Reference

A map from each deliverable in the project spec to the file(s) that implement
it. Use this as a hand-off doc when onboarding new contributors — every item
on the "deliverables" list links to concrete code.

## 1. Project architecture & system design
- [`README.md`](../README.md) — high-level overview
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — component & sequence diagrams

## 2. Folder structure
- [`README.md` → "Folder structure"](../README.md#folder-structure)

## 3. Database schema & ER diagram
- [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
- [`docs/DATABASE.md`](DATABASE.md)

## 4. REST API endpoints
- [`docs/API.md`](API.md)
- Routes: [`backend/src/routes/`](../backend/src/routes)
- Controllers: [`backend/src/controllers/`](../backend/src/controllers)
- Validators: [`backend/src/validators/`](../backend/src/validators)

## 5. Frontend components
- Pages: [`frontend/src/pages/`](../frontend/src/pages)
- Reusable: [`frontend/src/components/`](../frontend/src/components)
- Hooks: [`frontend/src/hooks/`](../frontend/src/hooks)
- Store: [`frontend/src/store/authStore.js`](../frontend/src/store/authStore.js)

## 6. MediaPipe Pose integration
- [`frontend/src/hooks/usePoseDetector.js`](../frontend/src/hooks/usePoseDetector.js) — loads the WASM model & exposes `detect(video, ts)`
- [`frontend/src/utils/skeleton.js`](../frontend/src/utils/skeleton.js) — connection map + canvas rendering
- [`frontend/src/pages/Capture.jsx`](../frontend/src/pages/Capture.jsx) — wires camera → detector → canvas → socket

## 7. TensorFlow model setup
- Models: [`ml/src/models/posture.py`](../ml/src/models/posture.py), [`ml/src/models/activity.py`](../ml/src/models/activity.py)
- Training: [`ml/src/training/`](../ml/src/training)
- Inference server: [`ml/src/inference_server.py`](../ml/src/inference_server.py)
- Synthetic data: [`ml/src/data/synth_posture.py`](../ml/src/data/synth_posture.py), [`ml/src/data/synth_activity.py`](../ml/src/data/synth_activity.py)

## 8. OpenSim / OpenCap integration
- [`biomech/src/opensim_service.py`](../biomech/src/opensim_service.py) — FastAPI endpoints
- [`biomech/src/geometry.py`](../biomech/src/geometry.py) — pure-Python joint math (no native deps)
- [`biomech/src/gait.py`](../biomech/src/gait.py) — heel-strike cadence
- `requirements.txt` keeps the `opensim` wheel optional so CI doesn't need a 1 GB native install

## 9. Leaflet visualization
- [`frontend/src/components/MovementMap.jsx`](../frontend/src/components/MovementMap.jsx)
- [`frontend/src/pages/SessionDetail.jsx`](../frontend/src/pages/SessionDetail.jsx) — feeds hip-center trajectory

## 10. Real-time processing pipeline
- WS server: [`backend/src/sockets/index.js`](../backend/src/sockets/index.js)
- Stream consumer: [`backend/src/sockets/poseConsumer.js`](../backend/src/sockets/poseConsumer.js)
- Inline persistence: [`backend/src/services/pose.service.js`](../backend/src/services/pose.service.js)
- Rolling window helper: [`backend/src/utils/buffer.js`](../backend/src/utils/buffer.js)

## 11. WebSocket architecture
- See [`docs/API.md` → "WebSocket"](API.md#websocket--wspose)
- Auth handshake + namespaces in `backend/src/sockets/index.js`

## 12. Authentication flow
- Services: [`backend/src/services/auth.service.js`](../backend/src/services/auth.service.js), [`token.service.js`](../backend/src/services/token.service.js)
- Controllers: [`backend/src/controllers/auth.controller.js`](../backend/src/controllers/auth.controller.js)
- Middleware: [`backend/src/middleware/auth.js`](../backend/src/middleware/auth.js)
- Frontend store: [`frontend/src/store/authStore.js`](../frontend/src/store/authStore.js)
- Token refresh interceptor: [`frontend/src/services/api.js`](../frontend/src/services/api.js)

## 13. Deployment guide
- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md)

## 14. Docker setup
- [`docker-compose.yml`](../docker-compose.yml)
- Per-service `Dockerfile`s under `backend/`, `frontend/`, `ml/`, `biomech/`

## 15. GitHub project structure
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- [`.github/pull_request_template.md`](../.github/pull_request_template.md)

## 16. Testing strategy
- [`docs/TESTING.md`](TESTING.md)
- Backend Vitest: `backend/src/**/*.test.js`
- Python pytest: `ml/tests/`, `biomech/tests/`

## 17. Security best practices
- [`docs/SECURITY.md`](SECURITY.md)
- Implemented in: `helmet`, rate limits, Zod validation, bcrypt + rotated refresh tokens, multer mime allow-list

## 18. Performance optimization
- Down-sampled persistence (`PERSIST_EVERY_N` in `pose.service.js`)
- Frame batching window in `Capture.jsx` (8-frame windows)
- Redis stream + MAXLEN ≈ 5000 for bounded memory
- Async consumer for heavy ML/biomech calls (`poseConsumer.js`)

## 19. Step-by-step implementation plan
- [`docs/ROADMAP.md`](ROADMAP.md)
