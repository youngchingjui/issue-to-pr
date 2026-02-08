# Docker Configuration

This directory contains all Docker-related configurations for Issue To PR.

## Directory Structure

```markdown
docker/
├── agent-base/ # Base image for containerized agent workflows
│ └── Dockerfile
├── certbot-porkbun/ # Certbot Dockerfile for SSL cert management
│ └── Dockerfile
├── compose/ # Service-specific compose files
│ ├── neo4j.yml
│ ├── neo4j-staging.yml
│ ├── neo4j-prod-backup.yml
│ ├── nginx.yml
│ ├── redis.yml
│ └── worker.yml
├── env/ # Per-service .env files (e.g. .env.worker, .env.neo4j)
├── nginx/ # NGINX reverse proxy configuration
│ ├── conf.d/ # Server block configs for each domain
│ ├── default.d/ # Default server configs
│ ├── nginx.conf # Main NGINX config
│ └── README.md # NGINX documentation
├── scripts/ # Helper scripts (e.g., certbot preflight checks)
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

Worker `.env.worker` must include (see `apps/workers/workflow-workers/src/schemas.ts`):

- REDIS_URL: e.g. `redis://redis:6379` (service name on the compose network)
- OPENAI_API_KEY
- WORKER_CONCURRENCY: optional, default `1`
- SHUTDOWN_TIMEOUT_MS: optional, default `3600000` (1h)
- NEO4J_URI: e.g. `bolt://neo4j:7687`
- NEO4J_USER
- NEO4J_PASSWORD
- GITHUB_APP_ID
- GITHUB_APP_PRIVATE_KEY_PATH: path inside the container; set this to `${GITHUB_APP_PRIVATE_KEY_CONTAINER_PATH}`

You must also provide the host/container private key paths used by the worker:

- `GITHUB_APP_PRIVATE_KEY_HOST_PATH`: absolute path on your host to the `.pem` file
- `GITHUB_APP_PRIVATE_KEY_CONTAINER_PATH`: where it will be mounted (e.g. `/run/secrets/github-app.pem`)
  Compose will mount the file and set `GITHUB_APP_PRIVATE_KEY_PATH` to the container path.

Minimal examples:

```bash
# docker/env/.env.neo4j
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# docker/env/.env.worker
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=sk-...
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
GITHUB_APP_ID=123456
# Mount the key and point the worker to the container path
GITHUB_APP_PRIVATE_KEY_HOST_PATH=/absolute/path/to/github-app-private-key.pem
GITHUB_APP_PRIVATE_KEY_CONTAINER_PATH=/run/secrets/github-app.pem
# Optional:
WORKER_CONCURRENCY=2
SHUTDOWN_TIMEOUT_MS=3600000
```

## Compose Usage

The root compose file uses the Compose `include:` feature to import service files from `compose/`.

- Requires Docker Compose v2.20+.
- From the repo root, use `-f docker/docker-compose.yml` to run services.

### Profiles

Services are organized using Docker Compose profiles for different environments:

| Profile | Services Started | Use Case |
|---------|-----------------|----------|
| (none)  | Neo4j, Redis | Local dev - run workers locally with hot reload |
| `prod`  | Neo4j, Redis, Workers, NGINX | Production/staging - all services in Docker |

### pnpm Scripts (Recommended)

```bash
# Development: Start infra (Neo4j, Redis) + Next.js + local worker
pnpm dev

# Development with smee (for webhook testing)
pnpm dev:all

# Production-like: Start all services in Docker (including workers)
pnpm docker:up:prod

# Stop all services
pnpm docker:down
```

### Direct Docker Compose Commands

