#!/bin/bash

# Build the custom agent base image with ripgrep, Node.js 22 or Python 3.11, and pnpm/poetry pre-installed
# This image is used for containerized agent workflows

set -e

show_help() {
  cat <<'\''EOF'\''
Usage: build-agent-image.sh [--python | --dockerfile=PATH] [TAG1 TAG2 ...]

Build the custom agent base Docker image with ripgrep, git, curl, and either Node.js 22/npm/pnpm or Python 3.11/pip/poetry pre-installed.

Positional arguments:
  TAG   One or more tags to apply to the built image. Defaults to "latest" if none are supplied.

Options:
  --python            Build the Python 3.11-based image (installs poetry, pip, etc)
  --dockerfile=PATH   Use a custom Dockerfile path for the build
  -h, --help          Show this help message and exit

Environment variables:
  AGENT_BASE_IMAGE   Override the default image name (default: ghcr.io/youngchingjui/agent-base)

Examples:
  # Build (default: Node image) with default tag '\''latest'\''
  ./scripts/build-agent-image.sh

  # Build (default: Node image) with semantic version tag
  ./scripts/build-agent-image.sh node22-1.0.0

  # Build Python image (with recommended tags)
  ./scripts/build-agent-image.sh --python python3.11-latest

  # Build with an explicit Dockerfile path
  ./scripts/build-agent-image.sh --dockerfile=docker/agent-base/Dockerfile.python custom-tag
EOF
}

IMAGE_TYPE="node"
DOCKERFILE_PATH="docker/agent-base/Dockerfile"

# Parse options
TAGS=()
for arg in "$@"; do
  case "$arg" in
    -h|--help)
      show_help
      exit 0
      ;;
    --python)
      IMAGE_TYPE="python"
      DOCKERFILE_PATH="docker/agent-base/Dockerfile.python"
      ;;
    --dockerfile=*)
      DOCKERFILE_PATH="${arg#*=}"
      ;;
    *)
      TAGS+=("$arg")
      ;;
  esac
  # Remove processed --python/--dockerfile= args for accurate tags
  if [[ "$arg" == --python || "$arg" == --dockerfile=* ]]; then
    shift
  fi
done

IMAGE_NAME="${AGENT_BASE_IMAGE:-ghcr.io/youngchingjui/agent-base}"

# Default tags
if [ "${#TAGS[@]}" -eq 0 ]; then
  if [ "$IMAGE_TYPE" = "python" ]; then
    TAGS=("python3.11-latest")
  else
    TAGS=("latest")
  fi
fi

PLATFORMS="linux/amd64,linux/arm64"

# Prepare repeated -t arguments for docker buildx
tag_args=()
for tag in "${TAGS[@]}"; do
  tag_args+=("-t" "${IMAGE_NAME}:${tag}")
done

echo "Building custom agent base image type '\''$IMAGE_TYPE'\'' with tags: ${TAGS[*]} using Dockerfile: ${DOCKERFILE_PATH}"

docker buildx build \
  --platform "${PLATFORMS}" \
  "${tag_args[@]}" \
  -f "${DOCKERFILE_PATH}" \
  --builder "container-builder" \
  --push \
  .

echo "Image built successfully!"

# Use the first tag for smoke-tests
TEST_TAG="${TAGS[0]}"

echo "Running smoke tests on: ${IMAGE_NAME}:${TEST_TAG}"
if [ "$IMAGE_TYPE" = "python" ]; then
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" rg --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" git --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" curl --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" python3 --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" pip --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" poetry --version
else
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" rg --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" git --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" curl --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" node --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" npm --version
  docker run --rm "${IMAGE_NAME}:${TEST_TAG}" pnpm --version
fi

echo "✅ Custom agent image is ready for use!"
echo "Image tags: ${TAGS[*]}"
echo "Platforms: ${PLATFORMS}"
if [ "$IMAGE_TYPE" = "python" ]; then
  echo "Includes: ripgrep, git, curl, python3.11, pip, poetry"
else
  echo "Includes: ripgrep, git, curl, nodejs (npm), pnpm"
fi
