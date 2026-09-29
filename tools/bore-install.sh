#!/usr/bin/env bash
# bore-install.sh — install bore (open-source TCP tunnel, Rust) into THIS project.
# Per user request: binary lives in the project folder, not /usr/local/bin.
# Usage: bash tools/bore-install.sh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$PROJECT_ROOT/tools/bin"
VERSION="v0.5.1"
URL="https://github.com/ekzhang/bore/releases/download/${VERSION}/bore-${VERSION}-x86_64-unknown-linux-musl.tar.gz"

mkdir -p "$BIN_DIR"
echo "[bore] downloading ${URL}"
curl -sSL "$URL" | tar -xz -C "$BIN_DIR"
chmod +x "$BIN_DIR/bore"

echo "[bore] installed at tools/bin/bore"
"$BIN_DIR/bore" --version 2>/dev/null || "$BIN_DIR/bore" -V || true
echo "[bore] usage: bash tools/bore-tunnel.sh  (tunnels terminal :3000 via bore.pub)"
