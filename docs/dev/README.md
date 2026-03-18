# Developer Documentation

> These docs describe the **ideal state** of the system — the architecture we're building toward. They may not reflect the current implementation.

Technical documentation for developers working on Issue To PR.

Each file describes the technical requirements to support a user-facing feature or a DX use case. User docs (`docs/user/`) describe WHAT users experience; dev docs describe HOW we make that happen.

## Structure

Docs are organized by DX use case — a developer should be able to find the right doc by asking "I want to do X":

- **"I have a new server and want to get Issue To PR running"** → [infrastructure.md](./infrastructure.md)
- **"I want to enable HTTPS on my server"** → `https.md` (planned)
- **"I want to understand how preview deployments work"** → `preview-deployments.md` (planned)
- **"I want to set up local development"** → `local-development.md` (planned)

## Current files

- [Deployment Guide](./deployment.md) — How to deploy Issue To PR (local dev and production)
- [Infrastructure Requirements](./infrastructure.md) — DX requirements for deployment, Docker, NGINX

## Planned

- `https.md` — How to set up HTTPS: DNS requirements (A records pointing to server), certbot with Porkbun DNS-01, mounting certs in NGINX, auto-renewal cron. Prerequisites: server running, domain owned.
- `preview-deployments.md` — Technical requirements for preview subdomain routing: Docker preview network, container naming/aliases, NGINX wildcard routing, slug generation. Supports `docs/user/preview-deployments.md`.
- `local-development.md` — How to run Issue To PR locally. Should resolve the `pnpm dev` vs `docker compose up` confusion (see open questions in infrastructure.md).

## TODO: Migrate existing docs here

- `docs/guides/architecture.md` → `docs/dev/architecture.md`
- `docs/guides/authentication.md` → `docs/dev/authentication.md`
- `docs/guides/ai-integration.md` → `docs/dev/ai-integration.md`
- `docs/guides/streaming-architecture.md` → `docs/dev/streaming-architecture.md`
- `docs/guides/observability.md` → `docs/dev/observability.md`
- `docs/internal/auth-flow-diagrams.md` → `docs/dev/auth-flow-diagrams.md`
- `docs/internal/workflow-authorization-spec.md` → `docs/dev/workflow-authorization.md`
- `docs/internal/workflow-runs-tech-specs.md` → `docs/dev/workflow-runs-tech-specs.md`
- `docs/internal/github-webhook-workflows.md` → `docs/dev/github-webhook-workflows.md`
- `docs/internal/repo-cache.md` → `docs/dev/repo-cache.md`
- `docs/components/README.md` → `docs/dev/components.md`
