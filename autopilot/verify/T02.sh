#!/bin/bash
# T02 Pair-not-found API verification

set -e
PORT=11110
PASS=0
FAIL=0

ok() { echo "    PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "    FAIL: $1"; FAIL=$((FAIL+1)); }

echo "=== T02: Pair not found verification ==="

# Test 1: Invalid pair should return error or zero values
echo "[1] Testing /api/ticker/INVALIDPAIR999..."
RESP=$(curl -s "http://localhost:$PORT/api/ticker/INVALIDPAIR999")
if echo "$RESP" | grep -qE "pair_not_found|not_found|invalid|last.*0"; then
    ok "Invalid pair handled appropriately"
else
    fail "Unexpected response: $RESP"
fi

# Test 2: Valid pair should return price data
echo "[2] Testing /api/ticker/BTCIDR..."
RESP=$(curl -s "http://localhost:$PORT/api/ticker/BTCIDR")
if echo "$RESP" | grep -qE "last.*[1-9]"; then
    ok "Valid pair returns price data"
else
    fail "Valid pair has no price: $RESP"
fi

echo ""
echo "=== T02 Result: $PASS passed, $FAIL failed ==="
[ $FAIL -eq 0 ] && echo "T02: PASS" || echo "T02: FAIL"
exit $FAIL
