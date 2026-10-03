#!/bin/bash
set -e
echo "=== DEPLOY SCRIPT ==="
echo "Timestamp: \$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "Step 1: Git pull..."
git pull origin master
echo ""
echo "Step 2: Build backend..."
cd apps/backend && npm run build && cd ../..
echo ""
echo "Step 3: Restart services..."
pm2 restart backend
pm2 restart terminal
sleep 2
echo ""
echo "Step 4: Verify health..."
curl -s http://localhost:11110/health
echo ""
echo ""
echo "=== DEPLOY COMPLETE ==="
