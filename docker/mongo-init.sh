#!/bin/bash
# Runs once, on first start of an empty data volume.
# Creates a least-privilege user that can only read/write the application database.
set -euo pipefail

mongosh --quiet \
  -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin <<EOF
const appDb = db.getSiblingDB("${MONGO_DB}");
appDb.createUser({
  user: "${MONGO_APP_USER}",
  pwd: "${MONGO_APP_PASSWORD}",
  roles: [{ role: "readWrite", db: "${MONGO_DB}" }],
});
EOF
