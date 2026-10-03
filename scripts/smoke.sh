#!/bin/bash
set -e

echo "=== SMOKE TEST ==="
TS=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Timestamp: \$TS"
echo ""

echo "[1/5] Testing /health..."
curl -s http://localhost:11110/health | grep -q ok && echo "  PASS" || { echo "  FAIL"; exit 1; }

echo "[2/5] Testing POST /api/auth/login..."
RESP=\$(curl -s -X POST http://localhost:11110/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"chinque@dev.local\",\"password\":\"TestTrader2026!\"}")
echo "\$RESP" | grep -q ok && echo "  PASS" || { echo "  FAIL"; exit 1; }
TOKEN=\$(echo "\$RESP" | sed -n "s/.*token.*\\(eyJ[A-Za-z0-9_-]*\\.eyJ[A-Za-z0-9_-]*\\).[A-Za-z0-9_-]*/\\1/p")
[ -z "\$TOKEN" ] && TOKEN=\$(echo "\$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)[token])")

echo "[3/5] Testing GET /api/auth/me..."
curl -s http://localhost:11110/api/auth/me -H "Authorization: Bearer \$TOKEN" | grep -q chinque && echo "  PASS" || { echo "  FAIL"; exit 1; }

echo "[4/5] Testing GET /api/markets..."
curl -s http://localhost:11110/api/markets | grep -q markets && echo "  PASS" || { echo "  FAIL"; exit 1; }

echo "[5/5] Testing terminal proxy..."
curl -s -X POST http://localhost:22220/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"chinque@dev.local\",\"password\":\"TestTrader2026!\"}" | grep -q ok && echo "  PASS" || { echo "  FAIL"; exit 1; }

echo ""
echo "=== ALL SMOKE TESTS PASSED ==="
