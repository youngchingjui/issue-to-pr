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

One-command deployment:

```bash
./scripts/deploy-production.sh --with-nginx
```

⚠️ **Before deploying to production**, complete the [Production Hardening Checklist](production-checklist.md). This includes critical items like SSL certificate auto-renewal, log rotation, and monitoring.

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

3. **Deploy with NGINX:**

   ```bash
   ./scripts/deploy-production.sh --with-nginx
   ```

4. **Set up SSL (optional):**

   ```bash
   # Add Porkbun credentials
   sudo mkdir -p /etc/letsencrypt/secrets
   sudo nano /etc/letsencrypt/secrets/porkbun.ini

   # Obtain certificates
   docker compose -f docker/docker-compose.yml --profile prod run --rm certbot certonly \
     --dns-porkbun -d yourdomain.com -d '*.yourdomain.com'
   ```

5. **Update NGINX configs:**
   Edit `docker/nginx/conf.d/*.conf` to use your domain instead of `issuetopr.dev`.

### Scenario 2: Deploy Without NGINX

If you have your own reverse proxy (Caddy, Traefik, etc.):

```bash
./scripts/deploy-production.sh
```

This deploys all services except NGINX. Access Next.js at `http://localhost:3000`.

### Scenario 3: Updating Existing Deployment

```bash
git pull origin main
./scripts/deploy-production.sh --with-nginx
```

The script detects existing services and updates them gracefully.

### Scenario 4: Port Conflicts

If ports 80/443 are already in use:

**Option A: Use different ports**

```bash
NGINX_HTTP_PORT=8080 NGINX_HTTPS_PORT=8443 ./scripts/deploy-production.sh --with-nginx
```

**Option B: Stop conflicting service**

```bash
# Find what's using the port
sudo lsof -i :80
sudo lsof -i :443

# Stop old nginx (example)
docker stop nginx
docker rm nginx

# Now deploy
./scripts/deploy-production.sh --with-nginx
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
- **NGINX**: Optional (use `--with-nginx`)
- **Command**: `./scripts/deploy-production.sh`

### Production

- **Profile**: `prod`
- **Services**: All services including NGINX
- **NGINX**: Recommended for SSL/preview URLs
- **Command**: `./scripts/deploy-production.sh --with-nginx`

## Pre-Deployment Checks

Run pre-flight checks before deploying:

```bash
bash docker/scripts/check-nginx-prereqs.sh
```

This validates:

- Port availability (80, 443)
- Docker networks exist
- SSL certificates present
- NGINX config syntax
- No conflicting containers

## Profiles

Issue To PR uses Docker Compose profiles:

| Profile | Services | Use Case |
|---------|----------|----------|
| (none) | Neo4j, Redis | Local development |
| `prod` | Neo4j, Redis, Workers, NGINX | Production/Staging |

Start specific profiles:

```bash
# Infrastructure only
docker compose -f docker/docker-compose.yml up -d

# Everything except NGINX
docker compose -f docker/docker-compose.yml --profile prod up -d neo4j redis workflow-workers

# Everything including NGINX
docker compose -f docker/docker-compose.yml --profile prod up -d
```

## NGINX Configuration

NGINX is optional but recommended for production because:

- SSL/TLS termination
- Preview URL routing (`*.yourdomain.com` → containers)
- Load balancing (future)

### Customizing for Your Domain

Edit `docker/nginx/conf.d/`:

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
        # ... rest of config
    }
}
```

## Troubleshooting

### Port Conflicts

**Error**: `Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use`

**Solution**:

```bash
# Find what's using the port
sudo lsof -i :80

# Option 1: Stop the service
sudo systemctl stop nginx  # or whatever service

# Option 2: Use different port
NGINX_HTTP_PORT=8080 ./scripts/deploy-production.sh --with-nginx
```

### NGINX Config Error

**Error**: `nginx: [emerg] host not found in upstream`

**Solution**: Check that service names in proxy_pass directives are correct and containers are running.

### Preview Network Missing

**Error**: `network preview declared as external, but could not be found`

**Solution**:

```bash
docker network create preview
```

### SSL Certificate Not Found

**Error**: `cannot load certificate "/etc/letsencrypt/live/..."`

**Solution**: Either obtain certificates or temporarily disable SSL in NGINX config for testing.

## Monitoring

### View Logs

```bash
# All services
docker compose -f docker/docker-compose.yml logs -f

# Specific service
docker compose -f docker/docker-compose.yml logs -f nginx
docker compose -f docker/docker-compose.yml logs -f workflow-workers
```

### Check Service Health

```bash
docker compose -f docker/docker-compose.yml ps
```

### Restart Service

```bash
docker compose -f docker/docker-compose.yml restart nginx
```

## Rollback

If deployment fails:

```bash
# Stop all services
docker compose -f docker/docker-compose.yml --profile prod down

# Checkout previous version
git checkout <previous-commit>

# Redeploy
./scripts/deploy-production.sh --with-nginx
```

## References

- [Production Hardening Checklist](production-checklist.md) ⭐ **Start here for production deployments**
- [Docker Configuration](../../docker/README.md)
- [NGINX Setup](../../docker/nginx/README.md)
- [NGINX Migration Guide](../../docker/NGINX_MIGRATION.md)
- [Worker Configuration](../../apps/workers/workflow-workers/README.md)
