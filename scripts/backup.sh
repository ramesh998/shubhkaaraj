#!/usr/bin/env bash
# Nightly MongoDB backup. Run from the project directory on the VPS (cron), e.g.:
#   0 2 * * * cd /opt/shubhkaaraj && ./scripts/backup.sh >> backup.log 2>&1
# Optionally uploads to R2 when RCLONE_REMOTE is set (e.g. "r2:shubhkaaraj-backups").
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

STAMP=$(date +%Y%m%d-%H%M%S)
OUT="backups/mongo-$STAMP.gz"
KEEP=${BACKUP_KEEP:-14}
mkdir -p backups

docker compose exec -T mongo mongodump \
  --username "$MONGO_ROOT_USER" --password "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  --db "${MONGO_DB:-shubhkaaraj}" --archive --gzip > "$OUT"
echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"

if [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$OUT" "$RCLONE_REMOTE"
  echo "Uploaded to $RCLONE_REMOTE"
fi

# Keep only the newest $KEEP local backups.
ls -1t backups/mongo-*.gz | tail -n +$((KEEP + 1)) | xargs -r rm --
