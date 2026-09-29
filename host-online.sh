#!/usr/bin/env bash
# ===========================================================
# host-online.sh — Online host for TRADING-COMPANEY
# ===========================================================
# Starts SSH server + trading app and optionally sets up tunnels
#
# Usage:
#   bash host-online.sh                 # Start everything + tunnels
#   bash host-online.sh --no-tunnel     # Start everything, no online tunnels
#   bash host-online.sh --stop          # Stop all services
# ===========================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

SSH_PORT=2222
ENGINE_PORT=3001
TERMINAL_PORT=3000
NO_TUNNEL=false
ACTION="start"

# Parse arguments
for arg in "$@"; do
  case $arg in
    --no-tunnel) NO_TUNNEL=true ;;
    --stop) ACTION="stop" ;;
  esac
done

# --- Stop action ---
if [ "$ACTION" = "stop" ]; then
  echo "=== Stopping services ==="
  pkill -f "python3.*lightweight-ssh-server" 2>/dev/null || true
  pkill -f "sshd.*2222" 2>/dev/null || true
  pkill -f "dev:engine" 2>/dev/null || true
  pkill -f "dev:terminal" 2>/dev/null || true
  pkill -f "localtunnel" 2>/dev/null || true
  pkill -f "cloudflared" 2>/dev/null || true
  pkill -f "serveo" 2>/dev/null || true
  echo "All services stopped."
  exit 0
fi

echo "=== Trading Company Online Host ==="
echo "SSH: port $SSH_PORT (public key auth)"
echo "Engine: port $ENGINE_PORT"
echo "Terminal: port $TERMINAL_PORT"
echo ""

# --- [1/5] Check dependencies ---
echo "[1/5] Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "  Installing workspace dependencies..."
  npm install --no-audit --no-fund
fi

echo "  Building @trading/shared..."
(cd packages/shared && npm run build)

# --- [2/5] Kill stale processes ---
echo "[2/5] Cleaning up old processes..."
kill_port() {
  local port="$1"
  local pids
  pids=$(ss -tlnp 2>/dev/null | grep -E "[:.]${port}\b" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)
  if [ -n "$pids" ]; then
    for pid in $pids; do
      echo "  Killing process on :$port (PID $pid)"
      kill -9 "$pid" 2>/dev/null || true
    done
  fi
}

kill_port "$SSH_PORT"
kill_port "$ENGINE_PORT"
kill_port "$TERMINAL_PORT"
sleep 1

# --- [3/5] Start SSH server (Python lightweight server with dual auth) ---
echo "[3/5] Starting SSH server on port $SSH_PORT..."

# Ensure SSH directory and authorized_keys exist
mkdir -p ~/.ssh
touch ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Ensure host key exists for Python SSH server
HOST_KEY_DIR="/home/chinque/.ssh"
if [ ! -f "$HOST_KEY_DIR/ssh_host_ed25519_key" ]; then
  ssh-keygen -t ed25519 -f "$HOST_KEY_DIR/ssh_host_ed25519_key" -N "" -q || true
  chmod 600 "$HOST_KEY_DIR/ssh_host_ed25519_key"
fi

# Kill any old sshd on port 2222
pkill -f "sshd.*2222" 2>/dev/null || true
sleep 1

# Start Python SSH server (handles password + public key auth without root)
nohup python3 "$PROJECT_DIR/lightweight-ssh-server.py" > "$PROJECT_DIR/ssh-server.log" 2>&1 &
SSH_PID=$!
echo "  Python SSH server started (PID: $SSH_PID) on port $SSH_PORT"
echo "  Username: chinque"
echo "  Password: admin1"
echo "  Authentication: Password (admin1) + Public key (~/.ssh/authorized_keys)"
echo "  Connect: ssh chinque@<your-ip> -p $SSH_PORT"

# --- [4/5] Start trading app ---
echo ""
echo "[4/5] Starting trading app..."

# Start engine
echo "  Starting engine on :$ENGINE_PORT..."
nohup npm run dev:engine > "$PROJECT_DIR/server.log" 2>&1 &
ENGINE_PID=$!
echo "  Engine started (PID: $ENGINE_PID)"

# Wait for engine to be healthy
echo "  Waiting for engine health check..."
ENGINE_OK=0
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$ENGINE_PORT/health" >/dev/null 2>&1; then
    ENGINE_OK=1
    break
  fi
  sleep 2
