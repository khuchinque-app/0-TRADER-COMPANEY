#!/bin/bash
set -e

echo "=== SMOKE TEST ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

echo "[1/5] Testing /health..."
curl -s http://localhost:11110/health | grep -q ok && echo "  PASS" || exit 1

echo "[2/5] Testing POST /api/auth/login..."
LOGIN_DATA="{\\\"email\\\":\\\"chinque@dev.local\\\",\\\"password\\\":\\\"TestTrader2026!\\\"}"
RESP=$(curl -s -X POST http://localhost:11110/api/auth/login -H "Content-Type: application/json" -d "$LOGIN_DATA")
echo "$RESP" | grep -q ok && echo "  PASS" || { echo "  FAIL"; exit 1; }
TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)[\\\"token\\\"])")

echo "[3/5] Testing GET /api/auth/me..."
curl -s http://localhost:11110/api/auth/me -H "Authorization: Bearer $TOKEN" | grep -q chinque && echo "  PASS" || exit 1

echo "[4/5] Testing GET /api/markets..."
curl -s http://localhost:11110/api/markets | grep -q markets && echo "  PASS" || exit 1

echo "[5/5] Testing terminal proxy..."
curl -s -X POST http://localhost:22220/api/auth/login -H "Content-Type: application/json" -d "$LOGIN_DATA" | grep -q ok && echo "  PASS" || exit 1

echo ""
echo "=== ALL SMOKE TESTS PASSED ==="
