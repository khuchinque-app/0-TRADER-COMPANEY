#!/bin/bash
set -e

echo "=== SMOKE TEST - MARKET → TRADE ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

PASS=0
FAIL=0

test_pass() {
  echo "  PASS: $1"
  PASS=$((PASS + 1))
}

test_fail() {
  echo "  FAIL: $1"
  FAIL=$((FAIL + 1))
}

echo "[1/10] Testing GET /market... "
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:22220/market)
if [ "$HTTP" = "200" ]; then
  test_pass "/market returns 200"
else
  test_fail "/market returned $HTTP"
fi

echo "[2/10] Testing /market lists 477 pairs... "
PAIRS=$(curl -s http://localhost:22220/api/markets/all | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))")
if [ "$PAIRS" = "477" ]; then
  test_pass "/market has 477 pairs"
else
  test_fail "/market has $PAIRS pairs (expected 477)"
fi

echo "[3/10] Testing GET /trade/ETHIDR... "
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:22220/trade/ETHIDR)
if [ "$HTTP" = "200" ]; then
  test_pass "/trade/ETHIDR returns 200"
else
  test_fail "/trade/ETHIDR returned $HTTP"
fi

echo "[4/10] Testing /trade/ETHIDR renders page... "
BODY=$(curl -s http://localhost:22220/trade/ETHIDR)
if echo "$BODY" | grep -q "trade"; then
  test_pass "/trade/ETHIDR renders"
else
  test_fail "/trade/ETHIDR not rendering"
fi

echo "[5/10] Testing GET /trade/BTCUSDT... "
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:22220/trade/BTCUSDT)
if [ "$HTTP" = "200" ]; then
  test_pass "/trade/BTCUSDT returns 200"
else
  test_fail "/trade/BTCUSDT returned $HTTP"
fi

echo "[6/10] Testing GET /trade/FAKEXYZ shows not found... "
BODY=$(curl -s http://localhost:22220/trade/FAKEXYZ)
if echo "$BODY" | grep -q "Pair Not Found"; then
  test_pass "/trade/FAKEXYZ shows not found"
else
  test_fail "/trade/FAKEXYZ missing not found message"
fi

echo "[7/10] Testing /trade/SOLIDR... "
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:22220/trade/SOLIDR)
if [ "$HTTP" = "200" ]; then
  test_pass "/trade/SOLIDR returns 200"
else
  test_fail "/trade/SOLIDR returned $HTTP"
fi

echo "[8/10] Testing FX rate endpoint... "
RESP=$(curl -s http://localhost:11110/api/fx/usdt-idr)
RATE=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get(rate, 0))")
if [ "$RATE" -gt 0 ] 2>/dev/null; then
  test_pass "FX rate: $RATE"
else
  test_fail "FX rate failed: $RESP"
fi

echo "[9/10] Testing IDR display toggle (FX source)... "
if echo "$RESP" | grep -q "indodax"; then
  test_pass "FX source is indodax"
else
  test_fail "FX source incorrect"
fi

echo "[10/10] Testing /market has UI elements... "
BODY=$(curl -s http://localhost:22220/market)
if echo "$BODY" | grep -qi "market\|table"; then
  test_pass "/market has UI"
else
  test_fail "/market missing UI"
fi

echo ""
echo "=== RESULTS: $PASS passed, $FAIL failed ==="

if [ $FAIL -gt 0 ]; then
  exit 1
fi

echo "=== ALL SMOKE TESTS PASSED ==="
