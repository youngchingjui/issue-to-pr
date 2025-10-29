# Docker Configuration

This directory contains all Docker-related configurations for Issue To PR.

## Directory Structure

```
docker/
├── agent-base/ # Base image for containerized agent workflows
│ └── Dockerfile
├── compose/ # Service-specific compose files
│ ├── neo4j.yml
│ ├── neo4j-staging.yml
│ ├── neo4j-prod-backup.yml
│ ├── redis.yml
│ └── worker.yml
├── env/ # Per-service .env files (e.g. .env.worker, .env.neo4j)
└── docker-compose.yml # Main compose file (includes the files above)
```

## Environment Variables

In this monorepo there are multiple `.env` entry points. Wherever you see a `.env.example` or `.env.*.example`, copy it to a local `.env` file (remove the `.example` suffix) and edit as needed.

- Root Next.js app env is managed by Vercel. If this repo is linked to Vercel, use:

  ```bash
  vercel env pull
  ```

- Docker services use files under `docker/env/`:
  - Create `docker/env/.env.neo4j` (see the example below).
  - Copy `docker/env/.env.worker.example` to `docker/env/.env.worker` and fill in required values.

## Compose Usage

The root compose file uses the Compose `include:` feature to import service files from `compose/`.

- Requires Docker Compose v2.20+.
- From the repo root, use `-f docker/docker-compose.yml` to run services.

Common commands:

```bash
# Start Redis and Neo4j
docker compose -f docker/docker-compose.yml up -d redis neo4j

# Start the workflow workers (requires .env.worker and GHCR access if the image is private)
docker login ghcr.io
docker compose -f docker/docker-compose.yml up -d workflow-workers

# Stop all services included via docker/docker-compose.yml
docker compose -f docker/docker-compose.yml down
```

If your Compose version does not support `include:`, you can compose with multiple `-f` flags:

```bash
docker compose -f docker/compose/redis.yml -f docker/compose/neo4j.yml up -d
```

## Services

### Neo4j

- Ports: 7474 (HTTP), 7687 (Bolt)
- Env file: `docker/env/.env.neo4j`
- Volumes: data, logs, import, plugins
- Healthcheck: HTTP on port 7474

### Redis

- Port: 6379
- Volume: `redis_data`
- Healthcheck: `redis-cli ping`

### Workflow Workers

- Service name: `workflow-workers`
- Image: `ghcr.io/youngchingjui/workflow-workers:latest`
- Env file: `docker/env/.env.worker`
- Extra env: maps `GITHUB_APP_PRIVATE_KEY_PATH` from `GITHUB_APP_PRIVATE_KEY_CONTAINER_PATH`
- Volumes:
  - `${GITHUB_APP_PRIVATE_KEY_HOST_PATH}:${GITHUB_APP_PRIVATE_KEY_CONTAINER_PATH}:ro`
  - `/var/run/docker.sock:/var/run/docker.sock`
- Depends on: `redis`
- Stop behavior: `SIGTERM` with `1h` grace period

### Additional Neo4j stacks

These are optional stacks for staging and production backup flows:

```bash
# Staging
docker compose -f docker/docker-compose.yml -f docker/compose/neo4j-staging.yml up -d neo4j-staging

# Production backup
docker compose -f docker/docker-compose.yml -f docker/compose/neo4j-prod-backup.yml up -d neo4j-prod-backup
```

## Agent Base Image

We ship a custom base image for containerized agent workflows with pre-installed tools.

- OS: Debian bookworm-slim
- Includes:
  - Node.js v22 (with npm)
  - pnpm (via Corepack)
  - Python 3.11, pip3, Poetry
  - ripgrep, git, tree, curl

Image name: `ghcr.io/youngchingjui/agent-base:latest`  
If the image is private, log in to GHCR:

```bash
docker login ghcr.io
```

### Building the Agent Base Image

```bash
# Build the multi-arch agent image and push to GHCR
./scripts/build-agent-image.sh
```

- Prerequisite: a Docker Buildx builder named `container-builder` with the `docker-container` driver.
  ```bash
  docker buildx version
  docker buildx create --name container-builder --driver docker-container --use
  ```
- Script details:
  - Multi-arch: `linux/amd64, linux/arm64`
  - Default image: `ghcr.io/youngchingjui/agent-base` (override with `AGENT_BASE_IMAGE`)
  - Accepts optional tags (defaults to `latest`)
  - Runs smoke tests after pushing

## Networks

All services run on the `issue-to-pr-network` created by `docker/docker-compose.yml`.

## Adding New Services

1. Create a new service file in `docker/compose/`.
2. Add any service-specific configs and volumes.
3. Ensure it’s included via `include:` in `docker/docker-compose.yml` (or use `-f` flags).
4. Add required env keys to `docker/env/.env.<service>.example` and document them here.
