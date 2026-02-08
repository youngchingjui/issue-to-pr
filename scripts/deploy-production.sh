#!/bin/bash
# Production Deployment Script for Issue To PR
#
# This script deploys the entire Issue To PR stack.
# Works for both fresh installations and updates.
#
# Usage:
#   ./scripts/deploy-production.sh [OPTIONS]
#
# Options:
#   --with-nginx      Deploy NGINX reverse proxy (requires ports 80/443)
#   --skip-checks     Skip pre-flight validation checks
#   --help            Show this help message
#
# Environment Variables:
#   NGINX_HTTP_PORT   HTTP port for NGINX (default: 80)
#   NGINX_HTTPS_PORT  HTTPS port for NGINX (default: 443)
#
# Examples:
#   # Fresh install with NGINX
#   ./scripts/deploy-production.sh --with-nginx
#
#   # Update existing deployment (no NGINX)
#   ./scripts/deploy-production.sh
#
#   # Use custom ports to avoid conflicts
#   NGINX_HTTP_PORT=8080 NGINX_HTTPS_PORT=8443 ./scripts/deploy-production.sh --with-nginx

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
WITH_NGINX=0
SKIP_CHECKS=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --with-nginx)
            WITH_NGINX=1
            shift
            ;;
        --skip-checks)
            SKIP_CHECKS=1
            shift
            ;;
        --help)
            head -n 30 "$0" | grep "^#" | sed 's/^# //g' | sed 's/^#//g'
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Run with --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Issue To PR - Production Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detect if this is a fresh install or update
if docker compose -f docker/docker-compose.yml ps --services | grep -q .; then
    echo "Existing deployment detected. Will update services."
    IS_FRESH_INSTALL=0
else
    echo "No existing deployment found. Performing fresh installation."
    IS_FRESH_INSTALL=1
fi
echo ""

# Pre-flight checks
if [ $SKIP_CHECKS -eq 0 ] && [ $WITH_NGINX -eq 1 ]; then
    echo -e "${GREEN}Running pre-flight checks...${NC}"
    if [ -f docker/scripts/check-nginx-prereqs.sh ]; then
        bash docker/scripts/check-nginx-prereqs.sh || {
            echo ""
            echo -e "${YELLOW}⚠️  Pre-flight checks found potential issues.${NC}"
            echo "Continue anyway? (y/N) "
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                echo "Deployment cancelled."
                exit 1
            fi
        }
    fi
    echo ""
fi


# Create required Docker networks FIRST (before any services)
echo -e "${GREEN}Setting up Docker networks...${NC}"
if ! docker network inspect preview >/dev/null 2>&1; then
    echo "Creating 'preview' network for ephemeral containers..."
    docker network create preview
    echo -e "${GREEN}✅ Preview network created${NC}"
else
    echo "Preview network already exists ✓"
fi
echo ""

# Pull latest images
echo -e "${GREEN}Pulling latest Docker images...${NC}"
docker compose -f docker/docker-compose.yml pull --quiet
echo -e "${GREEN}✅ Images updated${NC}"
echo ""

# Start core infrastructure
echo -e "${GREEN}Starting core services (Neo4j, Redis)...${NC}"
docker compose -f docker/docker-compose.yml up -d neo4j redis
echo ""

# Wait for services to be ready
echo "Waiting for services to initialize..."
for i in {1..30}; do
    if docker compose -f docker/docker-compose.yml ps | grep -q "healthy"; then
        break
    fi
    sleep 1
    echo -n "."
done
echo ""
echo -e "${GREEN}✅ Core services ready${NC}"
echo ""

# Start workers
echo -e "${GREEN}Starting workflow workers...${NC}"
docker compose -f docker/docker-compose.yml --profile prod up -d workflow-workers
echo -e "${GREEN}✅ Workers started${NC}"
echo ""

