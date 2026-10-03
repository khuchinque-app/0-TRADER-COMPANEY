#!/bin/bash
set -e

SHA=${1:-HEAD}

echo "=== DEPLOY SCRIPT ==="
echo "Commit: $SHA"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Pull latest code
echo "[1/4] Pulling latest code..."
git pull origin master

# Build backend
echo "[2/4] Building backend..."
cd apps/backend && npm run build && cd ../..

# Restart services
echo "[3/4] Restarting services..."
pm2 restart backend
pm2 restart terminal
pm2 save

# Run smoke test
echo "[4/4] Running smoke test..."
bash scripts/smoke.sh

echo ""
echo "=== DEPLOY COMPLETE ==="