done

if [ "$ENGINE_OK" = "1" ]; then
  echo "  [OK] Engine healthy on http://127.0.0.1:$ENGINE_PORT"
else
  echo "  [WARN] Engine may not be ready yet. Check server.log"
fi

# Start terminal
echo "  Starting terminal on :$TERMINAL_PORT..."
nohup npm run dev:terminal > "$PROJECT_DIR/terminal.log" 2>&1 &
TERMINAL_PID=$!
echo "  Terminal started (PID: $TERMINAL_PID)"

# Wait for terminal
echo "  Waiting for terminal..."
TERM_OK=0
for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$TERMINAL_PORT" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    TERM_OK=1
    break
  fi
  sleep 2
done

if [ "$TERM_OK" = "1" ]; then
  echo "  [OK] Terminal serving HTTP 200 on http://127.0.0.1:$TERMINAL_PORT"
else
  echo "  [WARN] Terminal may still be starting. Check terminal.log"
fi

# --- [5/5] Set up online tunnels (optional) ---
if [ "$NO_TUNNEL" = "false" ]; then
  echo ""
  echo "[5/5] Setting up online tunnels..."

  # Get public IP
  PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
  echo "  Public IP: $PUBLIC_IP"

  # Try cloudflared tunnel (best option) if available
  if [ -x "$PROJECT_DIR/tools/cloudflared" ]; then
    echo "  Using cloudflared for tunneling..."
    nohup "$PROJECT_DIR/tools/cloudflared" tunnel --hostname trading-terminal.example.com --url "http://localhost:$TERMINAL_PORT" > "$PROJECT_DIR/cloudflared-terminal.log" 2>&1 &
    echo "  Cloudflared tunnel started for terminal"
    nohup "$PROJECT_DIR/tools/cloudflared" tunnel --hostname trading-engine.example.com --url "http://localhost:$ENGINE_PORT" > "$PROJECT_DIR/cloudflared-engine.log" 2>&1 &
    echo "  Cloudflared tunnel started for engine"
  elif command -v cloudflared &>/dev/null; then
    echo "  Using cloudflared (global install)..."
    nohup cloudflared tunnel --url "http://localhost:$TERMINAL_PORT" > "$PROJECT_DIR/cloudflared-terminal.log" 2>&1 &
    echo "  Cloudflared URL for terminal:"
    sleep 3
    grep -oE 'https://[^ ]+' "$PROJECT_DIR/cloudflared-terminal.log" 2>/dev/null | head -3
    nohup cloudflared tunnel --url "http://localhost:$ENGINE_PORT" > "$PROJECT_DIR/cloudflared-engine.log" 2>&1 &
    echo "  Cloudflared URL for engine:"
    sleep 3
    grep -oE 'https://[^ ]+' "$PROJECT_DIR/cloudflared-engine.log" 2>/dev/null | head -3
  else
    # Try serveo (now hookchp) as fallback
    echo "  Trying SSH reverse tunnel to hookchp.com (serveo)..."
    nohup ssh -R 3000:localhost:3000 -R 3001:localhost:3001 -o StrictHostKeyChecking=no -o ServerAliveInterval=60 hookchp.com sleep 9999 > "$PROJECT_DIR/serveo.log" 2>&1 &
    echo "  SSH reverse tunnel started to hookchp.com"
    sleep 5
    cat "$PROJECT_DIR/serveo.log" 2>/dev/null | grep -oE 'https://[^ ]+' | head -3 || true
  fi

  echo ""
  echo "  Tunnel logs: cloudflared-*.log, serveo.log"
else
  echo ""
  echo "[5/5] Skipping tunnels (--no-tunnel flag)"
fi

echo ""
echo "=== SUMMARY ==="
echo "SSH:       ssh chinque@<your-ip> -p $SSH_PORT  (password: admin1 OR public key)"
echo "Engine:    http://127.0.0.1:$ENGINE_PORT  (GET /health)"
echo "Terminal:  http://127.0.0.1:$TERMINAL_PORT"
echo ""
echo "Logs: server.log | terminal.log | ssh-server.log | cloudflared-*.log"
echo "Stop with: bash host-online.sh --stop"