#!/bin/bash
# Production Readiness Audit Script
# Usage: bash scripts/production-audit.sh

set -e

PROJECT_DIR="/home/khuchinque/0-TRADER-COMPANEY"
PASS=0
FAIL=0
WARN=0

echo "=========================================="
echo "PRODUCTION READINESS AUDIT"
echo "Date: $(date -u)"
echo "=========================================="
echo ""

# 1. File Permissions Check
echo "[1/10] Checking file permissions..."
ROOT_FILES=$(find $PROJECT_DIR -maxdepth 3 -not -user khuchinque -not -group khuchinque -type f 2>/dev/null | wc -l)
if [ "$ROOT_FILES" -eq 0 ]; then
    echo "  ✅ PASS: No root-owned files"
    ((PASS++))
else
    echo "  ❌ FAIL: Found $ROOT_FILES root-owned files"
    ((FAIL++))
fi

# 2. Smoke Tests
echo "[2/10] Running smoke tests..."
cd $PROJECT_DIR
if bash scripts/smoke.sh 2>&1 | grep -q "ALL SMOKE TESTS PASSED"; then
    echo "  ✅ PASS: All smoke tests passing"
    ((PASS++))
else
    echo "  ❌ FAIL: Smoke tests failing"
    ((FAIL++))
fi

# 3. Service Health
echo "[3/10] Checking service health..."
BACKEND=$(pm2 describe backend 2>/dev/null | grep "status" | grep -q "online" && echo "online" || echo "offline")
TERMINAL=$(pm2 describe terminal 2>/dev/null | grep "status" | grep -q "online" && echo "online" || echo "offline")
ENGINE=$(pm2 describe engine 2>/dev/null | grep "status" | grep -q "online" && echo "online" || echo "offline")

if [ "$BACKEND" = "online" ] && [ "$TERMINAL" = "online" ] && [ "$ENGINE" = "online" ]; then
    echo "  ✅ PASS: All services online"
    ((PASS++))
else
    echo "  ❌ FAIL: Services offline (backend=$BACKEND, terminal=$TERMINAL, engine=$ENGINE)"
    ((FAIL++))
fi

# 4. Git Status
echo "[4/10] Checking git status..."
cd $PROJECT_DIR
if [ -z "$(git status --porcelain)" ]; then
    echo "  ✅ PASS: Git clean"
    ((PASS++))
else
    echo "  ⚠️  WARN: Git has uncommitted changes"
    ((WARN++))
fi

# 5. Telegram Bot Test
echo "[5/10] Testing Telegram bot connectivity..."
TOKEN=$(grep TELEGRAM_BOT_TOKEN ~/.hermes/profiles/herme-khuchinque/.env 2>/dev/null | cut -d= -f2 | head -1)
if [ -n "$TOKEN" ]; then
    BOT_TEST=$(curl -s --connect-timeout 5 "https://api.telegram.org/bot${TOKEN}/getMe" 2>/dev/null)
    if echo "$BOT_TEST" | grep -q '"ok":true'; then
        echo "  ✅ PASS: Telegram bot token valid"
        ((PASS++))
    else
        echo "  ❌ FAIL: Telegram bot token invalid (401 Unauthorized)"
        echo "  FIX: Get new token from @BotFather"
        ((FAIL++))
    fi
else
    echo "  ❌ FAIL: No Telegram token found in .env"
    ((FAIL++))
fi

# 6. Database Check
echo "[6/10] Checking database..."
if [ -f "$PROJECT_DIR/apps/backend/data/ledger.db" ]; then
    echo "  ⚠️  WARN: Using SQLite (not production-ready)"
    echo "  FIX: Migrate to PostgreSQL"
    ((WARN++))
else
    echo "  ❌ FAIL: Database not found"
    ((FAIL++))
fi

# 7. Environment Variables
echo "[7/10] Checking environment variables..."
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "API_KEY")
MISSING_VARS=0
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "$var" $PROJECT_DIR/.env 2>/dev/null; then
        echo "  ⚠️  WARN: $var not set in .env"
        ((MISSING_VARS++))
    fi
done
if [ "$MISSING_VARS" -eq 0 ]; then
    echo "  ✅ PASS: All required env vars present"
    ((PASS++))
else
    echo "  ⚠️  WARN: $MISSING_VARS missing env vars"
    ((WARN++))
fi

# 8. Security Audit
echo "[8/10] Running security checks..."
HARDCODED_SECRETS=$(grep -r "password.*=.*['\"][^'\"]*['\"]" $PROJECT_DIR/apps --include="*.ts" --include="*.tsx" --include="*.py" 2>/dev/null | grep -v node_modules | grep -v ".next" | wc -l)
if [ "$HARDCODED_SECRETS" -eq 0 ]; then
    echo "  ✅ PASS: No hardcoded secrets"
    ((PASS++))
else
    echo "  ❌ FAIL: Found $HARDCODED_SECRETS potential hardcoded secrets"
    ((FAIL++))
fi

# 9. Rate Limiting Check
echo "[9/10] Checking rate limiting..."
RATE_LIMIT=$(grep -r "rateLimit\|rate_limit" $PROJECT_DIR/apps/backend/src --include="*.ts" 2>/dev/null | wc -l)
if [ "$RATE_LIMIT" -gt 0 ]; then
    echo "  ✅ PASS: Rate limiting implemented"
    ((PASS++))
else
    echo "  ⚠️  WARN: No rate limiting found"
    echo "  FIX: Add rate limiting middleware"
    ((WARN++))
fi

# 10. Input Validation
echo "[10/10] Checking input validation..."
VALIDATION=$(grep -r "zod\|joi\|validator" $PROJECT_DIR/apps/backend/src --include="*.ts" 2>/dev/null | wc -l)
if [ "$VALIDATION" -gt 0 ]; then
    echo "  ✅ PASS: Input validation present"
    ((PASS++))
else
    echo "  ⚠️  WARN: No input validation found"
    echo "  FIX: Add schema validation (zod/joi)"
    ((WARN++))
fi

echo ""
echo "=========================================="
echo "AUDIT RESULTS"
echo "=========================================="
echo "✅ PASS: $PASS"
echo "❌ FAIL: $FAIL"
echo "⚠️  WARN: $WARN"
echo ""
if [ "$FAIL" -eq 0 ]; then
    echo "STATUS: READY FOR PRODUCTION"
else
    echo "STATUS: NEEDS FIXES BEFORE PRODUCTION"
fi
echo "=========================================="
