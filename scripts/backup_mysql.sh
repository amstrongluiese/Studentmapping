#!/usr/bin/env bash
# Automated MySQL Backup Script for Linux / Docker VPS (cron-ready)
# Example crontab (daily at 2:00 AM):
#   0 2 * * * cd /opt/studentmapping && ./scripts/backup_mysql.sh >> /var/log/sm_backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CONTAINER_NAME="${MYSQL_CONTAINER_NAME:-studentmapping_mysql}"
DB_NAME="${MYSQL_DATABASE:-student_mapping}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

if [ -z "${MYSQL_ROOT_PASSWORD:-}" ]; then
  echo "[Backup] ERROR: MYSQL_ROOT_PASSWORD must be set in .env or environment." >&2
  exit 1
fi

echo "[Backup] Dumping '${DB_NAME}' from container '${CONTAINER_NAME}'..."
docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$CONTAINER_NAME" \
  mysqldump -u root --single-transaction --routines --triggers --quick "$DB_NAME" \
  | gzip -9 > "$OUT_FILE"

echo "[Backup] Created: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

# Rotate old backups
find "$BACKUP_DIR" -type f -name "backup_${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[Backup] Rotation complete (retention: ${RETENTION_DAYS} days)."
