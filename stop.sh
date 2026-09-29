#!/usr/bin/env bash
# ============================================================
# TRADING COMPANEY - Stop Script (Linux / WSL)
# ============================================================
# Stops the engine (:3001) and terminal (:3000) started by start.sh.
# Usage: ./stop.sh
# ============================================================
set -u

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_PORT=3001
TERMINAL_PORT=3000

kill_port() {
  local port="$1" name="$2"
  local pids
  pids=$(ss -tlnp 2>/dev/null | grep -E "[:.]${port}\b" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)
  if [ -n "$pids" ]; then
    for pid in $pids; do
      echo "Stopping $name (PID $pid on :$port)"
      kill "$pid" 2>/dev/null
    done
  else
    echo "$name not running (nothing listening on :$port)"
  fi
}

kill_port "$TERMINAL_PORT" "Terminal"
kill_port "$ENGINE_PORT" "Engine"
sleep 1

# Confirm ports are actually free; escalate to -9 if a process refused SIGTERM
for entry in "$ENGINE_PORT:Engine" "$TERMINAL_PORT:Terminal"; do
  port="${entry%%:*}"; name="${entry##*:}"
  if ss -tln 2>/dev/null | grep -qE "[:.]${port}\b"; then
    echo "$name still holding :$port — sending SIGKILL"
    for pid in $(ss -tlnp 2>/dev/null | grep -E "[:.]${port}\b" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u); do
      kill -9 "$pid" 2>/dev/null
    done
  fi
done

echo "Done. Ports $ENGINE_PORT and $TERMINAL_PORT are free."
