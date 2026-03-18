# Deployment Guide

For the reasoning behind our infrastructure choices, see [Infrastructure Requirements](./infrastructure.md).

## Local Development

A single command starts everything needed for local development with hot reload:

```bash
docker compose -f docker/docker-compose.yml up -d
```

This starts Neo4j, Redis, Next.js, and workers — all with hot reload.

> **Open question:** Should local dev use `docker compose` for everything (including Next.js and workers with volume-mounted source for hot reload), or should Docker only run infrastructure (Neo4j, Redis) while Next.js and workers run natively? Docker Compose for everything gives a single-command setup, but hot reload can be slower on macOS. Native apps are faster but require multiple commands.

## Production

A single command starts the full production stack:

```bash
docker compose -f docker/docker-compose.yml --profile prod up -d
```

This starts Neo4j, Redis, Next.js, workers, and NGINX.

## Fresh Server Setup

**Prerequisites:** Docker, Docker Compose, ports 80 available, DNS configured.

1. **Clone and configure:**

   ```bash
   git clone https://github.com/youngchingjui/issue-to-pr.git
   cd issue-to-pr
   cp docker/env/.env.worker.example docker/env/.env.worker
   cp docker/env/.env.neo4j.example docker/env/.env.neo4j
   # Edit .env files with your credentials
   ```

2. **Create the preview network and start services:**

   ```bash
   docker network create preview
   docker compose -f docker/docker-compose.yml --profile prod up -d
   ```

3. **Add SSL (optional):** See `docker/nginx/README.md` → "Adding SSL for production"

## Profiles

| Profile | Services | Use Case |
|---------|----------|----------|
| (none) | Neo4j, Redis, Next.js, Workers | Local development (hot reload) |
| `prod` | Neo4j, Redis, Next.js, Workers, NGINX | Production |

## Updating

```bash
git pull origin main
docker compose -f docker/docker-compose.yml --profile prod up -d
```

## Port Conflicts

If port 80 is already in use:

```bash
NGINX_HTTP_PORT=8080 docker compose -f docker/docker-compose.yml --profile prod up -d
```

## Monitoring

```bash
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs -f nginx
docker compose -f docker/docker-compose.yml logs -f workflow-workers
```

## Rollback

```bash
docker compose -f docker/docker-compose.yml --profile prod down
git checkout <previous-commit>
docker compose -f docker/docker-compose.yml --profile prod up -d
```

## Production Checklist

- [ ] Environment variables configured (`docker/env/.env.worker`, `.env.neo4j`)
- [ ] SSL certificates obtained and NGINX configs updated (see `docker/nginx/README.md`)
- [ ] Certificate auto-renewal cron job set up
- [ ] Uptime monitoring configured (e.g. UptimeRobot) for your domain
- [ ] Neo4j backups scheduled

## References

- [Docker Configuration](../../docker/README.md)
- [NGINX Setup](../../docker/nginx/README.md)
- [Worker Configuration](../../apps/workers/workflow-workers/README.md)
