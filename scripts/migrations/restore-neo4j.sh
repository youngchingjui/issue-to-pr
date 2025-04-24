#!/bin/bash

# Exit on error
set -e

# Check if backup directory is provided
if [ -z "$1" ]; then
    echo "Error: Please provide the backup directory timestamp"
    echo "Usage: $0 YYYYMMDD_HHMMSS"
    exit 1
fi

BACKUP_DIR="backups/$1"

# Check if backup exists
if [ ! -f "$BACKUP_DIR/neo4j_data.tar.gz" ]; then
    echo "Error: Backup file not found in $BACKUP_DIR"
    echo "Available backups:"
    ls -1 backups/
    exit 1
fi

echo "Stopping Neo4j container..."
docker compose stop neo4j

echo "Restoring from backup: $BACKUP_DIR/neo4j_data.tar.gz"
docker run --rm \
  --volumes-from issue-to-pr-neo4j-1 \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine \
  sh -c "cd / && tar xzf /backup/neo4j_data.tar.gz"

echo "Starting Neo4j container..."
docker compose start neo4j

echo "Restore completed successfully!" 