# Start NGINX if requested
if [ $WITH_NGINX -eq 1 ]; then
    echo -e "${GREEN}Starting NGINX reverse proxy...${NC}"

    # Load nginx env if it exists
    if [ -f docker/env/.env.nginx ]; then
        set -a
        source docker/env/.env.nginx
        set +a
        echo "Loaded NGINX configuration from docker/env/.env.nginx"
    fi

    docker compose -f docker/docker-compose.yml --profile prod up -d nginx

    # Wait for NGINX to be ready
    echo "Waiting for NGINX to start..."
    sleep 3

    # Validate NGINX config
    if docker compose -f docker/docker-compose.yml exec nginx nginx -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ NGINX configuration valid${NC}"
    else
        echo -e "${RED}❌ NGINX configuration error!${NC}"
        echo "Check logs: docker compose -f docker/docker-compose.yml logs nginx"
        exit 1
    fi

    # Run smoke tests
    echo "Running smoke tests..."
    SMOKE_TEST_FAILED=0

    # Test that NGINX is responding
    if docker compose -f docker/docker-compose.yml exec nginx wget --quiet --tries=1 --spider http://localhost:80/ 2>/dev/null; then
        echo "  ✓ HTTP (port 80) responding"
    else
        echo -e "  ${RED}✗ HTTP (port 80) not responding${NC}"
        SMOKE_TEST_FAILED=1
    fi

    # Test Next.js upstream (if NGINX can reach it)
    if docker compose -f docker/docker-compose.yml exec nginx wget --quiet --tries=1 --spider --timeout=2 http://host.docker.internal:3000/ 2>/dev/null; then
        echo "  ✓ Next.js upstream reachable"
    else
        echo -e "  ${YELLOW}⚠ Next.js upstream not reachable (is Next.js running on host:3000?)${NC}"
        echo "  NGINX will serve 502 errors until Next.js is started"
    fi

    if [ $SMOKE_TEST_FAILED -eq 1 ]; then
        echo -e "${RED}❌ Smoke tests failed${NC}"
        echo "Check logs: docker compose -f docker/docker-compose.yml logs nginx"
        exit 1
    fi

    echo -e "${GREEN}✅ NGINX started and smoke tests passed${NC}"
    echo ""
fi

# Show deployment status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Running services:"
docker compose -f docker/docker-compose.yml ps
echo ""

# Next steps guidance
echo -e "${BLUE}Next Steps:${NC}"
echo ""

if [ $IS_FRESH_INSTALL -eq 1 ]; then
    echo "📝 Fresh Installation Checklist:"
    echo ""
    echo "1. Configure environment variables:"
    echo "   cp docker/env/.env.worker.example docker/env/.env.worker"
    echo "   # Edit docker/env/.env.worker with your API keys"
    echo ""
    echo "2. Configure Neo4j credentials:"
    echo "   cp docker/env/.env.neo4j.example docker/env/.env.neo4j"
    echo "   # Set NEO4J_USER and NEO4J_PASSWORD"
    echo ""
    if [ $WITH_NGINX -eq 1 ]; then
        echo "3. Set up SSL certificates (for HTTPS):"
        echo "   # Add Porkbun credentials to /etc/letsencrypt/secrets/porkbun.ini"
        echo "   docker compose -f docker/docker-compose.yml --profile prod run --rm certbot certonly \\"
        echo "     --dns-porkbun -d yourdomain.com -d '*.yourdomain.com'"
        echo ""
        echo "4. Update NGINX configs in docker/nginx/conf.d/ with your domain"
        echo ""
    fi
else
    echo "📝 Update Complete:"
    echo ""
    echo "1. Check service health:"
    echo "   docker compose -f docker/docker-compose.yml ps"
    echo ""
    echo "2. View logs:"
    echo "   docker compose -f docker/docker-compose.yml logs -f [service-name]"
    echo ""
fi

if [ $WITH_NGINX -eq 0 ]; then
    echo "💡 Tip: You deployed without NGINX. Access services at:"
    echo "   - Next.js: http://localhost:3000"
    echo "   - Neo4j Browser: http://localhost:7474"
    echo "   - Redis: localhost:6379"
    echo ""
    echo "   To deploy with NGINX reverse proxy:"
    echo "   ./scripts/deploy-production.sh --with-nginx"
fi

echo ""
echo "📖 Documentation: docker/README.md"
echo "🐛 Issues: https://github.com/youngchingjui/issue-to-pr/issues"
echo ""
