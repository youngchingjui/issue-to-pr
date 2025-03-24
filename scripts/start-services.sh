#!/bin/bash

echo "Starting required services..."

# Determine which env file to use based on NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
    ENV_FILE=".env.production.local"
else
    ENV_FILE=".env.local"
fi

# Export environment variables from env file
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment variables from $ENV_FILE"
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    # Export the ENV_FILE path for docker-compose
    export ENV_FILE="../../$ENV_FILE"
else
    echo "Warning: $ENV_FILE not found"
fi

# Start docker compose services from the docker directory
echo "Starting Docker services..."
cd "$(dirname "$0")/../docker" || exit
docker-compose up -d
cd - || exit

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