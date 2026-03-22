#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 /absolute/path/to/dump.sql.gz"
  exit 1
fi

DUMP_FILE="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump file not found: $DUMP_FILE"
  exit 1
fi

if [ -f "$ROOT_DIR/.env.backend" ]; then
  set -a
  . "$ROOT_DIR/.env.backend"
  set +a
fi

DB_NAME="${POSTGRES_DB:-neonix}"
DB_USER="${POSTGRES_USER:-postgres}"
CONTAINER_NAME="$(docker compose -f "$ROOT_DIR/docker-compose.prod.yml" ps -q postgres)"

echo "[restore-db] restoring $DUMP_FILE into $DB_NAME"
gunzip -c "$DUMP_FILE" | docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" "$CONTAINER_NAME" \
  psql -U "$DB_USER" -d "$DB_NAME"

echo "[restore-db] done"
