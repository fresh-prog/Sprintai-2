# syntax=docker/dockerfile:1.6
# Multi-stage build. Target `dev` for hot-reload, `production` for prod.
#
# We use debian-slim instead of alpine because Prisma's schema engine has
# long-standing libssl detection problems on alpine/musl. Bookworm ships
# OpenSSL 3 and Prisma's prebuilt binaries Just Work.

# ---------- base ----------
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -r app && useradd -r -g app app
ENTRYPOINT ["/usr/bin/tini", "--"]

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# ---------- dev ----------
FROM deps AS dev
COPY . .
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi \
 && chown -R app:app /app
USER app
ENV NODE_ENV=development
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ---------- builder (prod) ----------
FROM deps AS builder
COPY . .
RUN npx prisma generate

# ---------- production ----------
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/src ./src
RUN npm prune --omit=dev && mkdir -p /app/uploads && chown app:app /app/uploads
USER app
EXPOSE 4000
CMD ["node", "src/server.js"]
