#!/bin/bash

# Build the custom agent base image with ripgrep, Node.js 22, and pnpm pre-installed
# This image is used for containerized agent workflows

set -e

show_help() {
  cat <<'EOF'
Usage: build-agent-image.sh [TAG1 TAG2 ...]

Build the custom agent base Docker image with ripgrep, git, curl, Node.js 22, npm and pnpm pre-installed.

Positional arguments:
  TAG   One or more tags to apply to the built image. Defaults to "latest" if none are supplied.

Options:
  -h, --help   Show this help message and exit

Environment variables:
  AGENT_BASE_IMAGE   Override the default image name (default: ghcr.io/youngchingjui/agent-base)

Examples:
  # Build and push image with default tag 'latest'
  ./scripts/build-agent-image.sh

  # Build and push image with semantic version tag
  ./scripts/build-agent-image.sh node22-1.0.0

  # Build and push image with multiple tags
  ./scripts/build-agent-image.sh node22-1.0.0 node22-latest latest
EOF
}

# Display help if requested
for arg in "$@"; do
  case "$arg" in
    -h|--help)
      show_help
      exit 0
      ;;
  esac
done

IMAGE_NAME="${AGENT_BASE_IMAGE:-ghcr.io/youngchingjui/agent-base}"

# Accept one or more tags as positional arguments. If none are supplied we default
# to "latest". You can therefore do:
#   ./scripts/build-agent-image.sh            # -> agent-base:latest
#   ./scripts/build-agent-image.sh node22-1.0.0             # -> agent-base:node22-1.0.0
#   ./scripts/build-agent-image.sh node22-1.0.0 node22-latest latest  # multi-tag build

if [ "$#" -eq 0 ]; then
  TAGS=("latest")
else
  TAGS=("$@")
fi

DOCKERFILE_PATH="docker/agent-base/Dockerfile"
PLATFORMS="linux/amd64,linux/arm64"

# Prepare repeated -t arguments for docker buildx
TAG_ARGS=()
for tag in "${TAGS[@]}"; do
  TAG_ARGS+=("-t" "${IMAGE_NAME}:${tag}")
done

echo "Building custom agent base image with tags: ${TAGS[*]}"

# Build the Docker image for multiple architectures and push to registry
# Ensure you have a builder named "container-builder" 
# using the driver "docker-container"
docker buildx build \
  --platform "${PLATFORMS}" \
  "${TAG_ARGS[@]}" \
  -f "${DOCKERFILE_PATH}" \
  --builder "container-builder" \
  --push \
  .

echo "Image built successfully!"

# Use the first tag for smoke-tests
TEST_TAG="${TAGS[0]}"

echo "Running smoke tests on: ${IMAGE_NAME}:${TEST_TAG}"

docker run --rm "${IMAGE_NAME}:${TEST_TAG}" rg --version
docker run --rm "${IMAGE_NAME}:${TEST_TAG}" git --version
docker run --rm "${IMAGE_NAME}:${TEST_TAG}" curl --version
docker run --rm "${IMAGE_NAME}:${TEST_TAG}" node --version
docker run --rm "${IMAGE_NAME}:${TEST_TAG}" npm --version
docker run --rm "${IMAGE_NAME}:${TEST_TAG}" pnpm --version

echo "✅ Custom agent image is ready for use"
echo "Image tags: ${TAGS[*]}"
echo "Platforms: ${PLATFORMS}"
echo "Includes: ripgrep, git, curl, nodejs (npm), pnpm"
