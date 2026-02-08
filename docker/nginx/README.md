# NGINX Configuration

This directory contains NGINX reverse proxy configuration for Issue To PR.

## Overview

NGINX runs as a Docker container and serves as the reverse proxy for:
- **Main application**: `issuetopr.dev` → Next.js app on host (port 3000)
- **Preview deployments**: `*.issuetopr.dev` → Docker containers on preview network
- **Monitoring**: `grafana.issuetopr.dev` → Grafana dashboard

## Directory Structure

```
docker/nginx/
├── nginx.conf           # Main NGINX configuration
├── conf.d/              # Server block configurations
│   ├── issuetopr.dev.conf                      # Main production domain
│   ├── preview.issuetopr.dev.conf              # Wildcard preview subdomains
│   └── grafana.issuetopr.dev.conf              # Grafana monitoring
└── default.d/           # Default server configurations
```

## Key Configuration Files

### `nginx.conf`
Main NGINX configuration with:
- Worker process settings
- HTTP/HTTPS server defaults
- WebSocket upgrade support (`map $http_upgrade $connection_upgrade`)
- Increased `server_names_hash_bucket_size` for long DNS names

### `conf.d/issuetopr.dev.conf`
Production server block:
- Routes `issuetopr.dev` → `host.docker.internal:3000` (Next.js)
- SSL/TLS with Let's Encrypt certificates
- SSE (Server-Sent Events) support on `/api/sse`
- HTTP → HTTPS redirect

### `conf.d/preview.issuetopr.dev.conf`
**Wildcard preview routing** for ephemeral deployments:
- Pattern: `~^(?<preview>.+)\.issuetopr\.dev$`
- Routes to Docker containers on `preview` network using subdomain as hostname
- Example: `main-youngchingjui-repo.issuetopr.dev` → container `main-youngchingjui-repo:3000`
- Injects tracking script into HTML responses
- Dynamic DNS resolution with `resolver 127.0.0.11`

## SSL/TLS Certificates

NGINX expects Let's Encrypt certificates at:
- Main domain: `/etc/letsencrypt/live/issuetopr.dev/`
- Wildcard: `/etc/letsencrypt/live/issuetopr.dev-0001/`

Certificates are managed via Certbot with Porkbun DNS-01 challenge (see `../certbot-porkbun/`).

### Certificate Renewal

**Automatic Renewal** (recommended for production):

Set up a cron job to run the renewal script daily:
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2am):
0 2 * * * /path/to/issue-to-pr/docker/scripts/renew-certs.sh >> /var/log/certbot-renewal.log 2>&1
```

The script automatically:
1. Attempts certificate renewal (only renews if expiring soon)
2. Reloads NGINX to pick up new certificates
3. Logs all activity

**Manual Renewal** (for testing):
```bash
# Test renewal without actually renewing
docker compose -f docker/docker-compose.yml --profile prod run --rm certbot renew --dry-run

# Force renewal
docker compose -f docker/docker-compose.yml --profile prod run --rm certbot renew --force-renewal

# Reload NGINX after manual renewal
docker compose -f docker/docker-compose.yml exec nginx nginx -s reload
```

⚠️ **Critical**: Without automated renewal, certificates expire in 90 days and your site will show security warnings. See [Production Checklist](../../docs/deployment/production-checklist.md#1-ssl-certificate-auto-renewal) for setup instructions.

## Docker Networks

NGINX bridges two networks:
1. **`issue-to-pr-network`**: Main internal network for services
2. **`preview`** (external): For ephemeral preview containers

Preview containers must:
- Join the `preview` network
- Use a network alias matching the subdomain (e.g., `main-youngchingjui-repo`)

## Usage

### Start NGINX (Production Profile)

```bash
# From repo root
docker compose -f docker/docker-compose.yml --profile prod up -d nginx
```

### Test Configuration

```bash
docker compose -f docker/docker-compose.yml exec nginx nginx -t
```

### Reload After Config Changes

```bash
docker compose -f docker/docker-compose.yml exec nginx nginx -s reload
```

### View Logs

```bash
docker compose -f docker/docker-compose.yml logs -f nginx
```

### Stop NGINX

```bash
docker compose -f docker/docker-compose.yml stop nginx
```

## Preview URL Flow

When a user requests a workflow run:
1. Backend creates a container with labels (`preview=true`, `subdomain=<slug>`)
2. Container joins `preview` network with alias matching subdomain
3. User accesses `https://<subdomain>.issuetopr.dev`
4. NGINX regex captures subdomain and proxies to `http://<subdomain>:3000`

See `/shared/src/entities/previewSlug.ts` for subdomain slug generation logic.

## Adding New Server Blocks

To add a new domain/service:

1. Create a new `.conf` file in `conf.d/`:
   ```nginx
   server {
       listen 443 ssl;
       server_name example.issuetopr.dev;

       ssl_certificate /etc/letsencrypt/live/issuetopr.dev-0001/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/issuetopr.dev-0001/privkey.pem;

       location / {
           proxy_pass http://host.docker.internal:PORT;
           # Add standard proxy headers...
       }
   }
   ```

2. Test configuration:
   ```bash
   docker compose -f docker/docker-compose.yml exec nginx nginx -t
   ```

3. Reload NGINX:
   ```bash
   docker compose -f docker/docker-compose.yml exec nginx nginx -s reload
   ```

## Troubleshooting

### Container Can't Reach Host Services
- Ensure `host.docker.internal` is in `extra_hosts` (docker/compose/nginx.yml)
- Verify Next.js is listening on `0.0.0.0:3000` (not just `localhost`)

### Preview URLs Return 502
- Check container is on `preview` network: `docker network inspect preview`
- Verify network alias matches subdomain: `docker inspect <container>`
- Check container port 3000 is listening

### SSL Certificate Errors
- Verify certs exist at `/etc/letsencrypt/live/issuetopr.dev*/`
- Ensure volume mount is correct in `docker/compose/nginx.yml`
- Check cert permissions (should be readable by nginx user)

## References

- Main Docker README: `../README.md`
- Certbot setup: `../certbot-porkbun/`
- Preview slug generation: `/shared/src/entities/previewSlug.ts`
- Container setup: `/shared/src/lib/utils/container.ts`
