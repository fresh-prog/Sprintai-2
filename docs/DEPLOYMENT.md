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

## Backups

- Postgres: nightly `pg_dump` → encrypted tarball → off-box.
- Uploads: `restic` to S3-compatible storage.
- Test restore monthly.
