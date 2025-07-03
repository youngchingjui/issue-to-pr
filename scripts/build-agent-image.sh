#!/bin/bash

# Build the custom agent base image with ripgrep pre-installed
# This image is used for containerized agent workflows

set -e

IMAGE_NAME="${AGENT_BASE_IMAGE:-ghcr.io/youngchingjui/agent-base}"
IMAGE_TAG="latest"
DOCKERFILE_PATH="docker/agent-base/Dockerfile"

echo "Building custom agent base image: ${IMAGE_NAME}:${IMAGE_TAG}"

# Build the Docker image
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" -f "${DOCKERFILE_PATH}" .

echo "Image built successfully!"
echo "Testing image..."

# Test that packages are available
docker run --rm "${IMAGE_NAME}:${IMAGE_TAG}" rg --version
docker run --rm "${IMAGE_NAME}:${IMAGE_TAG}" git --version
docker run --rm "${IMAGE_NAME}:${IMAGE_TAG}" curl --version

echo "Pushing image to repository..."
docker push "${IMAGE_NAME}:${IMAGE_TAG}"

echo "✅ Custom agent image is ready for use"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Includes: ripgrep, git, curl" 