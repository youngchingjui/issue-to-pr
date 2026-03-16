# Deployment Guide

## Quick Start

### Local Development

```bash
pnpm dev
```

Starts Neo4j and Redis. Run Next.js and workers locally with hot reload.

### Production

```bash
docker network create preview
docker compose -f docker/docker-compose.yml --profile prod up -d
```

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

2. **Start services:**

   ```bash
   docker network create preview
   docker compose -f docker/docker-compose.yml --profile prod up -d
   ```

   NGINX starts on port 80 (HTTP). Everything works without SSL.

3. **Add SSL (optional):** See `docker/nginx/README.md` → "Adding SSL for production"

## Profiles

| Profile | Services | Use Case |
|---------|----------|----------|
| (none) | Neo4j, Redis | Local development |
| `prod` | Neo4j, Redis, Workers, NGINX | Production/Staging |

```bash
# Infrastructure only (local dev)
docker compose -f docker/docker-compose.yml up -d

# Production without NGINX (bring your own reverse proxy)
docker compose -f docker/docker-compose.yml --profile prod up -d neo4j redis workflow-workers

# Production with NGINX
docker compose -f docker/docker-compose.yml --profile prod up -d
```

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
