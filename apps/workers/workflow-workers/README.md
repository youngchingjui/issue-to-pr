# workflow-workers

BullMQ worker that consumes workflow jobs and performs repository operations using Redis, Neo4j, GitHub APIs, and OpenAI. Built as a standalone container and orchestrated via `docker/docker-compose.yml`.

## How it works

- Entrypoint: `src/index.ts`
  - Loads environment via `src/helper.ts` (Next.js-like `.env` load order within this package).
  - Connects to Redis via `shared/adapters/ioredis/client`.
  - Starts a BullMQ `Worker` on the `WORKFLOW_JOBS_QUEUE` (from `shared/entities/Queue`).
  - Emits progress logs and listens to job lifecycle events.
  - Graceful shutdown on `SIGINT`/`SIGTERM` with a default 1-hour timeout.
  - Concurrency is controlled by `WORKER_CONCURRENCY` (default `1`).

## Environment variables

These must be set (they mirror `src/schemas.ts`):

- `REDIS_URL`: e.g. `redis://localhost:6379` (local dev) or `redis://redis:6379` (Docker Compose)
- `OPENAI_API_KEY`
- `WORKER_CONCURRENCY`: optional, default `1`
- `SHUTDOWN_TIMEOUT_MS`: optional, default `3600000`
- `NEO4J_URI`: e.g. `bolt://localhost:7687` (local dev) or `bolt://neo4j:7687` (Docker Compose)
- `NEO4J_USER`
- `NEO4J_PASSWORD`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY_PATH`: file path to the `.pem` key

Docker Compose note:

- In Compose, `GITHUB_APP_PRIVATE_KEY_PATH` is set to `${GITHUB_APP_PRIVATE_KEY_CONTAINER_PATH}` and the key is volume-mounted. See `docker/compose/worker.yml` and `docker/README.md`.

Local `.env` load order for this package (highest precedence first):
`process.env` → `.env.$NODE_ENV.local` → `.env.local` (skipped in test) → `.env.$NODE_ENV` → `.env`

Place these files next to this README (package root): `apps/workers/workflow-workers/.env*`.

## Local development

From repo root:

```bash
# Bring up Redis/Neo4j via compose
docker compose -f docker/docker-compose.yml up -d redis neo4j

# Start worker in watch mode (tsx)
pnpm dev:workflow-workers
```

Local dev hints:

- Use `REDIS_URL=redis://127.0.0.1:6379`
- Use `NEO4J_URI=bolt://127.0.0.1:7687`
- Keep your GitHub App private key on disk and point `GITHUB_APP_PRIVATE_KEY_PATH` to that file.

## Building the Docker image (local)

Run from repository root because the Dockerfile expects monorepo context:

```bash
# Build image from the worker Dockerfile
docker build -f apps/workers/workflow-workers/Dockerfile -t ghcr.io/youngchingjui/workflow-workers:<tag> .

# Optional: push to GHCR
docker login ghcr.io
docker push ghcr.io/youngchingjui/workflow-workers:<tag>
```

Common tags:

- `latest`: used by default in `docker/compose/worker.yml`
- Date tags or short SHAs for traceability

## Running under Docker Compose

Compose references the published image in `docker/compose/worker.yml`. Prepare `docker/env/.env.worker` (see `docker/README.md`), then:

```bash
docker compose -f docker/docker-compose.yml up -d workflow-workers
docker compose -f docker/docker-compose.yml logs -f workflow-workers
```

To refresh after a new image is built:

```bash
docker compose -f docker/docker-compose.yml pull workflow-workers
docker compose -f docker/docker-compose.yml up -d workflow-workers
```

## CI build and push

We provide `.github/workflows/build-worker-image.yml` to build and push multi-arch images to GHCR.

Manual usage (current default):

1. In GitHub → Actions → “Build and Push Worker Docker Image” → Run workflow.
2. The workflow tags `latest`, a short `sha`, and a date-time tag.
3. Pull and restart in your environment:
   ```bash
   docker compose -f docker/docker-compose.yml pull workflow-workers
   docker compose -f docker/docker-compose.yml up -d workflow-workers
   ```

We plan to automate this on merges in the future.

## Operational tips

- Logs:
  ```bash
  docker compose -f docker/docker-compose.yml logs -f workflow-workers
  ```
- Restart gracefully:
  ```bash
  docker compose -f docker/docker-compose.yml restart workflow-workers
  ```
- Change concurrency:
  - Increase `WORKER_CONCURRENCY` in `docker/env/.env.worker` and restart.
- Graceful shutdown timeout:
  - Adjust `SHUTDOWN_TIMEOUT_MS` (ms). Default is 1 hour.

## Links

- Docker orchestration and service configuration: `docker/README.md`
