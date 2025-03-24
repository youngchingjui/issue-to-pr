#!/bin/bash

echo "Starting required services..."

# Start docker compose services
echo "Starting Docker services..."
docker-compose up -d

# Wait for Neo4j to be ready
echo "Waiting for Neo4j to be ready..."
until curl -s http://localhost:7474 > /dev/null; do
    sleep 1
done

# Check if Redis is running, start if not
if ! pgrep -x "redis-server" > /dev/null
then
    echo "Starting Redis..."
    redis-server --daemonize yes
    # Give Redis a moment to start
    sleep 2
else
    echo "Redis is already running"
fi

# Verify Redis is responding
echo "Verifying Redis connection..."
redis-cli ping > /dev/null 2>&1 || (echo "Error: Redis is not responding" && exit 1)

echo "All services started!" 