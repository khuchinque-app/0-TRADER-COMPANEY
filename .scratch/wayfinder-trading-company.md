# Wayfinder Map: Trading Company — Production Readiness
**Destination:** Production-ready paper trading platform with payment gateway, PostgreSQL, price redundancy, security hardening

**Created:** 2026-10-06  
**Updated:** 2026-10-06 (after grill interview)

---

## Destination

Production-ready trading simulation platform:
- Payment gateway integrated (Duitku or Midtrans)
- PostgreSQL database (migrated from SQLite)
- Multiple price feed sources (Indodax + backup)
- Security hardening (rate limiting, input validation)
- Monitoring & logging
- Telegram bot operational

---

## Current State (as of 2026-10-06 22:45 UTC)

### ✅ Working
- Market page: 477 pairs, search/filter
- Trade page: Paper trading, IDR toggle, Strata theme
- Backend API: 10/10 endpoints working
- Smoke tests: 10/10 PASS
- Services: backend (11110), terminal (22220), engine (3001)
- File permissions: Fixed (khuchinque:khuchinque)
- Git: Clean, branch feat/market-trade

### ⚠️ Issues Found
1. Telegram bot token INVALID (401 Unauthorized)
2. Payment gateway: NOT implemented
3. Database: SQLite (needs PostgreSQL)
4. Price feeds: Single source (Indodax only)
5. Security: No rate limiting, no input validation
6. Monitoring: No error tracking, no performance monitoring

---

## User Decisions (from Grill Interview)

### Q1: Project Goal
**Answer:** Production-ready (payment gateway, database, prices, everything)

### Q2: Priority Order
**Answer:** D > B > A > C
1. Fix bugs from audit
2. Merge to master
3. Fix Telegram bot token
4. Build new features

### Q3: Local Agent Role
**Answer:** Review code + add tasks by imagination

---

## Fog (Not Yet Specified)

1. Which payment gateway? (Duitku or Midtrans)
2. PostgreSQL setup status? (Ready or need to set up)
3. Exact security requirements?
4. Monitoring tools preference? (Sentry, Prometheus, etc.)
5. Deployment timeline?

---

## Out of Scope (for now)
- Mikel1 juice business app
- Billbot/Telegram bot issues (unless affecting Trading Company)
- Other projects in home directory

---

## Tickets

### T01: Fix Telegram Bot Token
**Type:** task  
**Status:** PENDING  
**Priority:** HIGH

**Question:** Get new token from @BotFather and update .env

**Context:** Current token 887107...9EoO returns 401 Unauthorized

---

### T02: Payment Gateway Integration
**Type:** task  
**Status:** PENDING  
**Blocking:** T01 (needs bot for notifications?)

**Question:** Which gateway? Duitku or Midtrans?

**Context:** Duitku researched in PLANNING/PAYMENT-INTEGRATION.md

---

### T03: Database Migration SQLite → PostgreSQL
**Type:** task  
**Status:** PENDING

**Question:** Is PostgreSQL ready or need to set up?

---

### T04: Price Feed Redundancy
**Type:** task  
**Status:** PENDING

**Question:** Add secondary source (Binance/CoinGecko)?

---

### T05: Security Hardening
**Type:** task  
**Status:** PENDING

**Sub-tasks:**
- Rate limiting
- Input validation
- JWT refresh tokens

---

### T06: Code Review
**Type:** task  
**Status:** PENDING

**Action:** Review feat/market-trade since master

---

### T07: Merge to Master
**Type:** task  
**Status:** PENDING  
**Blocking:** T01, T02, T03, T04, T05, T06

**Action:** Merge feat/market-trade → master when all above complete

---

## Decisions So Far

*(Empty - waiting for user confirmation on payment gateway and database)*

---

## Handoff Notes

**For @Herme_ChinQue_bot (Local Agent):**
- This map tracks production readiness
- Review code: feat/market-trade vs master
- Help with: Payment spec, database migration, security review
- Coordinate via git pushes

**Next Action:** Waiting for LORD to confirm:
1. Payment gateway choice (Duitku/Midtrans)
2. PostgreSQL status (ready/setup needed)
3. Proceed with Phase 1 (diagnosing-bugs)

---
