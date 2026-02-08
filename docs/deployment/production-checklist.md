# Production Hardening Checklist

This checklist covers essential production readiness tasks that should be completed **before** deploying Issue To PR to a production environment. These items were identified during code review and represent real operational risks.

## 🔴 Critical (Must Complete Before Production)

### 1. SSL Certificate Auto-Renewal

**Issue**: Certificates expire every 90 days. Without automation, your site will show certificate warnings.

**Impact on Users**: Site appears broken, browsers show security warnings, users can't access the application.

**Solution**:
```bash
# Add to crontab (runs daily at 2am)
crontab -e

# Add this line:
0 2 * * * /path/to/issue-to-pr/docker/scripts/renew-certs.sh >> /var/log/certbot-renewal.log 2>&1
```

**Test it**:
```bash
# Dry run to verify renewal works
docker compose -f docker/docker-compose.yml --profile prod run --rm certbot renew --dry-run

# Run the renewal script manually
bash docker/scripts/renew-certs.sh
```

**Status**: ⬜ Not Set Up

---

### 2. Log Rotation

**Issue**: NGINX logs grow indefinitely. Without rotation, disk fills up and causes service failures.

**Impact on Users**: Site goes down when disk reaches 100%. May lose access to other services on the same server.

**Solution**:

Add to Docker Compose (`docker/compose/nginx.yml`):
```yaml
services:
  nginx:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Or set up logrotate on host:
```bash
sudo tee /etc/logrotate.d/docker-nginx <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF
```

**Status**: ⬜ Not Set Up

---

### 3. Monitoring & Alerting

**Issue**: Deployment can succeed but serve errors. Without monitoring, you won't know the site is down.

**Impact on Users**: Site is down but you don't know until users complain. Poor user experience, lost trust.

**What to Monitor**:
- [ ] NGINX container health status
- [ ] HTTP response codes (track 5xx errors)
- [ ] SSL certificate expiration dates
- [ ] Disk space usage
- [ ] Container restart count

**Recommended Tools**:
- **Uptime monitoring**: UptimeRobot, Pingdom, or StatusCake (free tiers available)
- **Log aggregation**: Grafana Loki, ELK stack, or Papertrail
- **Metrics**: Prometheus + Grafana (included in your stack!)

**Minimum Setup** (using free services):
```bash
# 1. Sign up for UptimeRobot (free)
# 2. Add monitors for:
#    - https://yourdomain.com (check every 5 minutes)
#    - https://grafana.yourdomain.com (if using Grafana)

# 3. Set up email/Slack alerts
```

**Status**: ⬜ Not Set Up

---

### 4. Backup Strategy

**Issue**: Configuration changes can break the site. Without backups, recovery is manual and error-prone.

**Impact on Users**: Extended downtime during recovery. Potential data loss.

**What to Backup**:
- [ ] NGINX configuration files (`docker/nginx/`)
- [ ] Environment variables (`docker/env/`)
- [ ] Neo4j database
- [ ] SSL certificates (optional, can be regenerated)

**Solution**:
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/issue-to-pr/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup configs
tar -czf "$BACKUP_DIR/configs.tar.gz" docker/nginx/ docker/env/

# Backup Neo4j (requires neo4j-admin)
docker compose -f docker/docker-compose.yml exec neo4j neo4j-admin database dump neo4j \
  --to-path=/backups

# Keep last 7 days of backups
find /backups/issue-to-pr -type d -mtime +7 -exec rm -rf {} +
```

**Status**: ⬜ Not Set Up

---

## 🟡 Important (Should Complete Soon)

### 5. Graceful NGINX Reloads

**Issue**: Deployment script recreates NGINX container, dropping active connections.

**Impact on Users**: WebSocket/SSE connections disconnect. Brief service interruption during deployments.

**Current Behavior**:
```bash
docker compose up -d nginx  # Recreates container
```

**Better Approach**:
```bash
# For config changes only:
docker compose exec nginx nginx -s reload  # No downtime

# Update deployment script to detect if only config changed
```

**Workaround**: For now, deploy during low-traffic hours (2-4am).

**Status**: ⬜ Needs Implementation

---

### 6. Preview URL DNS Cache Optimization

**Issue**: 5-second DNS cache can cause 502 errors on newly created preview containers.

**Impact on Users**: "Preview not ready" errors for 5 seconds after container creation. Confusing UX.

**Solution**: Reduce DNS cache time in `docker/nginx/conf.d/preview.issuetopr.dev.conf`:

```nginx
# Change from:
resolver 127.0.0.11 ipv6=off valid=5s;

# To:
resolver 127.0.0.11 ipv6=off valid=1s;
```

**Trade-off**: More DNS lookups, but better UX for preview deployments.

**Status**: ⬜ Not Applied

---

### 7. Rate Limiting & DDoS Protection

