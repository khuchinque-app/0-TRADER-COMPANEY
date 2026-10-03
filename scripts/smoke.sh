#!/bin/bash
set -e

echo "=== SMOKE TEST ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Test health endpoint
echo "[1/5] Testing /health..."
curl -s http://localhost:11110/health | grep -q "ok" && echo "  PASS" || { echo "  FAIL"; exit 1; }

# Test login endpoint
echo "[2/5] Testing POST /api/auth/login..."
RESP=$(curl -s -X POST http://localhost:11110/api/auth/login -H "Content-Type: application/json" -d password:TestTrader2026!)
echo "$RESP" | grep -q ok:true && echo "  PASS" || { echo "  FAIL: $RESP"; exit 1; }
TOKEN=$(echo "$RESP" | grep -o token:[^]*' | cut -d' -f4)

# Test me endpoint
echo "[3/5] Testing GET /api/auth/me..."
curl -s http://localhost:11110/api/auth/me -H "Authorization: Bearer $TOKEN" | grep -q email:chinque@dev.local && echo "  PASS" || { echo "  FAIL"; exit 1; }

# Test markets endpoint
echo "[4/5] Testing GET /api/markets..."
curl -s http://localhost:11110/api/markets | grep -q markets && echo "  PASS" || { echo "  FAIL"; exit 1; }

# Test terminal proxy
echo "[5/5] Testing terminal proxy..."
curl -s -X POST http://localhost:22220/api/auth/login -H "Content-Type: application/json" -d password:TestTrader2026! | grep -q ok:true && echo "  PASS" || { echo "  FAIL"; exit 1; }

echo ""
echo "=== ALL SMOKE TESTS PASSED ==="
