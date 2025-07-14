#!/bin/bash
set -e

# Navigate to repository root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# Determine environment file
if [ -n "$ENV_FILE" ]; then
  FILE="$ENV_FILE"
else
  if [ "$NODE_ENV" = "production" ] && [ -f .env.production.local ]; then
    FILE=".env.production.local"
  else
    FILE=".env.local"
  fi
fi

if [ ! -f "$FILE" ]; then
  echo "Environment file '$FILE' not found" >&2
  exit 1
fi

echo "Starting Docker services using $FILE"
docker compose --env-file "$FILE" -f docker/docker-compose.yml up -d
