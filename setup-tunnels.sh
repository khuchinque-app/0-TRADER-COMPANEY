#!/usr/bin/env bash
# ===========================================================
# setup-tunnels.sh — Create online tunnels for trading services
# ===========================================================
# Creates public URLs for:
# - Terminal web UI (port 3000)
# - Engine API (port 3001)
# - SSH access (port 2222)
# ===========================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=== Setting up online tunnels ==="

# Get public IP
PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
echo "Public IP: $PUBLIC_IP"

# --- SSH Tunnel Setup ---
echo ""
echo "[1/3] Setting up SSH tunnel..."
echo "  Connecting SSH tunnel to hookchp.com (free serveo mirror)..."

# Try hooking SSH tunnel for web services
(ssh -R 80:localhost:3000 -R 81:localhost:3001 -R 2222:localhost:2222 \
  -o StrictHostKeyChecking=no \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3 \
  hookchp.com 2>&1 &) || true

# Use localtunnel for web services (more reliable)
echo ""
echo "[2/3] Setting up web UI tunnel with localtunnel..."

# Terminal UI tunnel
nohup npx localtunnel --port 3000 --subdomain trading-terminal > "$PROJECT_DIR/tunnel-terminal.log" 2>&1 &
TUNNEL_TERM_PID=$!
echo "  Terminal tunnel PID: $TUNNEL_TERM_PID"

# Engine API tunnel
sleep 2
nohup npx localtunnel --port 3001 --subdomain trading-engine > "$PROJECT_DIR/tunnel-engine.log" 2>&1 &
TUNNEL_ENGINE_PID=$!
echo "  Engine tunnel PID: $TUNNEL_ENGINE_PID"

# Wait for tunnels to establish
echo ""
echo "[3/3] Waiting for tunnels to establish..."
sleep 8

echo ""
echo "=== Tunnel Status ==="
echo ""
echo "Terminal UI:"
grep -oE 'https://[^ ]+' "$PROJECT_DIR/tunnel-terminal.log" 2>/dev/null | head -2 || echo "  Check tunnel-terminal.log for URL"
echo ""
echo "Engine API:"
grep -oE 'https://[^ ]+' "$PROJECT_DIR/tunnel-engine.log" 2>/dev/null | head -2 || echo "  Check tunnel-engine.log for URL"
echo ""

echo "=== SSH Access ==="
echo "Local SSH: ssh $USER@127.0.0.1 -p 2222"
echo "Password: admin1"
echo ""
echo "Online SSH: ssh $USER@$PUBLIC_IP -p 2222"
echo "Password: admin1"
echo ""

echo "Logs: tunnel-terminal.log | tunnel-engine.log"
echo "Stop tunnels: kill $TUNNEL_TERM_PID $TUNNEL_ENGINE_PID"