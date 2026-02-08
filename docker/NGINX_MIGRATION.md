# NGINX Configuration Migration Guide

This document describes the migration of NGINX configuration from the `young-and-ai-ec2-nginx` repository into the main `issue-to-pr` monorepo.

## What Was Migrated

### From `young-and-ai-ec2-nginx` Repository

**Configuration Files:**

- `nginx/nginx.conf` → `docker/nginx/nginx.conf`
- `nginx/conf.d/*.conf` → `docker/nginx/conf.d/*.conf`
- `nginx/default.d/` → `docker/nginx/default.d/`
- `certbot-porkbun/` → `docker/certbot-porkbun/`
- `scripts/` → `docker/scripts/`

**Docker Compose:**

- Adapted `docker-compose.yml` to fit monorepo pattern
- Created `docker/compose/nginx.yml` following existing service pattern
- Added to main `docker/docker-compose.yml` include list

## Why This Migration?

**Benefits:**

1. **Single Source of Truth**: All infrastructure in one repository
2. **Version Control**: NGINX config changes tracked alongside app changes
3. **Atomic Deployments**: App and routing changes deployed together
4. **Simplified Development**: No need to coordinate across repos
5. **Better Documentation**: Config close to the code it routes to

## Key Differences from Original Setup

### Directory Structure

- **Before**: Standalone repo with flat structure
- **After**: Organized under `docker/nginx/` in monorepo

### Docker Compose

- **Before**: Simple `docker-compose.yml` at root
- **After**: Modular `docker/compose/nginx.yml` included via `include:` directive
- **Network**: Uses shared `issue-to-pr-network` + external `preview` network

### Profiles

- **New**: NGINX is under `prod` profile
- **Benefit**: Can run local dev without NGINX (use Vercel or Next.js dev server)

## Migration Checklist for Production

If you're deploying this to production, ensure:

- [ ] **Preview network exists**:

  ```bash
  docker network create preview
  ```

- [ ] **SSL certificates exist** at `/etc/letsencrypt/`:

  ```bash
  ls -l /etc/letsencrypt/live/issuetopr.dev*/
  ```

- [ ] **Porkbun credentials** exist (for certbot renewals):

  ```bash
  ls -l /etc/letsencrypt/secrets/porkbun.ini
  ```

- [ ] **Next.js running** on host at port 3000 (or adjust proxy_pass in configs)

- [ ] **Test NGINX config** before starting:

  ```bash
  # Copy configs to temp location and test
  docker run --rm -v $(pwd)/docker/nginx:/etc/nginx:ro nginx:stable-alpine nginx -t
  ```

- [ ] **Start NGINX**:

  ```bash
  docker compose -f docker/docker-compose.yml --profile prod up -d nginx
  ```

- [ ] **Verify routing**:
  - Visit <https://issuetopr.dev>
  - Create a preview container and visit its subdomain

## Post-Migration

### Updating NGINX Configuration

1. Edit files in `docker/nginx/conf.d/`
2. Test configuration:

   ```bash
   docker compose -f docker/docker-compose.yml exec nginx nginx -t
   ```

3. Reload NGINX:

   ```bash
   docker compose -f docker/docker-compose.yml exec nginx nginx -s reload
   ```

4. Commit changes to git

### Certificate Renewal

Certbot service is included in the compose stack:

```bash
# Manual renewal
docker compose -f docker/docker-compose.yml --profile prod run --rm certbot certonly \
  --agree-tos -m admin@issuetopr.dev --no-eff-email \
  --dns-porkbun --dns-porkbun-credentials /etc/letsencrypt/secrets/porkbun.ini \
  -d issuetopr.dev -d '*.issuetopr.dev'

# Reload NGINX to pick up new certs
docker compose -f docker/docker-compose.yml exec nginx nginx -s reload
```

### Monitoring

Check NGINX logs:

```bash
docker compose -f docker/docker-compose.yml logs -f nginx
```

## Deprecating the Old Repository

Once migration is complete and verified:

1. Archive `young-and-ai-ec2-nginx` repository
2. Add README pointing to new location in `issue-to-pr`
3. Update any deployment scripts or documentation
4. Remove cron jobs or workflows referencing old repo

## Troubleshooting

### 502 Bad Gateway

- Check Next.js is running: `curl http://localhost:3000`
- Verify `host.docker.internal` resolves in container:

  ```bash
  docker compose -f docker/docker-compose.yml exec nginx ping -c 1 host.docker.internal
  ```

### Preview URLs Not Working

- Ensure `preview` network exists: `docker network ls | grep preview`
- Check container joined network: `docker network inspect preview`
- Verify network alias matches subdomain

### SSL Certificate Errors

- Check cert files exist: `ls -l /etc/letsencrypt/live/issuetopr.dev*/`
- Verify volume mount in `docker/compose/nginx.yml`
- Check file permissions (nginx user must be able to read)

## References

- **NGINX Config**: `docker/nginx/README.md`
- **Docker Overview**: `docker/README.md`
- **Preview Containers**: `shared/src/lib/utils/container.ts`
- **Original Repo**: <https://github.com/youngchingjui/young-and-ai-ec2-nginx> (archived)
