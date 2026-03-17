# Infrastructure Requirements

## Requirements

### 1. Single-repo deployability

Everything needed to deploy Issue To PR to a fresh server lives in this repo. A new contributor (or a CI pipeline) can clone the repo, configure env vars, and get a working production environment.

This means: Docker configs, NGINX configs, compose files, and deployment documentation all live here.

### 2. Environment parity

The same Docker Compose setup works for local development, staging, and production. Differences are handled through:

- **Profiles** — `prod` profile adds NGINX; default profile runs infrastructure (Neo4j, Redis)
- **Environment variables** — Secrets and host-specific values live in `docker/env/` files, not baked into configs
- **Layered SSL** — NGINX configs default to HTTP. SSL is added on top for production without changing the base configs

### 3. Isolation from unrelated services

Issue To PR runs on its own server, with its own NGINX instance, managing only its own domains. No shared infrastructure with other projects means:

- Changes to this config can't break other services
- Resource sizing is based solely on Issue To PR's needs
- Monitoring and debugging are scoped to one application

### 4. Configuration as code

All NGINX and Docker configuration is version-controlled and code-reviewed. No SSH-ing into a server to edit configs. Changes go through PRs, get reviewed, and are traceable in git history.

### 5. Modular setup — each step works independently

Infrastructure setup is layered. Each step works on its own and doesn't block on the next:

1. **NGINX + app** — `docker compose --profile prod up -d` gets Issue To PR running over HTTP. No DNS or SSL needed.
2. **DNS** — Point domain A records at the server IP. Requires step 1.
3. **HTTPS** — Obtain SSL certs (requires DNS), update NGINX configs, set up auto-renewal.

Each layer has its own documentation:
- NGINX setup: `docker/nginx/README.md`
- HTTPS setup: `docs/dev/https.md` (planned)

A developer can get a working deployment without touching DNS or SSL, then layer those on when ready.

## Open questions

### `pnpm dev` vs `docker compose up`

Today there are two overlapping ways to start local development:

- `pnpm dev` — Starts Docker infrastructure (Neo4j, Redis) AND the Next.js app and workers with hot reload
- `docker compose up` — Starts Docker infrastructure only (no profile), or everything in containers with `--profile prod`

This is confusing. A developer shouldn't have to think about which command to use.

**Proposed direction**: `pnpm dev` should only start the Next.js app (and maybe workers with hot reload). Docker infrastructure (Neo4j, Redis) should be started separately via `docker compose up`. This keeps concerns separate:

- `docker compose up` = infrastructure services
- `pnpm dev` = application code with hot reload

But this needs more thought — workers need hot reload in dev, and we need to figure out if that's compatible with running them via Docker Compose (volume mounts + file watching) or if workers must always run outside Docker in dev.

### Workers: Docker vs local in dev

Workers currently run outside Docker in local dev (for hot reload) and inside Docker in production. This works but means the local and production environments diverge. Options:

1. **Keep current approach** — Workers run locally for hot reload, in Docker for prod. Accept the divergence.
2. **Docker with volume mounts** — Run workers in Docker but mount source code for hot reload. More parity, but adds complexity.
3. **Hybrid** — Default to local workers, but support Docker workers for integration testing.

No decision made yet. The key requirement is: **developers must have hot reload for workers during local development.**

## Reading order

1. **This document** — Understand the requirements
2. **[Deployment README](../deployment/README.md)** — Quick start for deploying
3. **[Docker README](../../docker/README.md)** — Compose setup, services, environment variables
4. **[NGINX README](../../docker/nginx/README.md)** — Reverse proxy configuration, SSL setup, preview routing
