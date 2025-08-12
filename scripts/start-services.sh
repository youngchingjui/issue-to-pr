#!/bin/bash

# This script assists in loading environment variables from the correct env file
# before running `docker-compose up`.

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
docker-compose -f docker/docker-compose.yml up -d
