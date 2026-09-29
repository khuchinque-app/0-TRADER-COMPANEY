#!/usr/bin/env bash
# ============================================================
# TRADING COMPANEY - One-paste verification + boot + tunnel
# ============================================================
# Buffy (agent) has NO terminal access this session; the user pastes ONE
# command in WSL and this script runs the whole pipeline, teeing ALL output
# to PLANNING/verify-out.txt which the agent reads back via the WSL share.
#
# Usage (from anywhere):
#   bash /home/chinque/projects/TRADING-COMPANEY/tools/verify-pipeline.sh          # verify + boot
#   TUNNEL=1 bash /home/chinque/projects/TRADING-COMPANEY/tools/verify-pipeline.sh # also start bore tunnel (keeps running)
#
# Output: PLANNING/verify-out.txt  (agent reads this)
# ============================================================
set -u

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$PROJECT_DIR/PLANNING/verify-out.txt"
ENGINE_PORT=3001
TERMINAL_PORT=3000

exec > >(tee -a "$LOG") 2>&1
echo ""
echo "############################################################"
echo "# verify-pipeline run @ $(date -Is)  by ${USER:-unknown}"
echo "############################################################"

echo ""
echo "===== [STAGE 1/6] git status snapshot ====="
cd "$PROJECT_DIR"
git status --porcelain=v1 | head -40
echo "--- branch / HEAD ---"
git rev-parse --abbrev-ref HEAD 2>/dev/null
git rev-parse --short HEAD 2>/dev/null

echo ""
echo "===== [STAGE 2/6] typecheck (all workspaces) ====="
if npm run typecheck; then
  echo "TYPECHECK: PASS"
else
  echo "TYPECHECK: FAIL"
fi

echo ""
echo "===== [STAGE 2b/6] npm install sanity (idempotent; validates manifest+lock incl. optional platform deps) ====="
if npm install --no-audit --no-fund; then
  echo "NPM INSTALL: PASS"
else
  echo "NPM INSTALL: FAIL"
fi

echo ""
echo "===== [STAGE 3/6] engine tests (vitest run) ====="
if (cd apps/engine && npx vitest run); then
  echo "VITEST: PASS"
else
  echo "VITEST: FAIL"
fi

echo ""
echo "===== [STAGE 4/6] boot servers via start.sh ====="
bash "$PROJECT_DIR/start.sh"
BOOT_RC=$?
echo "start.sh exit code: $BOOT_RC"

echo ""
echo "===== [STAGE 5/6] endpoint probes ====="
echo "--- GET /health (engine) ---"
curl -s -m 5 "http://127.0.0.1:${ENGINE_PORT}/health" || echo "(no response)"
echo ""
echo "--- GET /api/tickers (first 300 chars) ---"
curl -s -m 5 "http://127.0.0.1:${ENGINE_PORT}/api/tickers" | head -c 300 || echo "(no response)"
echo ""
echo "--- GET /api/ledger/guest1 (totalValueUsdt sanity) ---"
curl -s -m 5 "http://127.0.0.1:${ENGINE_PORT}/api/ledger/guest1" | head -c 500 || echo "(no response)"
echo ""
echo "--- GET / (terminal HTTP status) ---"
curl -s -o /dev/null -w 'terminal HTTP %{http_code}\n' -m 15 "http://127.0.0.1:${TERMINAL_PORT}" || echo "(no response)"

echo ""
echo "===== [STAGE 6/6] public tunnel (optional) ====="
if [ "${TUNNEL:-0}" = "cloudflared" ]; then
  echo "Starting cloudflared quick tunnel (no sudo) — public URL appears below:"
  bash "$PROJECT_DIR/tools/cloudflared-tunnel.sh"
elif [ "${TUNNEL:-0}" = "1" ]; then
  echo "Installing bore into project tools/bin (idempotent)..."
  bash "$PROJECT_DIR/tools/bore-install.sh" || echo "BORE INSTALL FAILED (offline?)"
  echo "Starting tunnel for terminal :${TERMINAL_PORT} — public address appears below:"
  bash "$PROJECT_DIR/tools/bore-tunnel.sh"
else
  echo "TUNNEL not set — skipping. Options:"
  echo "  TUNNEL=1           -> bore via bore.pub   (binary auto-installed or PLANNING/bore)"
  echo "  TUNNEL=cloudflared -> cloudflared quick tunnel (uses PLANNING/cloudflared.deb, no sudo)"
fi

echo ""
echo "===== STAGE RESULTS ====="
echo "See TYPECHECK / VITEST / start.sh / probe lines above."
echo "Log saved: $LOG"
if [ "${TUNNEL:-0}" != "0" ]; then
  echo "Tunnel is running in this terminal. Ctrl+C stops the tunnel (servers keep running)."
else
  echo "Servers keep running. Stop them with: bash $PROJECT_DIR/stop.sh"
fi