**Issue**: No rate limiting configured. Open to abuse and DDoS attacks.

**Impact on Users**: Site can be overwhelmed by traffic (malicious or accidental). Legitimate users can't access the site.

**Solution**: Add to NGINX config:

```nginx
# In nginx.conf, add to http block:
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

# In server blocks:
location / {
    limit_req zone=general burst=20 nodelay;
    # ... rest of config
}

location /api/ {
    limit_req zone=api burst=50 nodelay;
    # ... rest of config
}
```

**Recommended**: Also use Cloudflare (free tier) for DDoS protection.

**Status**: ⬜ Not Configured

---

### 8. Security Headers

**Issue**: Missing security headers make site vulnerable to XSS, clickjacking, and other attacks.

**Impact on Users**: Increased vulnerability to attacks. Failed security audits.

**Solution**: Add to NGINX server blocks:

```nginx
# Add to all server blocks in conf.d/*.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

**Test with**: [Mozilla Observatory](https://observatory.mozilla.org/)

**Status**: ⬜ Not Configured

---

## 🟢 Nice to Have (Future Improvements)

### 9. Blue/Green Deployments

**Current**: Container recreate causes brief downtime
**Future**: Run two NGINX instances, switch traffic seamlessly

**Status**: 📋 Planned Enhancement

---

### 10. Automated Rollback

**Current**: Manual rollback via git checkout and redeploy
**Future**: Automatic rollback on failed smoke tests

**Status**: 📋 Planned Enhancement

---

### 11. Performance Tuning

**Items to Consider**:
- [ ] NGINX worker processes (currently `auto`)
- [ ] Connection limits and timeouts
- [ ] Gzip compression settings
- [ ] HTTP/2 optimization
- [ ] CDN integration (Cloudflare, Fastly)

**Status**: 📋 Performance Baseline Needed

---

## Verification Checklist

Before going to production, verify these items:

**Infrastructure**:
- [ ] SSL certificates installed and valid
- [ ] DNS records pointing to server
- [ ] Firewall rules allowing ports 80/443
- [ ] Docker networks created (`preview` network)

**Configuration**:
- [ ] NGINX configs updated with your domain
- [ ] Environment variables set (`.env.worker`, `.env.neo4j`)
- [ ] GitHub App credentials configured

**Operations**:
- [ ] Monitoring set up and tested
- [ ] Alerts configured (email/Slack)
- [ ] Backups running automatically
- [ ] Log rotation configured
- [ ] Certificate renewal automated

**Testing**:
- [ ] Smoke tests pass (main domain responds)
- [ ] Preview URLs work (create test container)
- [ ] SSL is valid (no browser warnings)
- [ ] Logs are being written and rotated
- [ ] Monitoring alerts trigger correctly

**Documentation**:
- [ ] Team knows where logs are
- [ ] Team knows how to check service health
- [ ] Runbook created for common issues
- [ ] Contact information for emergency response

---

## Emergency Runbook

Quick reference for common production issues:

### Site is Down (502 Bad Gateway)

```bash
# 1. Check if Next.js is running
curl http://localhost:3000

# 2. Check NGINX logs
docker compose -f docker/docker-compose.yml logs nginx | tail -50

# 3. Check NGINX is running
docker compose -f docker/docker-compose.yml ps nginx

# 4. Check upstream connectivity from NGINX
docker compose -f docker/docker-compose.yml exec nginx wget -O- http://host.docker.internal:3000
```

### SSL Certificate Expired

```bash
# 1. Check expiration
docker compose -f docker/docker-compose.yml exec nginx openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -dates

# 2. Renew immediately
docker compose -f docker/docker-compose.yml --profile prod run --rm certbot renew --force-renewal

# 3. Reload NGINX
docker compose -f docker/docker-compose.yml exec nginx nginx -s reload
```

### Preview URL Not Working

```bash
# 1. Check container exists
docker ps | grep preview-container-name

# 2. Check container is on preview network
docker network inspect preview

# 3. Check NGINX can resolve container
docker compose -f docker/docker-compose.yml exec nginx nslookup preview-container-name
```

### Disk Full

```bash
# 1. Check disk usage
df -h

# 2. Check Docker disk usage
docker system df

# 3. Clean up old images and logs
docker system prune -a
docker volume prune

# 4. Check log sizes
du -sh /var/lib/docker/containers/*/*-json.log | sort -h
```

---

## Getting Help

If you're stuck on any of these items:

1. **Check existing docs**: `docs/deployment/README.md`, `docker/nginx/README.md`
2. **Search issues**: https://github.com/youngchingjui/issue-to-pr/issues
3. **Create an issue**: Describe what you're trying to set up and what's not working
4. **Community**: Join discussions for deployment questions

---

**Last Updated**: 2026-02-08
**Review Date**: Before each production deployment
