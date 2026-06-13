#!/usr/bin/env bash
# One-shot server bootstrap for SprintAI on a fresh Ubuntu 24.04 Hetzner box.
# Builds and launches the production stack on :8080 (plain HTTP first).
# Idempotent: safe to re-run. Run as root.
#
#   curl -fsSL https://raw.githubusercontent.com/fresh-prog/Sprintai-2/claude/ai-biomechanics-motion-analysis-eRcDo/scripts/hetzner-bootstrap.sh | bash
set -euo pipefail

REPO_URL="https://github.com/fresh-prog/Sprintai-2.git"
BRANCH="claude/ai-biomechanics-motion-analysis-eRcDo"
APP_DIR="/opt/sprintai"
PROD="-f docker-compose.yml -f docker-compose.prod.yml"

echo "==> 1/6 Swap (6GB) — headroom for image builds on a 4GB box"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 6G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=6144
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
fi
free -h

echo "==> 2/6 Base packages + Docker"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl ca-certificates
command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh
docker --version && docker compose version

echo "==> 3/6 Clone repo into $APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin "$BRANCH" && git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi
cd "$APP_DIR"

echo "==> 4/6 Generate .env with random secrets"
bash scripts/setup.sh || true

echo "==> 5/6 Build images SEQUENTIALLY (avoids OOM on 4GB during parallel builds)"
for svc in postgres redis ml biomech backend frontend; do
  if docker compose $PROD config --services | grep -qx "$svc"; then
    # only build services that have a build context (skip pull-only like postgres/redis)
    docker compose $PROD build "$svc" 2>/dev/null || true
  fi
done

echo "==> 6/6 Launch production stack"
docker compose $PROD up -d
sleep 5
docker compose $PROD ps
echo
echo "Bootstrap complete. App should be serving on http://127.0.0.1:8080 (and the server's public IP)."
echo "Verify locally:  curl -sI http://127.0.0.1:8080/ | head -1"
