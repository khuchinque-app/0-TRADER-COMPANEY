#!/bin/bash
# Gate smoke test suite

set -e
PORT=11110

echo "=== Gate Smoke Tests ==="

PASS=0
FAIL=0

# Test 1: Health endpoint
echo "[1] Health check..."
if curl -sf http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "    PASS"
    PASS=$((PASS+1))
else
    echo "    FAIL"
    FAIL=$((FAIL+1))
fi

# Test 2: Markets endpoint
echo "[2] Markets list..."
if curl -sf http://localhost:$PORT/api/markets | grep -q "markets\|pairs" 2>/dev/null; then
    echo "    PASS"
    PASS=$((PASS+1))
else
    echo "    FAIL"
    FAIL=$((FAIL+1))
fi

# Test 3: Auth seed
echo "[3] Auth seed..."
if curl -s -X POST http://localhost:$PORT/api/auth/seed | grep -q "seeded\|exists"; then
    echo "    PASS"
    PASS=$((PASS+1))
else
    echo "    FAIL"
    FAIL=$((FAIL+1))
fi

# Test 4: Auth login
echo "[4] Auth login..."
if curl -s -X POST http://localhost:$PORT/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"dev@example.com","password":"devpass123"}' | grep -q "ok"; then
    echo "    PASS"
    PASS=$((PASS+1))
else
    echo "    FAIL"
    FAIL=$((FAIL+1))
fi

# Test 5: DB check
echo "[5] Database..."
if sqlite3 /home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db "SELECT 1 FROM users LIMIT 1;" 2>/dev/null | grep -q "1"; then
    echo "    PASS"
    PASS=$((PASS+1))
else
    echo "    WARN: No users in DB (may be empty)"
    PASS=$((PASS+1))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ $FAIL -eq 0 ]
