#!/usr/bin/env bash
set -euo pipefail
# Deploy/build script for autopilot tasks
# Runs in repo root before verification

cd "$(dirname "$0")/../.."

echo "[deploy] Building terminal..."
npm run build --workspace=apps/terminal 2>&1 | tail -20

echo "[deploy] Restarting terminal PM2..."
pm2 restart terminal 2>&1 || pm2 start npm --name terminal --run start --cwd apps/terminal 2>&1

echo "[deploy] Done"