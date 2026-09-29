#!/usr/bin/env bash
# ============================================================
# TRADING COMPANEY - cloudflared quick tunnel (NO sudo needed)
# ============================================================
# User placed PLANNING/cloudflared.deb. Instead of `dpkg -i` (needs root),
# this extracts the binary into tools/.cloudflared-extract/ and runs it
# directly. Exposes the local terminal UI on a public trycloudflare.com URL.
#
# Usage:  PORT=3000 bash tools/cloudflared-tunnel.sh
# Output: a https://<random>.trycloudflare.com URL printed by cloudflared.
# NOTE: quick tunnels are ephemeral/unauthenticated — demo only.
# ============================================================
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEB="$PROJECT_ROOT/PLANNING/cloudflared.deb"
PORT="${PORT:-3000}"
EXTRACT="$PROJECT_ROOT/tools/.cloudflared-extract"

if [ ! -f "$DEB" ]; then
  echo "[cloudflared] $DEB not found." >&2
  exit 1
fi

mkdir -p "$EXTRACT"
echo "[cloudflared] extracting $(basename "$DEB") (no sudo)..."
dpkg-deb -x "$DEB" "$EXTRACT"

BIN="$EXTRACT/usr/bin/cloudflared"
if [ ! -x "$BIN" ]; then
  echo "[cloudflared] extraction failed — $BIN missing." >&2
  exit 1
fi

echo "[cloudflared] tunneling http://127.0.0.1:${PORT} -> trycloudflare.com"
echo "[cloudflared] read the public URL from the line 'https://<something>.trycloudflare.com' below:"
exec "$BIN" tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate
