# Deployment Guide

This guide covers deploying Issue To PR in different environments.

## Quick Start

### Local Development

```bash
# Start infrastructure only (no NGINX)
pnpm dev
```

This starts Neo4j and Redis. Run Next.js and workers locally with hot reload.

### Production Deployment

```bash
# Create the preview network (one-time)
docker network create preview

# Start all services including NGINX
docker compose -f docker/docker-compose.yml --profile prod up -d
```

## Deployment Scenarios

### Scenario 1: Fresh Server Installation

**Prerequisites:**

- Docker and Docker Compose installed
- Ports 80/443 available (if using NGINX)
- Domain DNS configured

**Steps:**

1. **Clone repository:**

   ```bash
   git clone https://github.com/youngchingjui/issue-to-pr.git
   cd issue-to-pr
   ```

2. **Configure environment:**

   ```bash
   cp docker/env/.env.worker.example docker/env/.env.worker
   cp docker/env/.env.neo4j.example docker/env/.env.neo4j
   ```

   Edit these files with your credentials and API keys.

3. **Create the preview network and start services:**

   ```bash
   docker network create preview
   docker compose -f docker/docker-compose.yml --profile prod up -d
   ```

4. **Set up SSL:**

   ```bash
   # Add Porkbun credentials
   sudo mkdir -p /etc/letsencrypt/secrets
   sudo nano /etc/letsencrypt/secrets/porkbun.ini
   # Add: dns_porkbun_key = <KEY>
   # Add: dns_porkbun_secret = <SECRET>
   sudo chmod 600 /etc/letsencrypt/secrets/porkbun.ini

   # Obtain certificates
   docker compose -f docker/docker-compose.yml --profile prod run --rm certbot certonly \
     --agree-tos -m admin@yourdomain.com --no-eff-email \
     --authenticator dns-porkbun \
     --dns-porkbun-credentials /etc/letsencrypt/secrets/porkbun.ini \
     -d yourdomain.com -d '*.yourdomain.com'

   # Reload NGINX to pick up certs
   docker compose -f docker/docker-compose.yml exec nginx nginx -s reload
   ```

5. **Update NGINX configs:**
   Edit `docker/nginx/conf.d/*.conf` to use your domain instead of `issuetopr.dev`.

6. **Set up certificate auto-renewal** (certs expire every 90 days):

   ```bash
   # Add to crontab (runs daily at 2am):
   0 2 * * * cd /path/to/issue-to-pr && docker compose -f docker/docker-compose.yml --profile prod run --rm certbot renew && docker compose -f docker/docker-compose.yml exec nginx nginx -s reload >> /var/log/certbot-renewal.log 2>&1
   ```

### Scenario 2: Deploy Without NGINX

If you have your own reverse proxy (Caddy, Traefik, etc.):

```bash
docker compose -f docker/docker-compose.yml --profile prod up -d neo4j redis workflow-workers
```

Access Next.js at `http://localhost:3000`.

### Scenario 3: Updating Existing Deployment

```bash
git pull origin main
docker compose -f docker/docker-compose.yml --profile prod up -d
```

### Scenario 4: Port Conflicts

If ports 80/443 are already in use:

**Option A: Use different ports**

```bash
NGINX_HTTP_PORT=8080 NGINX_HTTPS_PORT=8443 docker compose -f docker/docker-compose.yml --profile prod up -d
```

**Option B: Stop conflicting service**

```bash
# Find what's using the port
sudo lsof -i :80

# Stop it, then deploy
docker compose -f docker/docker-compose.yml --profile prod up -d
```

## Profiles

| Profile | Services | Use Case |
|---------|----------|----------|
| (none) | Neo4j, Redis | Local development |
| `prod` | Neo4j, Redis, Workers, NGINX | Production/Staging |

```bash
# Infrastructure only
docker compose -f docker/docker-compose.yml up -d

# Everything except NGINX
docker compose -f docker/docker-compose.yml --profile prod up -d neo4j redis workflow-workers

# Everything including NGINX
docker compose -f docker/docker-compose.yml --profile prod up -d
```

## NGINX Configuration

