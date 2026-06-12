#!/usr/bin/env sh
# First-run setup: create .env from the template with freshly generated
# secrets. Safe to re-run — refuses to overwrite an existing .env.
#
# Usage:  ./scripts/setup.sh
set -eu

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo ".env already exists — leaving it untouched."
  exit 0
fi

rand_hex() {
  # openssl is present basically everywhere (ships with git); fall back to
  # /dev/urandom for minimal systems.
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

ACCESS_SECRET="$(rand_hex 48)"
REFRESH_SECRET="$(rand_hex 48)"
DB_PASSWORD="$(rand_hex 24)"

sed \
  -e "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=${ACCESS_SECRET}|" \
  -e "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${REFRESH_SECRET}|" \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${DB_PASSWORD}|" \
  -e "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://sprintai:${DB_PASSWORD}@postgres:5432/sprintai?schema=public|" \
  .env.example > .env

echo "Wrote .env with generated JWT secrets and DB password."
echo "Next:  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
