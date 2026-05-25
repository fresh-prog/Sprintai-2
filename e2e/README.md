# End-to-end tests

Playwright-driven golden-path tests. They assume the full stack (frontend +
backend + postgres + redis + ml + biomech) is already running.

## Run locally

```bash
# In a separate shell, start the stack:
docker compose up --build

# In e2e/:
cd e2e
npm install
npm run install-browsers   # one-time: downloads chromium
npm test                   # headless run

npm run test:headed        # opens a browser window — handy for debugging
```

Override the target URL when pointing at a remote env:

```bash
E2E_BASE_URL=https://staging.sprintai.example.com npm test
```

## What's covered

| Spec | What it asserts |
|---|---|
| `auth.spec.js` | Register → dashboard, bad-creds rejection, protected-route redirect. |

The MediaPipe/Capture flow is intentionally skipped here — that path needs a
real camera surface and is better verified manually or against a recorded
fixture. Add a `capture.spec.js` once we stub the detector behind a feature
flag (`VITE_E2E_MOCK_POSE=1`).
