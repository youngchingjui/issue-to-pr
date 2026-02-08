#!/bin/bash
# Certificate Renewal Script
#
# This script should be run periodically (via cron) to renew SSL certificates
# and reload NGINX to pick up the new certificates.
#
# Add to crontab (runs daily at 2am):
#   0 2 * * * /path/to/issue-to-pr/docker/scripts/renew-certs.sh >> /var/log/certbot-renewal.log 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Certificate Renewal: $(date) ==="

# Change to project directory
cd "$PROJECT_ROOT"

# Attempt to renew certificates
echo "Attempting certificate renewal..."
docker compose -f docker/docker-compose.yml --profile prod run --rm certbot renew

# Check if renewal was successful by looking at exit code
if [ $? -eq 0 ]; then
    echo "Certificate renewal successful (or not needed yet)"

    # Reload NGINX to pick up any new certificates
    echo "Reloading NGINX configuration..."
    if docker compose -f docker/docker-compose.yml exec nginx nginx -s reload; then
        echo "✅ NGINX reloaded successfully"
    else
        echo "⚠️  Warning: Failed to reload NGINX"
        exit 1
    fi
else
    echo "❌ Certificate renewal failed"
    exit 1
fi

echo "=== Renewal complete ==="
