#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups/db"
STAMP="$(date +%F_%H-%M-%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "$ROOT_DIR/.env.backend" ]; then
  set -a
  . "$ROOT_DIR/.env.backend"
  set +a
fi

DB_NAME="${POSTGRES_DB:-neonix}"
DB_USER="${POSTGRES_USER:-postgres}"
CONTAINER_NAME="$(docker compose -f "$ROOT_DIR/docker-compose.prod.yml" ps -q postgres)"
OUT_FILE="$BACKUP_DIR/${DB_NAME}_${STAMP}.sql.gz"

echo "[backup-db] creating dump: $OUT_FILE"
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" "$CONTAINER_NAME" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists | gzip > "$OUT_FILE"

sha256sum "$OUT_FILE" > "$OUT_FILE.sha256"

find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -type f -name "*.sha256" -mtime +7 -delete

echo "[backup-db] done"
