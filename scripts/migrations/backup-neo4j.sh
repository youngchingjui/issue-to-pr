#!/bin/bash

# Exit on error
set -e

# Get timestamp for backup directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$TIMESTAMP"

echo "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "Stopping Neo4j container..."
docker compose -f docker/docker-compose.yml stop neo4j

echo "Creating backup..."
docker run --rm \
  --volumes-from issue-to-pr-neo4j-1 \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine \
  tar czf /backup/neo4j_data.tar.gz /data

echo "Starting Neo4j container..."
docker compose -f docker/docker-compose.yml start neo4j

echo "Backup completed successfully!"
echo "Backup location: $BACKUP_DIR/neo4j_data.tar.gz" 