#!/usr/bin/env bash
set -euo pipefail
# T03 verify: Smoke suite is authoritative

echo "=== T03: Smoke suite verification ==="
PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "   PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "   FAIL: $name"
    FAIL=$((FAIL + 1))
  fi
}

BASE="http://127.0.0.1:11110"
TERM="http://127.0.0.1:22220"

echo "1. Backend health..."
check "backend up" "curl -sf $BASE/api/health"

echo "2. Terminal up..."
check "terminal up" "curl -sf $TERM/"

echo "3. Markets list >= 400 pairs..."
PAIRS=$(curl -sf "$BASE/api/markets" 2>/dev/null | grep -o '"symbol"' | wc -l || echo 0)
if [ "$PAIRS" -ge 400 ]; then
  echo "   PASS: $PAIRS pairs found"
  PASS=$((PASS + 1))
else
  echo "   FAIL: Only $PAIRS pairs (expected >= 400)"
  FAIL=$((FAIL + 1))
fi

echo "4. Valid trade page..."
check "trade/BTCIDR" "curl -sf $TERM/trade/BTCIDR"

echo "5. Invalid pair shows not found..."
RESP=$(curl -sf "$TERM/trade/FAKEXYZ" 2>/dev/null || echo "")
if echo "$RESP" | grep -qi "pair not found\|not found"; then
  echo "   PASS: Pair Not Found"
  PASS=$((PASS + 1))
else
  echo "   FAIL: No Pair Not Found"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== T03 Result: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && echo "T03: PASS" || echo "T03: FAIL"
exit $FAIL