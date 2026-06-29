#!/bin/bash
set -e
cd /opt/erp-legal
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --force-recreate backend frontend --build
docker compose exec backend alembic upgrade head
echo "=== DEPLOY COMPLETO ==="
