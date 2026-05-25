# syntax=docker/dockerfile:1.6
# Multi-stage. `dev` runs Vite with HMR. `production` builds a static bundle
# and serves it with a hardened, non-root nginx.

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# ---------- dev ----------
FROM deps AS dev
COPY --chown=app:app . .
USER app
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---------- builder ----------
FROM deps AS builder
COPY . .
RUN npm run build

# ---------- production ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O - http://127.0.0.1:8080/ >/dev/null || exit 1
