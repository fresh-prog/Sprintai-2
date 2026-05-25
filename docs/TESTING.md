# Testing Strategy

## Layers

| Layer | Tooling | What it proves |
|---|---|---|
| Unit (JS) | Vitest | Pure functions: angle math, validators, services with mocked DB. |
| Unit (Py) | pytest | Feature extractors, model wrappers, biomech geometry. |
| Integration | Vitest + Testcontainers (Postgres) | Controllers + Prisma against a real DB. |
| Contract | Pact (optional) | Backend ↔ ML service request/response stability. |
| E2E | Playwright | Register → record → see prediction. |
| Load | k6 | 50 concurrent WS sessions, 30 fps each. |

## Running tests

```bash
# Backend
cd backend && npm test
cd backend && npm run test:integration

# Frontend
cd frontend && npm test

# Python
cd ml && pytest
cd biomech && pytest

# E2E (requires a running stack)
cd e2e && npx playwright test
```

## Coverage targets

| Code | Target | Notes |
|---|---|---|
| Backend services / utils | 80 % lines | High-leverage logic. |
| Frontend hooks / utils | 70 % | UI components mostly snapshot/visual. |
| ML feature code | 90 % | Numerical correctness is critical. |
| Controllers / routes | 60 % | Integration tests cover most paths. |

## What we don't unit-test

- React components that are purely presentational — covered by Playwright.
- Prisma generated client.
- OpenSim itself.

## CI

GitHub Actions matrix:
- Node 20 on Ubuntu — lint + unit + integration.
- Python 3.11 — ruff + pytest.
- Docker build smoke (no push) — confirms images still build.
