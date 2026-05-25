#!/usr/bin/env bash
# Nightly Postgres backup script.
#
# Reads DATABASE_URL from the environment, writes a gzipped pg_dump to
# $BACKUP_DIR/sprintai-YYYY-MM-DD-HHMM.sql.gz, then prunes anything older
# than $BACKUP_RETAIN_DAYS (default 14). Designed to run from cron or a
# systemd timer on the box hosting the docker-compose stack.
#
# Usage:
#   DATABASE_URL=postgresql://... BACKUP_DIR=/var/backups/sprintai \
#     scripts/backup/pg_backup.sh
#
# To restore:
#   gunzip -c sprintai-2026-05-25-0300.sql.gz | psql "$DATABASE_URL"

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

stamp="$(date -u +%Y-%m-%d-%H%M)"
out="$BACKUP_DIR/sprintai-${stamp}.sql.gz"

echo "→ dumping to $out"
pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" | gzip -9 > "$out"

# Refuse to keep a backup that's suspiciously small (< 4 KB) — usually means
# pg_dump bailed before writing real data.
size=$(wc -c <"$out")
if [ "$size" -lt 4096 ]; then
  echo "✗ backup $out is only ${size} bytes; deleting" >&2
  rm -f "$out"
  exit 2
fi

echo "→ pruning backups older than ${BACKUP_RETAIN_DAYS} days in $BACKUP_DIR"
find "$BACKUP_DIR" -type f -name 'sprintai-*.sql.gz' -mtime "+${BACKUP_RETAIN_DAYS}" -print -delete

echo "✓ done (${size} bytes)"
