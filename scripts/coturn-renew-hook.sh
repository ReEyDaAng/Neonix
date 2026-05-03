#!/usr/bin/env bash
# Post-renewal hook for Let's Encrypt certificates used by coturn / LiveKit.
# Add this script as a deploy-hook for certbot:
#   sudo certbot renew --deploy-hook /home/neonix/apps/neonix/scripts/coturn-renew-hook.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# Restart coturn (and LiveKit Nginx site) to pick up renewed certs.
docker compose -f docker-compose.prod.yml restart coturn
docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload || true

echo "[$(date -Is)] coturn restarted after certificate renewal"