```bash
# Start infrastructure only (Neo4j + Redis) - for local dev
docker compose -f docker/docker-compose.yml up -d

# Start all services including workers (production/staging)
docker compose -f docker/docker-compose.yml --profile prod up -d

# Start (or refresh) the workflow workers (requires .env.worker and GHCR access if the image is private)
docker login ghcr.io
docker compose -f docker/docker-compose.yml --profile prod up -d workflow-workers

# Pull latest images referenced by docker-compose
docker compose -f docker/docker-compose.yml pull

# Stop all services (including profiled ones)
docker compose -f docker/docker-compose.yml --profile prod down
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

For application-level details and local development instructions, see `apps/workers/workflow-workers/README.md`.

### NGINX

- Service name: `nginx`
- Image: `nginx:stable-alpine`
- Ports: 80 (HTTP), 443 (HTTPS)
- Config files: `docker/nginx/` (nginx.conf, conf.d/*)
- Volumes:
  - NGINX configs (read-only)
  - `/etc/letsencrypt` (SSL certificates from host)
- Networks: `issue-to-pr-network`, `preview` (external)
- Profile: `prod`
- Restart: `unless-stopped`

NGINX serves as the reverse proxy for:

- **Production**: `issuetopr.dev` → Next.js on `host.docker.internal:3000`
- **Previews**: `*.issuetopr.dev` → Docker containers on `preview` network
- **Monitoring**: `grafana.issuetopr.dev` → Grafana dashboard

For detailed configuration and usage, see `docker/nginx/README.md`.

Quick commands:

```bash
# Start NGINX
docker compose -f docker/docker-compose.yml --profile prod up -d nginx

# Test config
docker compose -f docker/docker-compose.yml exec nginx nginx -t

# Reload after changes
docker compose -f docker/docker-compose.yml exec nginx nginx -s reload
```

### Additional Neo4j stacks

Optional stacks for staging and production backup flows:

```bash
# Staging
docker compose -f docker/docker-compose.yml -f docker/compose/neo4j-staging.yml up -d neo4j-staging

# Production backup
docker compose -f docker/docker-compose.yml -f docker/compose/neo4j-prod-backup.yml up -d neo4j-prod-backup
```

## Worker image lifecycle and common commands

The worker service image is built from `apps/workers/workflow-workers/Dockerfile` and published to GHCR as `ghcr.io/youngchingjui/workflow-workers`.

Local build and test:

```bash
# From repo root. Build a dev tag locally
docker build -f apps/workers/workflow-workers/Dockerfile -t ghcr.io/youngchingjui/workflow-workers:dev .

# Option A: re-tag as latest for compose
docker tag ghcr.io/youngchingjui/workflow-workers:dev ghcr.io/youngchingjui/workflow-workers:latest

# Option B: push with your own tag and update compose or pull that tag explicitly
docker login ghcr.io
docker push ghcr.io/youngchingjui/workflow-workers:dev
```

Refresh the running service:

```bash
# Pull and restart the worker with the latest tag
docker compose -f docker/docker-compose.yml pull workflow-workers
docker compose -f docker/docker-compose.yml up -d workflow-workers

# Tail logs
docker compose -f docker/docker-compose.yml logs -f workflow-workers

# Restart gracefully
docker compose -f docker/docker-compose.yml restart workflow-workers

# Exec into the container
docker compose -f docker/docker-compose.yml exec workflow-workers sh
```

Recommended container-to-container endpoints on the compose network:

- `REDIS_URL=redis://redis:6379`
- `NEO4J_URI=bolt://neo4j:7687`

## Build and push worker image via GitHub Actions

We provide a CI workflow at `.github/workflows/build-worker-image.yml` that builds and pushes multi-arch images to GHCR with tags `latest`, a short commit SHA, and a date-time tag.

Manual run (current practice):

1. Push your code (or not required; you can run on any branch).
2. In GitHub → Actions → “Build and Push Worker Docker Image” → Run workflow.
3. Wait for completion.
4. On your host: pull and restart the service:

   ```bash
   docker compose -f docker/docker-compose.yml pull workflow-workers
   docker compose -f docker/docker-compose.yml up -d workflow-workers
   ```

We plan to automate triggering on merges in the future.

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

- **`issue-to-pr-network`**: Main internal network for all services (Neo4j, Redis, Workers, NGINX)
- **`preview`** (external): For ephemeral preview containers that NGINX routes to

The `preview` network must be created externally before starting NGINX:

```bash
docker network create preview
```

Preview containers must join this network with a network alias matching their subdomain.

## Adding New Services

1. Create a new service file in `docker/compose/`.
2. Add any service-specific configs and volumes.
3. Ensure it’s included via `include:` in `docker/docker-compose.yml` (or use `-f` flags).
4. Add required env keys to `docker/env/.env.<service>.example` and document them here.
