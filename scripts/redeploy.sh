#!/usr/bin/env bash
# In-place redeploy on an EXISTING server — no recreate. Preserves the
# Let's Encrypt certificate (caddy-data volume) and the database
# (postgres-data volume), and avoids requesting a new cert.
#
# Run as root:
#   cd /opt/sprintai && git pull && bash scripts/redeploy.sh
#
# Optional one-time settings via env (persisted into .env):
#   ADMIN_EMAIL=admin@sprintai.app ADMIN_PASSWORD=... bash scripts/redeploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="-f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.https.yml"

set_env() { # key value
  if   grep -q "^# *$1=" .env; then sed -i "s|^# *$1=.*|$1=$2|" .env
  elif grep -q "^$1="    .env; then sed -i "s|^$1=.*|$1=$2|"    .env
  else echo "$1=$2" >> .env; fi
}

# Keep bcrypt at the faster setting.
set_env BCRYPT_ROUNDS "${BCRYPT_ROUNDS:-10}"

# Ensure an admin account exists. If creds aren't already in .env (and none
# passed via env), generate a strong password and print it once.
CUR_ADMIN_PW="$(grep -E '^ADMIN_PASSWORD=' .env | cut -d= -f2- || true)"
if [ -z "${ADMIN_PASSWORD:-}" ] && [ -z "$CUR_ADMIN_PW" ]; then
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@sprintai.app}"
  ADMIN_PASSWORD="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)"
  GENERATED=1
fi
[ -n "${ADMIN_EMAIL:-}" ]    && set_env ADMIN_EMAIL    "$ADMIN_EMAIL"
[ -n "${ADMIN_PASSWORD:-}" ] && set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"

echo "==> pulling latest code"
git pull --ff-only || true

echo "==> rebuilding app images (backend, frontend) sequentially"
docker compose $BASE build backend
docker compose $BASE build frontend

echo "==> applying"
docker compose $BASE up -d

docker compose $BASE ps
echo
echo "Redeploy complete — cert and database preserved."
if [ "${GENERATED:-0}" = "1" ]; then
  echo "============================================================"
  echo " ADMIN ACCOUNT (save this — shown once):"
  echo "   email:    $ADMIN_EMAIL"
  echo "   password: $ADMIN_PASSWORD"
  echo "============================================================"
fi
