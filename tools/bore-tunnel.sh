#!/usr/bin/env bash
# bore-tunnel.sh — expose the local terminal UI through bore.pub.
# Usage: PORT=3000 bash tools/bore-tunnel.sh
# The public address (bore.pub:NNNN) is printed by bore when it starts.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"
SERVER="${BORE_SERVER:-bore.pub}"

# Resolution order: project-installed binary, then a manually-placed one
# (e.g. user downloaded bore straight into PLANNING/).
if   [ -x "$PROJECT_ROOT/tools/bin/bore" ]; then BORE="$PROJECT_ROOT/tools/bin/bore"
elif [ -x "$PROJECT_ROOT/PLANNING/bore" ];      then BORE="$PROJECT_ROOT/PLANNING/bore"
else
  echo "[bore] not found. Run: bash tools/bore-install.sh  (or place the bore binary in PLANNING/)" >&2
  exit 1
fi

echo "[bore] tunneling 127.0.0.1:${PORT} -> ${SERVER} (min port 1024)"
echo "[bore] NOTE: bore assigns a RANDOM public port; read it from the line 'bore local ... listening at ...'"
exec "$BORE" local "$PORT" --to "$SERVER"
