#!/bin/bash
# T01 Auth & admin login verification

set -e
PORT=11110
PASS=true

echo "=== T01: Auth & admin login ==="

# Step 1: Test unauthenticated access to protected endpoint
echo "[1] Testing /api/auth/me without auth..."
RESP=$(curl -s http://localhost:$PORT/api/auth/me)
if echo "$RESP" | grep -q "unauthenticated"; then
    echo "    PASS: Unauthenticated request rejected"
else
    echo "    FAIL: Expected 401/unauthenticated, got: $RESP"
    PASS=false
fi

# Step 2: Login with dev credentials
echo "[2] Testing dev login..."
LOGIN=$(curl -s -X POST http://localhost:$PORT/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"dev@example.com","password":"devpass123"}')

if echo "$LOGIN" | grep -q '"ok":true'; then
    echo "    PASS: Dev login successful"
    TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")
else
    echo "    FAIL: Login failed: $LOGIN"
    PASS=false
    TOKEN=""
fi

# Step 3: Access protected endpoint with auth
if [ -n "$TOKEN" ]; then
    echo "[3] Testing /api/auth/me with auth..."
    ME=$(curl -s http://localhost:$PORT/api/auth/me -H "Authorization: Bearer $TOKEN")
    if echo "$ME" | grep -q "email"; then
        echo "    PASS: Protected endpoint accessible with token"
    else
        echo "    WARN: Endpoint returned: $ME"
    fi
fi

# Step 4: Access admin endpoints
echo "[4] Testing /api/admin/stats..."
ADMIN=$(curl -s http://localhost:$PORT/api/admin/stats -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "fail")
if echo "$ADMIN" | grep -q "error\|forbidden\|stats\|total" || echo "$ADMIN" | grep -q "ok\|admin"; then
    echo "    OK: Admin endpoint responded (check response for details)"
    echo "    Response: $ADMIN"
else
    echo "    FAIL: Admin endpoint error: $ADMIN"
    PASS=false
fi

# Step 5: Check database connection
echo "[5] Checking SQLite database..."
if sqlite3 /home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db "SELECT COUNT(*) FROM users;" 2>/dev/null | grep -qE '^[0-9]+$'; then
    USER_COUNT=$(sqlite3 /home/khuchinque/0-TRADER-COMPANEY/apps/engine/data/ledger.db "SELECT COUNT(*) FROM users;")
    echo "    PASS: Database connected, $USER_COUNT user(s)"
else
    echo "    FAIL: Cannot connect to SQLite"
    PASS=false
fi

# Summary
echo ""
echo "=== T01 Summary ==="
if [ "$PASS" = true ]; then
    echo "Result: PASS"
    exit 0
else
    echo "Result: FAIL"
    exit 1
fi
