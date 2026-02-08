#!/bin/bash
# Pre-flight checks for NGINX deployment
# Checks for port conflicts, required networks, and SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Checking NGINX deployment prerequisites..."
echo ""

# Track if there are any warnings
HAS_WARNINGS=0

# 1. Check for port conflicts
echo "1️⃣  Checking port availability..."
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  WARNING: Port 80 is already in use${NC}"
    echo "   Process using port 80:"
    lsof -Pi :80 -sTCP:LISTEN | head -2
    echo ""
    echo "   Solutions:"
    echo "   - Stop the conflicting process (e.g., old nginx)"
    echo "   - Use a different port: export NGINX_HTTP_PORT=8080"
    echo ""
    HAS_WARNINGS=1
else
    echo -e "${GREEN}✅ Port 80 is available${NC}"
fi

if lsof -Pi :443 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  WARNING: Port 443 is already in use${NC}"
    echo "   Process using port 443:"
    lsof -Pi :443 -sTCP:LISTEN | head -2
    echo ""
    echo "   Solutions:"
    echo "   - Stop the conflicting process (e.g., old nginx)"
    echo "   - Use a different port: export NGINX_HTTPS_PORT=8443"
    echo ""
    HAS_WARNINGS=1
else
    echo -e "${GREEN}✅ Port 443 is available${NC}"
fi

# 2. Check for Docker networks
echo ""
echo "2️⃣  Checking Docker networks..."
if docker network inspect preview >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 'preview' network exists${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: 'preview' network does not exist${NC}"
    echo "   Create it with: docker network create preview"
    echo ""
    HAS_WARNINGS=1
fi

# 3. Check for SSL certificates (production only)
echo ""
echo "3️⃣  Checking SSL certificates..."
if [ -d "/etc/letsencrypt/live/issuetopr.dev" ]; then
    echo -e "${GREEN}✅ Main SSL certificate found (/etc/letsencrypt/live/issuetopr.dev)${NC}"
else
    echo -e "${YELLOW}⚠️  INFO: Main SSL certificate not found${NC}"
    echo "   This is normal for first-time setup or local dev"
    echo "   For production: Run certbot to obtain certificates"
    echo ""
fi

if [ -d "/etc/letsencrypt/live/issuetopr.dev-0001" ]; then
    echo -e "${GREEN}✅ Wildcard SSL certificate found (/etc/letsencrypt/live/issuetopr.dev-0001)${NC}"
else
    echo -e "${YELLOW}⚠️  INFO: Wildcard SSL certificate not found${NC}"
    echo "   This is normal for first-time setup or local dev"
    echo "   For preview URLs: Obtain wildcard cert with certbot"
    echo ""
fi

# 4. Check NGINX config syntax (if docker is available)
echo ""
echo "4️⃣  Testing NGINX configuration syntax..."
if docker run --rm -v "$(pwd)/docker/nginx:/etc/nginx:ro" nginx:stable-alpine nginx -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ NGINX configuration syntax is valid${NC}"
else
    echo -e "${RED}❌ ERROR: NGINX configuration syntax is invalid${NC}"
    echo "   Run this to see details:"
    echo "   docker run --rm -v \$(pwd)/docker/nginx:/etc/nginx:ro nginx:stable-alpine nginx -t"
    echo ""
    exit 1
fi

# 5. Check if another nginx container is running
echo ""
echo "5️⃣  Checking for existing NGINX containers..."
OLD_NGINX=$(docker ps --filter "name=nginx" --format "{{.Names}}" | grep -v "^$" || true)
if [ -n "$OLD_NGINX" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Found running NGINX container(s):${NC}"
    echo "   $OLD_NGINX"
    echo ""
    echo "   If this is from the old 'young-and-ai-ec2-nginx' repo, you may want to:"
    echo "   - Stop it: docker stop $OLD_NGINX"
    echo "   - Remove it: docker rm $OLD_NGINX"
    echo ""
    HAS_WARNINGS=1
else
    echo -e "${GREEN}✅ No conflicting NGINX containers found${NC}"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $HAS_WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo "   You can start NGINX with:"
    echo "   docker compose -f docker/docker-compose.yml --profile prod up -d nginx"
else
    echo -e "${YELLOW}⚠️  Some warnings were found${NC}"
    echo "   Review the warnings above before proceeding."
    echo "   NGINX may still work, but you should resolve conflicts first."
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
