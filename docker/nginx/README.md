# NGINX Configuration

NGINX reverse proxy for Issue To PR. Runs as a Docker container, routing traffic to the right service.

## What it routes

| Domain | Upstream | Port |
|--------|----------|------|
| `issuetopr.dev` | Next.js on host | 3000 |
| `*.issuetopr.dev` | Preview containers on `preview` network | 3000 |
| `grafana.issuetopr.dev` | Grafana on host | 3001 |

## Directory structure

```text
docker/nginx/
├── nginx.conf           # Main config (worker settings, WebSocket map)
└── conf.d/              # One file per domain
    ├── issuetopr.dev.conf
    ├── preview.issuetopr.dev.conf
    └── grafana.issuetopr.dev.conf
```

## Running locally

```bash
# Create the preview network (one-time)
docker network create preview

# Start NGINX
docker compose -f docker/docker-compose.yml --profile prod up -d nginx
```

NGINX starts on port 80 (HTTP). No SSL certificates needed.

To use a different port: `NGINX_HTTP_PORT=8080 docker compose -f docker/docker-compose.yml --profile prod up -d nginx`

## Common commands

```bash
# Test config syntax
docker compose -f docker/docker-compose.yml exec nginx nginx -t

# Reload after config changes
docker compose -f docker/docker-compose.yml exec nginx nginx -s reload

# View logs
docker compose -f docker/docker-compose.yml logs -f nginx
```

## Preview URL routing

Preview containers get a subdomain like `my-feature.issuetopr.dev`. NGINX captures the subdomain via regex and proxies to a Docker container with a matching network alias on the `preview` network.

For this to work, the preview container must:

1. Join the `preview` Docker network
2. Have a network alias matching the subdomain (e.g., `my-feature`)
3. Listen on port 3000

NGINX also injects a small console log script into HTML responses from preview containers.

See `/shared/src/entities/previewSlug.ts` for slug generation logic.

## Adding SSL for production

The configs default to HTTP-only. To add SSL on a production server:

### 1. Get certificates with Certbot

Use the Porkbun DNS-01 challenge for wildcard certs:

```bash
# Install the Porkbun plugin
pip install certbot certbot-dns-porkbun

# Create credentials file
sudo mkdir -p /etc/letsencrypt/secrets
sudo tee /etc/letsencrypt/secrets/porkbun.ini > /dev/null <<EOL
dns_porkbun_key = YOUR_PORKBUN_API_KEY
dns_porkbun_secret = YOUR_PORKBUN_SECRET_KEY
EOL
sudo chmod 600 /etc/letsencrypt/secrets/porkbun.ini

# Obtain wildcard cert
sudo certbot certonly \
  --authenticator dns-porkbun \
  --dns-porkbun-credentials /etc/letsencrypt/secrets/porkbun.ini \
  --agree-tos -m admin@issuetopr.dev --no-eff-email \
  -d issuetopr.dev -d '*.issuetopr.dev'
```

Or use the certbot Docker image: `docker run --rm -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot ...`

### 2. Update NGINX configs

Add SSL directives to each server block in `conf.d/`. Example for `issuetopr.dev.conf`:

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name issuetopr.dev www.issuetopr.dev;

    ssl_certificate /etc/letsencrypt/live/issuetopr.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/issuetopr.dev/privkey.pem;

    # ... existing location blocks ...
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name issuetopr.dev www.issuetopr.dev;
    return 301 https://issuetopr.dev$request_uri;
}
```

### 3. Mount certs and expose port 443

Update `docker/compose/nginx.yml`:

```yaml
ports:
  - "${NGINX_HTTP_PORT:-80}:80"
  - "${NGINX_HTTPS_PORT:-443}:443"
volumes:
  - ../nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  - ../nginx/conf.d:/etc/nginx/conf.d:ro
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

Then reload: `docker compose -f docker/docker-compose.yml exec nginx nginx -s reload`

### 4. Set up auto-renewal

Certs expire every 90 days. Add a cron job:

```bash
# Add to crontab (runs daily at 2am):
0 2 * * * certbot renew --quiet && docker compose -f /path/to/docker/docker-compose.yml exec nginx nginx -s reload
```

## Troubleshooting

**Container can't reach host services** — Verify Next.js is listening on `0.0.0.0:3000`, not just `localhost`.

**Preview URLs return 502** — Check the container is on the `preview` network with the right alias: `docker network inspect preview`

**Config syntax error** — Run `docker compose -f docker/docker-compose.yml exec nginx nginx -t` and check the error message.

## References

- Docker compose setup: `../README.md`
- Preview slug generation: `/shared/src/entities/previewSlug.ts`
- Container setup: `/shared/src/lib/utils/container.ts`
