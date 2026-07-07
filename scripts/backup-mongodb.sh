#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.production.example to .env.production first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${MONGO_INITDB_ROOT_USERNAME:?Missing MONGO_INITDB_ROOT_USERNAME}"
: "${MONGO_INITDB_ROOT_PASSWORD:?Missing MONGO_INITDB_ROOT_PASSWORD}"
: "${MONGO_DATABASE:=webdating}"
: "${BACKUP_S3_URI:?Missing BACKUP_S3_URI}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="backups/mongodb"
archive_name="${MONGO_DATABASE}-${timestamp}.archive.gz"
archive_path="${backup_dir}/${archive_name}"

mkdir -p "$backup_dir"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mongodb \
  mongodump \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db "$MONGO_DATABASE" \
  --archive \
  --gzip > "$archive_path"

aws s3 cp "$archive_path" "${BACKUP_S3_URI%/}/${archive_name}"

if [[ "${BACKUP_RETENTION_DAYS:-}" =~ ^[0-9]+$ ]]; then
  find "$backup_dir" -type f -name "${MONGO_DATABASE}-*.archive.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
fi

echo "MongoDB backup uploaded to ${BACKUP_S3_URI%/}/${archive_name}"
