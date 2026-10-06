#!/usr/bin/env bash
set -euo pipefail
# T01 verify: Auth works - seeded dev accounts + guest demo login
# Backend at http://127.0.0.1:11110

BASE="http://127.0.0.1:11110"
PASS=0

echo "=== T01: Auth verification ==="

# Check backend is up
echo "1. Backend health check..."
curl -sf "$BASE/api/health" > /dev/null || { echo "FAIL: backend not responding"; exit 1; }
echo "   PASS: backend up"

# Try login with seeded creds (if any exist)
echo "2. Testing login with seeded dev credentials..."
LOGIN_RESP=$(curl -sf -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"devpass123"}' 2>/dev/null || echo '{}')

if echo "$LOGIN_RESP" | grep -q '"token"'; then
  echo "   PASS: seeded login works"
  PASS=$((PASS + 1))
else
  echo "   WARN: seeded login failed, checking if seed endpoint exists..."
  # Try to seed first
  SEED_RESP=$(curl -sf -X POST "$BASE/api/auth/seed" 2>/dev/null || echo '{}')
  if echo "$SEED_RESP" | grep -q '"seeded\|ok"'; then
    echo "   Seeded OK, retrying login..."
    LOGIN_RESP=$(curl -sf -X POST "$BASE/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"dev@example.com","password":"devpass123"}' 2>/dev/null || echo '{}')
    if echo "$LOGIN_RESP" | grep -q '"token"'; then
      echo "   PASS: seeded login works after seed"
      PASS=$((PASS + 1))
    fi
  fi
fi

# Test wrong password returns 401
echo "3. Testing wrong password returns 401..."
WRONG=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"wrongpassword"}')
if [ "$WRONG" = "401" ]; then
  echo "   PASS: wrong password returns 401"
  PASS=$((PASS + 1))
else
  echo "   FAIL: wrong password returned $WRONG (expected 401)"
fi

# Test guest creation
echo "4. Testing guest account creation..."
GUEST_RESP=$(curl -sf -X POST "$BASE/api/auth/guest" 2>/dev/null || echo '{}')
if echo "$GUEST_RESP" | grep -q '"token\|wallet\|balance"'; then
  echo "   PASS: guest created"
  PASS=$((PASS + 1))
  # Check balance is 10000 USDT
  BALANCE=$(echo "$GUEST_RESP" | grep -o '"balance":[0-9]*' | head -1 | grep -o '[0-9]*$')
  if [ "$BALANCE" = "10000" ]; then
    echo "   PASS: guest balance is 10000 USDT"
    PASS=$((PASS + 1))
  else
    echo "   WARN: guest balance is $BALANCE (expected 10000)"
  fi
else
  echo "   FAIL: guest creation failed"
fi

echo "=== T01 Result: $PASS/4 checks passed ==="
[ "$PASS" -ge 3 ] && echo "T01: PASS" || echo "T01: FAIL"
exit $( [ "$PASS" -ge 3 ] && echo 0 || echo 1 )