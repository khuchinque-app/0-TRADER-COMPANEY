#!/usr/bin/env bash
# ============================================================
# TRADING COMPANEY - Automated Startup Script (Linux / WSL)
# ============================================================
# Usage:  ./start.sh          # boot engine :3001 + terminal :3000
#         TAIL=1 ./start.sh   # same, then tail logs (Ctrl+C stops tail only)
# Windows equivalent: start.bat
# Run from anywhere — script cd's to repo ROOT (npm workspaces requirement).
# ============================================================
set -u

# --- Locate repo ROOT (this script lives at ROOT) ---------------------------
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_PORT=3001
TERMINAL_PORT=3000
LOG_FILE="$PROJECT_DIR/server.log"
TERMINAL_LOG="$PROJECT_DIR/terminal.log"

echo "=== Trading Company Auto-Start (linux) ==="
echo "Project: $PROJECT_DIR"
echo ""

# --- [1/5] Free ports 3000/3001 (kills stale listeners) ---------------------
kill_port() {
  local port="$1"
  # ss is in iproute2 (present on Ubuntu); extract pids of LISTEN sockets
  local pids
  pids=$(ss -tlnp 2>/dev/null | grep -E "[:.]${port}\b" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)
  if [ -n "$pids" ]; then
    for pid in $pids; do
      echo "  Killing stale listener on :$port (PID $pid)"
      kill -9 "$pid" 2>/dev/null
    done
  fi
}

echo "[1/5] Cleaning up old processes..."
kill_port "$ENGINE_PORT"
kill_port "$TERMINAL_PORT"
sleep 1

# --- [2/5] Dependencies (workspace-aware install from ROOT) -----------------
echo "[2/5] Checking dependencies..."
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  echo "  Installing workspace dependencies from ROOT..."
  (cd "$PROJECT_DIR" && npm install --no-audit --no-fund) || { echo "  npm install FAILED"; exit 1; }
fi

# Terminal + engine import @trading/shared from its dist/ — rebuild it so a
# fresh clone or a shared-source change never boots a stale/missing package.
echo "  Building @trading/shared..."
(cd "$PROJECT_DIR/packages/shared" && npm run build) || { echo "  shared build FAILED"; exit 1; }

# --- [3/5] Start engine ------------------------------------------------------
echo "[3/5] Starting engine on :$ENGINE_PORT ..."
cd "$PROJECT_DIR"
nohup npm run dev:engine > "$LOG_FILE" 2>&1 &
ENGINE_PID=$!
echo "  Engine launcher PID: $ENGINE_PID (log: $LOG_FILE)"

# --- [4/5] Verify engine health ---------------------------------------------
echo "[4/5] Waiting for engine /health ..."
ENGINE_OK=0
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${ENGINE_PORT}/health" >/dev/null 2>&1; then
    ENGINE_OK=1; break
  fi
  sleep 1
done
if [ "$ENGINE_OK" = "1" ]; then
  echo "  [OK] Engine healthy on http://127.0.0.1:$ENGINE_PORT"
else
  echo "  [FAIL] Engine did not become healthy. Tail of $LOG_FILE:"
  tail -20 "$LOG_FILE"
  exit 1
fi

# --- [5/5] Start terminal + verify ------------------------------------------
echo "[5/5] Starting terminal on :$TERMINAL_PORT ..."
nohup npm run dev:terminal > "$TERMINAL_LOG" 2>&1 &
TERMINAL_PID=$!
echo "  Terminal launcher PID: $TERMINAL_PID (log: $TERMINAL_LOG)"

# Cold compile can take ~20s; allow up to 60s
TERM_OK=0
for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${TERMINAL_PORT}" 2>/dev/null)
  if [ "$code" = "200" ]; then TERM_OK=1; break; fi
  sleep 1
done
if [ "$TERM_OK" = "1" ]; then
  echo "  [OK] Terminal serving HTTP 200 on http://127.0.0.1:$TERMINAL_PORT"
else
  echo "  [FAIL] Terminal did not serve 200. Tail of $TERMINAL_LOG:"
  tail -20 "$TERMINAL_LOG"
  exit 1
fi

echo ""
echo "=== SUCCESS ==="
echo "Engine:   http://127.0.0.1:$ENGINE_PORT  (GET /health, /api/market/BTCUSDT, /api/ledger/<userId>, /api/fx)"
echo "Terminal: http://127.0.0.1:$TERMINAL_PORT"
echo "Logs:     $LOG_FILE | $TERMINAL_LOG"
echo ""
echo "Public URL (optional):  bash tools/bore-tunnel.sh   # terminal -> bore.pub:NNNN"
echo "Stop:                   ./stop.sh"
echo ""

if [ "${TAIL:-0}" = "1" ]; then
  echo "Tailing logs (Ctrl+C to stop tailing; servers keep running)..."
  tail -f "$LOG_FILE" "$TERMINAL_LOG"
fi
