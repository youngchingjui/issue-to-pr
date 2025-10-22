#!/usr/bin/env bash
set -euo pipefail

# Build and push multi-arch Docker image for the workflow workers service
# Default image: ghcr.io/<owner>/workflow-workers
# Usage:
#   ./scripts/build-workflow-workers-image.sh [TAG...]
# Examples:
#   ./scripts/build-workflow-workers-image.sh              # -> latest
#   ./scripts/build-workflow-workers-image.sh 20250101 sha-abc123 latest

show_help() {
  cat <<'EOF'
Build the multi-architecture Docker image for the workflow workers (apps/workers/workflow-workers).

Usage: build-workflow-workers-image.sh [TAG...]

Positional arguments:
  TAG   One or more tags to apply (default: latest)

Environment variables:
  WORKFLOW_WORKERS_IMAGE  Full image name to use. Defaults to ghcr.io/${GITHUB_OWNER:-${USER:-unknown}}/workflow-workers
  PLATFORMS               Target platforms (default: linux/amd64,linux/arm64)
  BUILDER                 Buildx builder name to use (default: container-builder)

Prerequisites:
  - Docker Buildx enabled
  - A builder named "container-builder" created with the docker-container driver, e.g.:
      docker buildx create --name container-builder --driver docker-container --use

EOF
}

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      show_help
      exit 0
      ;;
  esac
done

# Infer owner from git remote if possible
infer_owner() {
  git config --get remote.origin.url | sed -E 's#.*github.com[:/ ]([^/]+)/.*#\1#' || true
}

OWNER="${GITHUB_REPOSITORY_OWNER:-$(infer_owner)}"
OWNER="${OWNER:-${USER:-unknown}}"
IMAGE_NAME="${WORKFLOW_WORKERS_IMAGE:-ghcr.io/${OWNER}/workflow-workers}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER="${BUILDER:-container-builder}"

if [ "$#" -eq 0 ]; then
  TAGS=("latest")
else
  TAGS=("$@")
fi

TAG_ARGS=()
for tag in "${TAGS[@]}"; do
  TAG_ARGS+=("-t" "${IMAGE_NAME}:${tag}")
done

echo "Building workflow-workers image for platforms: ${PLATFORMS}"
echo "Tags: ${TAGS[*]}"
echo "Using builder: ${BUILDER}"

# Build context is repo root so the Dockerfile can access workspace
DOCKERFILE_PATH="apps/workers/workflow-workers/Dockerfile"

docker buildx build \
  --platform "${PLATFORMS}" \
  --builder "${BUILDER}" \
  --provenance=false \
  "${TAG_ARGS[@]}" \
  -f "${DOCKERFILE_PATH}" \
  --push \
  .

echo "✔ Image pushed: ${IMAGE_NAME} [${TAGS[*]}]"
echo "ℹ️ Supports: ${PLATFORMS}"

