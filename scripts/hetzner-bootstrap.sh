#!/usr/bin/env bash
# One-shot unattended deploy for SprintAI on a fresh Ubuntu 24.04 Hetzner box.
# Designed to run from cloud-init (no SSH needed). Brings up the full HTTPS
# stack on a free <ip>.sslip.io domain. Idempotent; safe to re-run as root.
#
# Logs to /var/log/sprintai-deploy.log when invoked from cloud-init.
set -euo pipefail
exec > >(tee -a /var/log/sprintai-deploy.log) 2>&1
echo "===== SprintAI deploy started $(date -u) ====="

REPO_URL="https://github.com/fresh-prog/Sprintai-2.git"
BRANCH="claude/ai-biomechanics-motion-analysis-eRcDo"
APP_DIR="/opt/sprintai"
BASE="-f docker-compose.yml -f docker-compose.prod.yml"
HTTPS_OVERLAY="-f docker-compose.https.yml"
APT="apt-get -o DPkg::Lock::Timeout=600 -y"

echo "==> 1/7 Swap (6GB) for build headroom on a 4GB box"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 6G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=6144
  chmod 600 /swapfile; mkswap /swapfile; swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
fi
free -h

echo "==> 2/7 Base packages + Docker (waiting for any boot-time apt lock)"
export DEBIAN_FRONTEND=noninteractive
$APT update
$APT install git curl ca-certificates
command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh
docker --version && docker compose version

echo "==> 3/7 Clone repo into $APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin "$BRANCH" && git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi
cd "$APP_DIR"

echo "==> 4/7 Generate .env with random secrets"
bash scripts/setup.sh || true

echo "==> 5/7 Resolve DOMAIN (DEPLOY_DOMAIN override, else <ip>.sslip.io); wire CORS"
IP="$(curl -fsSL https://api.ipify.org || curl -fsSL https://ifconfig.me || hostname -I | awk '{print $1}')"
DOMAIN="${DEPLOY_DOMAIN:-${IP//./-}.sslip.io}"
set_env() { # key value
  if grep -q "^# *$1=" .env; then sed -i "s|^# *$1=.*|$1=$2|" .env;
  elif grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env;
  else echo "$1=$2" >> .env; fi
}
set_env DOMAIN "$DOMAIN"
set_env CORS_ORIGIN "https://$DOMAIN"
echo "Public IP: $IP   Domain: $DOMAIN"

# Optional admin seed — credentials passed from cloud-init deploy env.
if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  set_env ADMIN_EMAIL "$ADMIN_EMAIL"
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  echo "Admin account will be seeded for $ADMIN_EMAIL"
fi

echo "==> 6/7 Build images sequentially (avoids OOM during parallel builds)"
for svc in ml biomech backend frontend; do
  echo "---- building $svc ----"
  docker compose $BASE build "$svc"
done

echo "==> 7/7 Launch full stack with HTTPS (Caddy + Let's Encrypt for $DOMAIN)"
docker compose $BASE $HTTPS_OVERLAY up -d
sleep 8
docker compose $BASE $HTTPS_OVERLAY ps
echo
echo "===== Deploy finished $(date -u) ====="
echo "Site (allow 1-2 min for the TLS certificate): https://$DOMAIN"
