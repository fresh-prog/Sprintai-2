# Deployment

## Local dev (Docker, recommended)

```bash
cp .env.example .env
docker compose up --build
```

Hot reload is on for backend (`nodemon`) and frontend (`vite`). Python services
restart on file change via `uvicorn --reload`.

## Local dev (no Docker)

You'll need: Node 20+, Python 3.11+, Postgres 16, Redis 7.

```bash
# Postgres + Redis via brew, apt, or whatever you like
createdb sprintai

# Backend
cd backend
npm install
cp ../.env.example .env
npx prisma migrate dev
npm run dev   # http://localhost:4000

# Frontend
cd ../frontend
npm install
npm run dev   # http://localhost:5173

# ML service
cd ../ml
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.inference_server:app --port 8001 --reload

# Biomech service
cd ../biomech
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.opensim_service:app --port 8002 --reload
```

## Single-server production (VPS, ~$10/mo)

1. Provision a 2 vCPU / 4 GB RAM Ubuntu 22.04 box.
2. Install Docker + Docker Compose plugin.
3. Clone the repo, set a *real* `.env` (strong secrets, `NODE_ENV=production`).
4. Put nginx in front for TLS termination (Let's Encrypt via certbot).
5. `docker compose up -d --build`.
6. Configure `pg_dump` cron → off-box backup.

Example nginx site config:

```nginx
server {
    server_name sprintai.example.com;
    location / { proxy_pass http://127.0.0.1:5173; }
    location /api/ { proxy_pass http://127.0.0.1:4000; }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    listen 443 ssl;
    # ssl_certificate / ssl_certificate_key managed by certbot
}
```

## Horizontal scaling notes

- Backend is stateless; run N replicas behind any HTTP LB. Sticky sessions are
  required for Socket.IO unless you enable the Redis adapter
  (`@socket.io/redis-adapter`) — already wired in `backend/src/sockets/index.js`.
- ML service: scale by Docker replicas; round-robin via the backend client.
- Biomech service: one worker per replica (OpenSim isn't thread-safe).
- Postgres: vertical scaling first; logical replication for read replicas.

## Image hardening checklist

- [ ] Multi-stage Dockerfile, final stage `FROM node:20-alpine` (or slim).
- [ ] `USER node` / non-root.
- [ ] Pinned base images by digest.
- [ ] `trivy image sprintai-backend:latest` clean before tag.
- [ ] `npm ci --omit=dev` / `pip install --no-cache-dir`.

## Production images

```bash
# Build hardened, non-root, multi-stage images.
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run the prod stack. Only the frontend (:8080) is published — nginx
# proxies /api and /socket.io to the backend over the internal network,
# so the app works from any device that can reach the host.
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Public server with a domain? Add the HTTPS overlay (set DOMAIN in .env
# first). Caddy terminates TLS with auto-renewed Let's Encrypt certs and
# becomes the only published service (80/443).
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  -f docker-compose.https.yml up -d --build
```

The production targets:

- Backend → `npm start` (Prisma `migrate deploy`, then the server) with
  `NODE_ENV=production`, dev dependencies pruned, running as a non-root
  `app` user under `tini` for signal handling. Refuses to boot if the JWT
  secrets are still the `.env.example` placeholders.
- Frontend → `nginx-unprivileged` serving the static Vite bundle from
  `/usr/share/nginx/html`; aggressive caching for `/assets/*`, never-cache on
  `index.html`, defensive headers in `frontend/nginx.conf`.
- Both images carry a `HEALTHCHECK` and are scanned by Trivy in CI for HIGH /
  CRITICAL CVEs before they're allowed to merge.

## Observability

- Metrics exposed at `GET /metrics` on the backend (Prometheus text format):
  default Node metrics, HTTP latency histogram, pose-frame counters, and an
  external-service histogram for ML/biomech calls.
- Logs are structured JSON via `pino` (Node) and `structlog` (Python). Pipe
  them through `pino-pretty` or `jq` in dev.

## Load testing

```bash
# 25 concurrent WS sessions for 60 s — the default.
k6 run scripts/loadtest/k6-ws-sessions.js

# Crank it.
VUS=100 DURATION=5m k6 run scripts/loadtest/k6-ws-sessions.js
```

The script registers a fresh user per VU, opens a Socket.IO `/ws/pose`
connection, and streams synthetic 8-frame windows at 30 fps. Watch the
backend's `/metrics` endpoint or compose logs while it runs.

## Backups

- Postgres: nightly via `scripts/backup/pg_backup.sh` →
  `$BACKUP_DIR/sprintai-*.sql.gz`. Wire into cron:
  ```cron
  15 3 * * *  DATABASE_URL=postgresql://... BACKUP_DIR=/var/backups/sprintai \
              /opt/sprintai/scripts/backup/pg_backup.sh >> /var/log/sprintai-backup.log 2>&1
  ```
- Uploads: `restic` to S3-compatible storage (e.g. MinIO, Backblaze B2).
- Test restore monthly — a backup you've never restored isn't a backup.