NGINX is optional but recommended for production:

- SSL/TLS termination
- Preview URL routing (`*.yourdomain.com` → containers)

### Customizing for Your Domain

Edit files in `docker/nginx/conf.d/`:

- Replace `issuetopr.dev` with your domain
- Update SSL certificate paths
- Adjust proxy_pass targets if needed

Example changes in `issuetopr.dev.conf`:

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;  # Change this

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;  # Update path
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;  # Update path

    location / {
        proxy_pass http://host.docker.internal:3000;  # Keep this
    }
}
```

See `docker/nginx/README.md` for full NGINX documentation.

## Troubleshooting

### Port Conflicts

**Error**: `bind: address already in use`

```bash
# Find what's using the port
sudo lsof -i :80

# Or use different ports
NGINX_HTTP_PORT=8080 docker compose -f docker/docker-compose.yml --profile prod up -d
```

### Preview Network Missing

**Error**: `network preview declared as external, but could not be found`

```bash
docker network create preview
```

### SSL Certificate Not Found

**Error**: `cannot load certificate "/etc/letsencrypt/live/..."`

Obtain certificates via certbot (see fresh install steps above), or temporarily comment out SSL directives in nginx configs for testing.

### NGINX Config Error

**Error**: `nginx: [emerg] host not found in upstream`

Check that service names in proxy_pass directives are correct and containers are running.

```bash
# Test config syntax
docker compose -f docker/docker-compose.yml exec nginx nginx -t

# View logs
docker compose -f docker/docker-compose.yml logs -f nginx
```

## Environment-Specific Configurations

### Development (Local)

- **Profile**: None (default)
- **Services**: Neo4j, Redis only
- **NGINX**: Not needed (use Next.js dev server)
- **Command**: `pnpm dev`

### Staging

- **Profile**: `prod`
- **Services**: All services including workers
- **NGINX**: Optional
- **Command**: `docker compose -f docker/docker-compose.yml --profile prod up -d neo4j redis workflow-workers`

### Production

- **Profile**: `prod`
- **Services**: All services including NGINX
- **NGINX**: Recommended for SSL/preview URLs
- **Command**: `docker compose -f docker/docker-compose.yml --profile prod up -d`

## Monitoring

```bash
# Check service health
docker compose -f docker/docker-compose.yml ps

# View logs (all or specific service)
docker compose -f docker/docker-compose.yml logs -f
docker compose -f docker/docker-compose.yml logs -f nginx
docker compose -f docker/docker-compose.yml logs -f workflow-workers

# Restart a service
docker compose -f docker/docker-compose.yml restart workflow-workers
```

## Rollback

```bash
docker compose -f docker/docker-compose.yml --profile prod down
git checkout <previous-commit>
docker compose -f docker/docker-compose.yml --profile prod up -d
```

## Production Checklist

Complete these before running in production.

### Certificate Auto-Renewal

Certs expire every 90 days. Add to crontab:

```bash
0 2 * * * cd /path/to/issue-to-pr && docker compose -f docker/docker-compose.yml --profile prod run --rm certbot renew && docker compose -f docker/docker-compose.yml exec nginx nginx -s reload >> /var/log/certbot-renewal.log 2>&1
```

Test with a dry run: `docker compose -f docker/docker-compose.yml --profile prod run --rm certbot renew --dry-run`

### Log Rotation

Docker container logs grow indefinitely. Add to `docker/compose/nginx.yml`:

```yaml
services:
  nginx:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Monitoring

Set up uptime monitoring (e.g. UptimeRobot free tier) for your domain. Monitor:

- HTTPS response on your domain
- SSL certificate expiration
- Disk space on the server

### Backups

Back up regularly:

- `docker/env/` (environment variables and API keys)
- Neo4j database (`docker compose exec neo4j neo4j-admin database dump neo4j`)
- SSL certs are re-obtainable via certbot, but backing up `/etc/letsencrypt` saves time

## References

- [Docker Configuration](../../docker/README.md)
- [NGINX Setup](../../docker/nginx/README.md)
- [Worker Configuration](../../apps/workers/workflow-workers/README.md)
