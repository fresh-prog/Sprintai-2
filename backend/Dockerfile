# syntax=docker/dockerfile:1.6
# Multi-stage build. Target `dev` for hot-reload, `production` for prod.

# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini openssl \
 && addgroup -S app && adduser -S app -G app
ENTRYPOINT ["/sbin/tini", "--"]

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
